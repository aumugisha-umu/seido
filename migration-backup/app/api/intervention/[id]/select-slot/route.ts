import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { userService, interventionService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log("📅 PUT select-slot API called for intervention:", id)

  try {
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

    // Get user data from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    const interventionId = id

    // Parse request body
    const body = await request.json()
    console.log("📥 [SELECT-SLOT] Request body received:", body)
    const { selectedSlot, comment } = body

    console.log("🔍 [SELECT-SLOT] Validating selectedSlot:", selectedSlot)
    if (!selectedSlot || !selectedSlot.date || !selectedSlot.startTime || !selectedSlot.endTime) {
      console.error("❌ [SELECT-SLOT] Invalid selectedSlot:", { selectedSlot, hasDate: !!selectedSlot?.date, hasStartTime: !!selectedSlot?.startTime, hasEndTime: !!selectedSlot?.endTime })
      return NextResponse.json({
        success: false,
        error: 'Créneau sélectionné invalide (date, startTime, endTime requis)'
      }, { status: 400 })
    }

    // Verify intervention exists and user has access
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        title,
        status,
        tenant_id,
        team_id,
        lot:lot_id(
          id,
          lot_contacts(user_id, is_primary)
        ),
        intervention_contacts(
          user_id,
          role,
          user:user_id(id, name, email, role)
        )
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if user has permission to select slot (tenant, assigned participants, or gestionnaire)
    const isUserTenant = intervention.lot?.lot_contacts?.some(
      (_contact: unknown) => contact.user_id === user.id
    )
    console.log("👤 [SELECT-SLOT] User access check:", { userId: user.id, userRole: user.role, isUserTenant })

    const hasAccess = (
      isUserTenant ||
      intervention.intervention_contacts.some(ic => ic.user_id === user.id) ||
      user.role === 'gestionnaire'
    )

    if (!hasAccess) {
      console.error("🚫 [SELECT-SLOT] Access denied:", { userId: user.id, userRole: user.role, isUserTenant, interventionContacts: intervention.intervention_contacts.map(ic => ic.user_id) })
      return NextResponse.json({
        success: false,
        error: 'Accès non autorisé à cette intervention'
      }, { status: 403 })
    }
    console.log("✅ [SELECT-SLOT] User has access to intervention")

    // Check if intervention is in correct status for slot selection
    console.log("📊 [SELECT-SLOT] Current intervention status:", intervention.status)
    if (!['planification', 'approuvee', 'planifiee'].includes(intervention.status)) {
      console.error("❌ [SELECT-SLOT] Invalid status for slot selection:", { currentStatus: intervention.status, allowedStatuses: ['planification', 'approuvee', 'planifiee'] })
      return NextResponse.json({
        success: false,
        error: `Impossible de planifier: statut actuel "${intervention.status}"`
      }, { status: 400 })
    }
    console.log("✅ [SELECT-SLOT] Intervention status is valid for slot selection")

    // Log if this is a re-scheduling
    if (intervention.status === 'planifiee') {
      console.log("🔄 [SELECT-SLOT] Re-scheduling an already planned intervention")
    }

    // Validate the selected slot
    const selectedDate = new Date(selectedSlot.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    console.log("📅 [SELECT-SLOT] Date validation:", { selectedDate: selectedSlot.date, parsedDate: selectedDate, today })

    if (selectedDate < today) {
      console.error("❌ [SELECT-SLOT] Cannot schedule in the past:", { selectedDate, today })
      return NextResponse.json({
        success: false,
        error: 'Impossible de planifier dans le passé'
      }, { status: 400 })
    }
    console.log("✅ [SELECT-SLOT] Date is valid (not in the past)")

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    console.log("🕐 [SELECT-SLOT] Time format validation:", { startTime: selectedSlot.startTime, endTime: selectedSlot.endTime })
    if (!timeRegex.test(selectedSlot.startTime) || !timeRegex.test(selectedSlot.endTime)) {
      console.error("❌ [SELECT-SLOT] Invalid time format:", { startTime: selectedSlot.startTime, endTime: selectedSlot.endTime, regex: timeRegex.toString() })
      return NextResponse.json({
        success: false,
        error: 'Format d\'heure invalide (HH:MM attendu)'
      }, { status: 400 })
    }
    console.log("✅ [SELECT-SLOT] Time format is valid")

    // Check if end time is after start time
    const [startHour, startMin] = selectedSlot.startTime.split(':').map(Number)
    const [endHour, endMin] = selectedSlot.endTime.split(':').map(Number)

    if (startHour > endHour || (startHour === endHour && startMin >= endMin)) {
      return NextResponse.json({
        success: false,
        error: 'L\'heure de fin doit être après l\'heure de début'
      }, { status: 400 })
    }

    // Verify that the selected slot matches available slots from participants
    const { data: availabilities, error: availError } = await supabase
      .from('user_availabilities')
      .select(`
        *,
        user:user_id(id, name, role)
      `)
      .eq('intervention_id', interventionId)
      .eq('date', selectedSlot.date)

    if (availError) {
      console.error("❌ Error fetching availabilities:", availError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la vérification des disponibilités'
      }, { status: 500 })
    }

    // Check if the selected slot overlaps with participant availabilities
    const selectedStartMinutes = startHour * 60 + startMin
    const selectedEndMinutes = endHour * 60 + endMin

    const conflictingUsers = []
    const availableUsers = []

    for (const avail of (availabilities || [])) {
      const availStartMinutes = parseInt(avail.start_time.split(':')[0]) * 60 + parseInt(avail.start_time.split(':')[1])
      const availEndMinutes = parseInt(avail.end_time.split(':')[0]) * 60 + parseInt(avail.end_time.split(':')[1])

      // Check if there's an overlap
      if (selectedStartMinutes < availEndMinutes && selectedEndMinutes > availStartMinutes) {
        availableUsers.push(avail.user)
      } else {
        conflictingUsers.push(avail.user)
      }
    }

    // Log the verification result
    console.log(`📊 Slot verification: ${availableUsers.length} available, ${conflictingUsers.length} conflicts`)

    // Create the scheduled date-time
    const scheduledDateTime = `${selectedSlot.date}T${selectedSlot.startTime}:00.000Z`

    // Update the intervention with the selected slot
    const updateData: unknown = {
      status: 'planifiee' as Database['public']['Enums']['intervention_status'],
      scheduled_date: scheduledDateTime,
      updated_at: new Date().toISOString()
    }

    // Add comment if provided
    if (comment) {
      const existingComment = intervention.manager_comment || ''
      const newComment = `Planification: ${comment} | Créneau sélectionné: ${selectedSlot.date} ${selectedSlot.startTime}-${selectedSlot.endTime}`
      updateData.manager_comment = existingComment + (existingComment ? ' | ' : '') + newComment
    }

    // Update intervention
    console.log("💾 [SELECT-SLOT] Updating intervention with data:", updateData)
    const updatedIntervention = await interventionService.update(interventionId, updateData)
    console.log("💾 [SELECT-SLOT] Intervention updated successfully:", { id: updatedIntervention.id, status: updatedIntervention.status, scheduled_date: updatedIntervention.scheduled_date })

    console.log(`✅ [SELECT-SLOT] Intervention ${interventionId} scheduled for ${scheduledDateTime}`)

    // Clear any existing time slots and matches for this intervention
    await supabase.from('intervention_time_slots').delete().eq('intervention_id', interventionId)
    await supabase.from('availability_matches').delete().eq('intervention_id', interventionId)

    // Create notifications for all participants
    const notificationPromises = []

    // Find tenant ID from lot_contacts for notifications
    const tenantContact = intervention.lot?.lot_contacts?.find((_contact: unknown) => contact.is_primary)
    const tenantId = tenantContact?.user_id || intervention.tenant_id // fallback to old structure

    // Notify tenant if they're not the one who selected the slot
    if (tenantId && tenantId !== user.id) {
      notificationPromises.push(
        notificationService.createNotification({
          userId: _tenantId,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          priority: 'high',
          title: 'Intervention planifiée',
          message: `Votre intervention "${intervention.title}" a été planifiée pour le ${new Date(selectedSlot.date).toLocaleDateString('fr-FR')} de ${selectedSlot.startTime} à ${selectedSlot.endTime}.`,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            scheduledDate: scheduledDateTime,
            scheduledBy: user.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
      )
    }

    // Notify assigned contacts (prestataires/gestionnaires) if they're not the one who selected
    for (const contact of intervention.intervention_contacts) {
      if (contact.user_id !== user.id) {
        notificationPromises.push(
          notificationService.createNotification({
            userId: contact.user_id,
            teamId: intervention.team_id!,
            createdBy: user.id,
            type: 'intervention',
            priority: 'high',
            title: 'Intervention planifiée',
            message: `L'intervention "${intervention.title}" a été planifiée pour le ${new Date(selectedSlot.date).toLocaleDateString('fr-FR')} de ${selectedSlot.startTime} à ${selectedSlot.endTime}.`,
            metadata: {
              interventionId: intervention.id,
              interventionTitle: intervention.title,
              scheduledDate: scheduledDateTime,
              scheduledBy: user.name,
              userRole: contact.user.role
            },
            relatedEntityType: 'intervention',
            relatedEntityId: intervention.id
          })
        )
      }
    }

    // Send all notifications
    try {
      await Promise.all(notificationPromises)
      console.log(`✅ Sent ${notificationPromises.length} notifications for slot selection`)
    } catch (notificationError) {
      console.warn("⚠️ Some notifications failed to send:", notificationError)
      // Don't fail the API call for notification errors
    }

    return NextResponse.json({
      success: true,
      message: 'Créneau sélectionné et intervention planifiée',
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        scheduled_date: updatedIntervention.scheduled_date,
        title: updatedIntervention.title
      },
      selectedSlot: {
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime
      },
      verification: {
        availableUsers: availableUsers.map(u => ({ id: u.id, name: u.name, role: u.role })),
        conflictingUsers: conflictingUsers.map(u => ({ id: u.id, name: u.name, role: u.role }))
      }
    })

  } catch (error) {
    console.error("💥 [SELECT-SLOT] Unexpected error in select-slot API:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace available')
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la sélection du créneau',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}