import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'

/**
 * API Route: POST /api/intervention/[id]/tenant-validation-simple
 *
 * Permet au locataire de valider ou contester les travaux terminés.
 * Pattern identique à simple-work-completion (prestataire) :
 * - Crée un intervention_report avec report_type='tenant_report'
 * - Met à jour le statut vers 'cloturee_par_locataire'
 * - Utilise service role client pour bypass RLS
 * - Envoie des notifications aux gestionnaires et prestataire
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interventionId } = await params

    // ✅ AUTH: Vérifier que l'utilisateur est authentifié
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Vérifier que l'utilisateur est un locataire
    if (!user || user.role !== 'locataire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les locataires peuvent valider ou contester les travaux'
      }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { validationType, comments } = body

    // Validation des données
    if (!validationType || !['approve', 'contest'].includes(validationType)) {
      return NextResponse.json({
        success: false,
        error: 'Type de validation invalide. Valeurs acceptées: approve, contest'
      }, { status: 400 })
    }

    // Commentaire obligatoire pour contestation
    if (validationType === 'contest' && !comments?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Le commentaire est obligatoire pour signaler un problème'
      }, { status: 400 })
    }

    // Récupérer l'intervention
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Vérifier que l'intervention est au bon statut
    if (intervention.status !== 'cloturee_par_prestataire') {
      return NextResponse.json({
        success: false,
        error: `La validation n'est possible que pour les interventions clôturées par le prestataire (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Vérifier que l'utilisateur est assigné comme locataire à cette intervention
    const { data: assignment, error: assignmentError } = await supabase
      .from('intervention_assignments')
      .select('*')
      .eq('intervention_id', interventionId)
      .eq('user_id', user.id)
      .eq('role', 'locataire')
      .maybeSingle()

    if (assignmentError || !assignment) {
      logger.warn({ userId: user.id, interventionId, error: assignmentError }, '⚠️ Locataire not assigned to intervention')
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas assigné comme locataire à cette intervention'
      }, { status: 403 })
    }

    const isContested = validationType === 'contest'
    logger.info({
      interventionId,
      tenantName: user.name,
      validationType,
      isContested
    }, `📝 Processing tenant ${isContested ? 'contestation' : 'validation'} for intervention`)

    // Préparer les données du rapport
    const reportData = {
      intervention_id: interventionId,
      team_id: intervention.team_id,
      report_type: 'tenant_report',
      title: isContested
        ? 'Contestation des travaux par le locataire'
        : 'Validation des travaux par le locataire',
      content: comments?.trim() || 'Travaux validés sans commentaire',
      metadata: {
        validation_type: validationType,
        is_contested: isContested,
        submitted_at: new Date().toISOString(),
        tenant_name: user.name
      },
      is_internal: false, // Visible par tous les acteurs
      created_by: user.id
    }

    // Utiliser le service role client pour bypass RLS
    // Sécurisé car les permissions ont déjà été validées ci-dessus
    const serviceRoleClient = createServiceRoleSupabaseClient()

    // Insérer le rapport
    const { data: report, error: insertError } = await serviceRoleClient
      .from('intervention_reports')
      .insert(reportData)
      .select()
      .single()

    if (insertError) {
      logger.error({ error: insertError }, '❌ Error creating tenant validation report')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la sauvegarde du rapport'
      }, { status: 500 })
    }

    // Mettre à jour le statut de l'intervention et is_contested
    const { error: updateError } = await serviceRoleClient
      .from('interventions')
      .update({
        status: 'cloturee_par_locataire',
        is_contested: isContested,
        updated_at: new Date().toISOString()
      })
      .eq('id', interventionId)

    if (updateError) {
      logger.error({ error: updateError }, '❌ Error updating intervention status')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour du statut'
      }, { status: 500 })
    }

    logger.info({
      interventionId,
      isContested,
      reportId: report.id
    }, `✅ Tenant ${isContested ? 'contestation' : 'validation'} submitted successfully`)

    // Envoyer les notifications
    try {
      const notificationRepository = new NotificationRepository(serviceRoleClient)
      const notificationService = new NotificationService(notificationRepository)

      // Récupérer les gestionnaires assignés
      const { data: managerAssignments } = await serviceRoleClient
        .from('intervention_assignments')
        .select('user:users!user_id(id, name, email, role), is_primary')
        .eq('intervention_id', interventionId)
        .eq('role', 'gestionnaire')

      // Notification aux gestionnaires
      const managerNotificationPromises = managerAssignments?.map(assignment =>
        notificationService.createNotification({
          userId: assignment.user.id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          title: isContested
            ? '⚠️ Problème signalé par le locataire'
            : 'Travaux validés par le locataire',
          message: isContested
            ? `${user.name} a signalé un problème sur "${intervention.title}": ${comments}`
            : `${user.name} a validé les travaux pour "${intervention.title}"`,
          isPersonal: assignment.is_primary ?? false,
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            tenantName: user.name,
            validationType,
            isContested,
            actionRequired: isContested ? 'review_contestation' : undefined
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        })
      ) || []

      // Récupérer le prestataire assigné
      const { data: providerAssignments } = await serviceRoleClient
        .from('intervention_assignments')
        .select('user:users!user_id(id, name, email, role)')
        .eq('intervention_id', interventionId)
        .eq('role', 'prestataire')

      // Notification au prestataire
      const providerNotificationPromises = providerAssignments?.map(assignment =>
        notificationService.createNotification({
          userId: assignment.user.id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          title: isContested
            ? '⚠️ Travaux contestés par le locataire'
            : 'Travaux validés par le locataire',
          message: isContested
            ? `Le locataire a signalé un problème sur "${intervention.title}": ${comments}`
            : `Vos travaux ont été validés par le locataire pour "${intervention.title}"`,
          isPersonal: true,
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            tenantName: user.name,
            validationType,
            isContested
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        })
      ) || []

      await Promise.all([...managerNotificationPromises, ...providerNotificationPromises])
      logger.info({ isContested }, '📧 Tenant validation notifications sent')
    } catch (notifError) {
      logger.warn({ notifError }, '⚠️ Could not send tenant validation notifications')
      // Ne pas faire échouer la requête si les notifications échouent
    }

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        intervention_id: report.intervention_id,
        created_at: report.created_at
      },
      is_contested: isContested,
      message: isContested
        ? 'Votre signalement a été enregistré'
        : 'Les travaux ont été validés avec succès'
    })

  } catch (error) {
    logger.error({ error }, '❌ Error in tenant validation simple API')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
