import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { userService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'
import { logger, logError } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const interventionId = resolvedParams.id

    // Initialize Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      }
    )

    // Get current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({
        success: false,
        error: 'Non autorisé'
      }, { status: 401 })
    }

    // Get user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const {
      validationType,
      satisfaction,
      workApproval,
      comments,
      issues,
      recommendProvider,
      additionalComments
    } = body

    // Validation
    if (!validationType || !['approve', 'contest'].includes(validationType)) {
      return NextResponse.json({
        success: false,
        error: 'Type de validation invalide'
      }, { status: 400 })
    }

    if (!comments?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Les commentaires sont requis'
      }, { status: 400 })
    }

    if (validationType === 'approve') {
      const approvalValues = Object.values(workApproval || {})
      if (!approvalValues.every(val => val === true)) {
        return NextResponse.json({
          success: false,
          error: 'Tous les points de contrôle doivent être validés pour approuver'
        }, { status: 400 })
      }
    } else if (validationType === 'contest') {
      if (!issues?.description?.trim()) {
        return NextResponse.json({
          success: false,
          error: 'La description du problème est requise'
        }, { status: 400 })
      }
    }

    // Get intervention
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

    // Check if intervention is in correct status
    if (intervention.status !== 'cloturee_par_prestataire') {
      return NextResponse.json({
        success: false,
        error: `La validation ne peut être faite que pour les interventions terminées par le prestataire (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user is the tenant of this intervention
    if (intervention.tenant_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Seul le locataire concerné peut valider cette intervention'
      }, { status: 403 })
    }

    console.log(`📝 Processing tenant validation (${validationType}) for intervention:`, interventionId)

    // TODO: Handle issue photos upload to Supabase Storage
    const processedIssuePhotos = issues?.photos || []

    // Create tenant validation record
    const validationData = {
      intervention_id: interventionId,
      tenant_id: user.id,
      validation_type: validationType,
      satisfaction: JSON.stringify(satisfaction || {}),
      work_approval: JSON.stringify(workApproval || {}),
      comments: comments.trim(),
      issues: issues ? JSON.stringify({
        ...issues,
        photos: processedIssuePhotos
      }) : null,
      recommend_provider: recommendProvider || false,
      additional_comments: additionalComments?.trim() || null,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert validation record
    const { data: validation, error: insertError } = await supabase
      .from('intervention_tenant_validations')
      .insert(validationData)
      .select()
      .single()

    if (insertError) {
      console.error("❌ Error creating tenant validation record:", insertError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la sauvegarde de la validation'
      }, { status: 500 })
    }

    // Update intervention status
    const newStatus = validationType === 'approve' ? 'cloturee_par_locataire' : 'contestee'
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', interventionId)

    if (updateError) {
      console.error("❌ Error updating intervention status:", updateError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour du statut'
      }, { status: 500 })
    }

    console.log(`✅ Tenant validation (${validationType}) submitted successfully`)

    // Send notifications
    try {
      // Notify gestionnaires and provider
      const { data: contacts } = await supabase
        .from('intervention_contacts')
        .select(`
          user:user_id(id, name, email, role)
        `)
        .eq('intervention_id', interventionId)
        .in('role', ['gestionnaire', 'prestataire'])

      const notificationPromises = contacts?.map(contact => {
        const isProvider = contact.user.role === 'prestataire'
        const title = validationType === 'approve'
          ? (isProvider ? 'Travaux validés par le client' : 'Intervention validée par le locataire')
          : (isProvider ? 'Travaux contestés par le client' : 'Problème signalé par le locataire')

        const message = validationType === 'approve'
          ? `${user.name} a validé les travaux pour "${intervention.title}"`
          : `${user.name} a signalé un problème avec les travaux pour "${intervention.title}"`

        return notificationService.createNotification({
          userId: contact.user.id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          priority: validationType === 'contest' ? 'high' : 'normal',
          title,
          message,
          isPersonal: true,
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            tenantName: user.name,
            validationType,
            ...(validationType === 'contest' && { actionRequired: 'resolve_contest' })
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        })
      }) || []

      await Promise.all(notificationPromises)
      console.log(`📧 Tenant validation notifications sent for ${validationType}`)
    } catch (notifError) {
      console.warn("⚠️ Could not send tenant validation notifications:", notifError)
    }

    return NextResponse.json({
      success: true,
      validation: {
        id: validation.id,
        intervention_id: validation.intervention_id,
        validation_type: validation.validation_type,
        submitted_at: validation.submitted_at
      },
      message: validationType === 'approve'
        ? 'Travaux validés avec succès'
        : 'Problème signalé avec succès'
    })

  } catch (error) {
    console.error("❌ Error in tenant validation API:", error)
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}