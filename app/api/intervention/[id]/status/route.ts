import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'

/**
 * PATCH /api/intervention/[id]/status
 * Update intervention status (gestionnaire only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id: interventionId } = resolvedParams

    // Auth check
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is gestionnaire
    if (user.role !== 'gestionnaire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires peuvent modifier le statut d\'une intervention'
      }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { status: newStatus } = body

    if (!newStatus) {
      return NextResponse.json({
        success: false,
        error: 'Le statut est requis'
      }, { status: 400 })
    }

    // Validate status value
    const validStatuses = [
      'demande',
      'rejetee',
      'approuvee',
      'demande_de_devis',
      'planification',
      'planifiee',
      'en_cours',
      'cloturee_par_prestataire',
      'cloturee_par_locataire',
      'cloturee_par_gestionnaire',
      'annulee'
    ]

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({
        success: false,
        error: `Statut invalide. Statuts autorisés: ${validStatuses.join(', ')}`
      }, { status: 400 })
    }

    logger.info({ interventionId, newStatus, userId: user.id }, "📋 Updating intervention status")

    // Get current intervention
    const { data: intervention, error: getError } = await supabase
      .from('interventions')
      .select('id, status')
      .eq('id', interventionId)
      .single()

    if (getError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Validate status transition (basic rules)
    const currentStatus = intervention.status
    const allowedTransitions: Record<string, string[]> = {
      'demande': ['rejetee', 'approuvee', 'annulee'],
      'approuvee': ['demande_de_devis', 'planification', 'annulee'],
      'demande_de_devis': ['planification', 'annulee'],
      'planification': ['planifiee', 'demande_de_devis', 'annulee'],
      'planifiee': ['en_cours', 'annulee'],
      'en_cours': ['cloturee_par_prestataire', 'annulee']
    }

    const allowed = allowedTransitions[currentStatus]
    if (allowed && !allowed.includes(newStatus)) {
      return NextResponse.json({
        success: false,
        error: `Transition non autorisée: ${currentStatus} → ${newStatus}`
      }, { status: 400 })
    }

    // Update intervention status
    const { error: updateError } = await supabase
      .from('interventions')
      .update({ status: newStatus })
      .eq('id', interventionId)

    if (updateError) {
      logger.error({ error: updateError }, '❌ Error updating intervention status')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour du statut'
      }, { status: 500 })
    }

    logger.info({ interventionId, oldStatus: currentStatus, newStatus }, "✅ Intervention status updated successfully")

    return NextResponse.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      oldStatus: currentStatus,
      newStatus
    })

  } catch (error) {
    logger.error({ error }, '❌ Error in update intervention status API')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
