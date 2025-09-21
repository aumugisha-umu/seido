import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { userService, interventionService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("📅 PUT select-slot API called for intervention:", params.id)

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

    const interventionId = params.id

    // Parse request body
    const body = await request.json()
    const { selectedSlot, comment } = body

    if (!selectedSlot || !selectedSlot.date || !selectedSlot.startTime || !selectedSlot.endTime) {
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

    // Check if user has permission to select slot (gestionnaire or assigned participants)
    const hasAccess = (
      intervention.tenant_id === user.id ||
      intervention.intervention_contacts.some(ic => ic.user_id === user.id) ||
      user.role === 'gestionnaire'
    )

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: 'Accès non autorisé à cette intervention'
      }, { status: 403 })
    }

    // Check if intervention is in correct status for slot selection
    if (!['planification', 'approuvee'].includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `Impossible de planifier: statut actuel "${intervention.status}"`
      }, { status: 400 })
    }

    // Validate the selected slot
    const selectedDate = new Date(selectedSlot.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      return NextResponse.json({
        success: false,
        error: 'Impossible de planifier dans le passé'
      }, { status: 400 })
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(selectedSlot.startTime) || !timeRegex.test(selectedSlot.endTime)) {
      return NextResponse.json({
        success: false,
        error: 'Format d\'heure invalide (HH:MM attendu)'
      }, { status: 400 })
    }

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
    const updateData: any = {
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
    const updatedIntervention = await interventionService.update(interventionId, updateData)

    console.log(`✅ Intervention ${interventionId} scheduled for ${scheduledDateTime}`)

    // Clear any existing time slots and matches for this intervention
    await supabase.from('intervention_time_slots').delete().eq('intervention_id', interventionId)
    await supabase.from('availability_matches').delete().eq('intervention_id', interventionId)

    // Create notifications for all participants
    const notificationPromises = []

    // Notify tenant if they're not the one who selected the slot
    if (intervention.tenant_id && intervention.tenant_id !== user.id) {
      notificationPromises.push(
        notificationService.createNotification({
          userId: intervention.tenant_id,
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
    console.error("❌ Error in select-slot API:", error)
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la sélection du créneau'
    }, { status: 500 })
  }
}