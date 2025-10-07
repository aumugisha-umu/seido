import { NextRequest, NextResponse } from 'next/server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { createServerUserService, createServerLotService, createServerBuildingService, createServerInterventionService, createServerSupabaseClient } from '@/lib/services'
import { logger, logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  logger.info({}, "🔧 create-manager-intervention API route called")

  try {
    // Initialize services
    const userService = await createServerUserService()
    const lotService = await createServerLotService()
    const buildingService = await createServerBuildingService()
    const interventionService = await createServerInterventionService()
    // Get the authenticated user 
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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      logger.error({ authError }, "❌ Auth error")
      return NextResponse.json({
        success: false,
        error: 'Erreur d\'authentification'
      }, { status: 401 })
    }

    logger.info({ userId: authUser.id }, "✅ Authenticated user")

    // Parse the request body
    const body = await request.json()
    logger.info({ body }, "📝 Request body")
    
    const {
      // Basic intervention data
      title,
      description,
      type,
      urgency,
      location,
      
      // Housing selection
      selectedBuildingId,
      selectedLotId,
      
      // Contact assignments
      selectedManagerIds, // ✅ Nouveau format: array de gestionnaires
      selectedProviderIds,
      
      // Scheduling
      schedulingType,
      fixedDateTime,
      timeSlots,
      managerAvailabilities, // Disponibilités du gestionnaire (en plus des timeSlots proposés)
      
      // Messages
      messageType,
      globalMessage,
      individualMessages,
      
      // Options
      expectsQuote,
      
      // Files
      files,
      
      // Team context
      teamId
    } = body

    // Validate required fields
    logger.info({
      title: !!title,
      description: !!description,
      selectedManagerIds: selectedManagerIds?.length || 0,
      hasLogement: !!(selectedBuildingId || selectedLotId)
    }, "🔍 Validating required fields")
    
    if (!title || !description || (!selectedBuildingId && !selectedLotId)) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants (titre, description, logement)'
      }, { status: 400 })
    }
    
    if (!selectedManagerIds || selectedManagerIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Au moins un gestionnaire doit être assigné'
      }, { status: 400 })
    }

    // Get user data from database
    logger.info({}, "👤 Getting user data...")
    logger.info({ authUserId: authUser.id }, "👤 Looking for user with auth_user_id")
    
    // ✅ Utiliser findByAuthUserId au lieu de getById pour la nouvelle structure DB
    let user
    try {
      const userResult = await userService.findByAuthUserId(authUser.id)
      if (userResult?.success === false) {
        logger.error({ error: userResult.error }, "❌ findByAuthUserId returned error")
      }
      user = userResult?.data ?? null
      logger.info({ user: user ? { id: user.id, name: user.name, role: user.role } : null }, "✅ Found user via findByAuthUserId")
    } catch (error) {
      logger.error({ error }, "❌ Error with findByAuthUserId, trying getById")
      // Fallback: essayer avec getById au cas où
      try {
        const byIdResult = await userService.getById(authUser.id)
        if (byIdResult?.success === false) {
          logger.error({ error: byIdResult.error }, "❌ getById returned error")
        }
        user = byIdResult?.data ?? null
        logger.info({ user: user ? { id: user.id, name: user.name, role: user.role } : null }, "✅ Found user via getById fallback")
      } catch (fallbackError) {
        logger.error({ fallbackError }, "❌ Both methods failed")
      }
    }
    
    if (!user) {
      logger.error({ authUserId: authUser.id }, "❌ No user found for auth_user_id")
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Accept both FR and EN role labels (DB may use FR 'gestionnaire')
    const roleValue = (user.role || '').toString().toLowerCase()
    const isManager = roleValue === 'gestionnaire' || roleValue === 'manager'
    if (!isManager) {
      return NextResponse.json({
        success: false,
        error: 'Accès réservé aux gestionnaires'
      }, { status: 403 })
    }

    logger.info({ name: user.name, role: user.role }, "✅ Manager user found")

    // Determine if this is a building or lot intervention
    let lotId: string | null = null
    let buildingId: string | null = null
    let tenantId: string | null = null
    let interventionTeamId = teamId

    // Sanitize IDs that might come as 'undefined' strings from the client
    const safeSelectedLotId = selectedLotId && selectedLotId !== 'undefined' && selectedLotId !== 'null' ? selectedLotId : null
    const safeSelectedBuildingId = selectedBuildingId && selectedBuildingId !== 'undefined' && selectedBuildingId !== 'null' ? selectedBuildingId : null

    if (safeSelectedLotId) {
      // Lot-specific intervention
      lotId = safeSelectedLotId.toString()
      logger.info({ lotId }, "🏠 Creating lot-specific intervention for lot ID")

      if (!lotId) {
        return NextResponse.json({
          success: false,
          error: 'ID du lot invalide'
        }, { status: 400 })
      }

      const lot = await lotService.getById(lotId)
      if (!lot) {
        return NextResponse.json({
          success: false,
          error: 'Lot non trouvé'
        }, { status: 404 })
      }

      // Get tenant for this lot if exists
      logger.info({}, "👤 Looking for tenant in lot...")

      // ✅ Utiliser uniquement lot_contacts (nouvelle architecture)
      logger.info({}, "🔄 Using only lot_contacts for tenant lookup...")
      
      {
        // ✅ Look for tenant in lot_contacts avec nouvelle logique
        const { data: tenantContactData } = await supabase
          .from('lot_contacts')
          .select(`
            user:user_id (
              id,
              name,
              email,
              role,
              provider_category
            ),
            is_primary
          `)
          .eq('lot_id', lotId)
          .or('end_date.is.null,end_date.gt.now()') // Contacts actifs

        if (tenantContactData && tenantContactData.length > 0) {
          // ✅ Trouver le locataire parmi les contacts (rôle français DB)
          const tenantContact = tenantContactData.find(contact => {
            return contact.user?.role === 'locataire' // Utiliser le rôle français de la DB
          })
          
          if (tenantContact?.user) {
            tenantId = tenantContact.user.id
            logger.info({ tenantId }, "✅ Found tenant from lot_contacts")
          } else {
            logger.info({}, "ℹ️ No tenant found in lot_contacts")
          }
        } else {
          logger.info({}, "ℹ️ No contacts found for this lot")
        }
      }

      // Use lot's team if available, otherwise use provided teamId
      if (lot.team_id) {
        interventionTeamId = lot.team_id
      }
    } else if (safeSelectedBuildingId) {
      // Building-wide intervention
      buildingId = safeSelectedBuildingId.toString()
      logger.info({ buildingId }, "🏢 Creating building-wide intervention for building ID")

      if (!buildingId) {
        return NextResponse.json({
          success: false,
          error: "ID du bâtiment invalide"
        }, { status: 400 })
      }

      const building = await buildingService.getById(buildingId)
      if (!building) {
        return NextResponse.json({
          success: false,
          error: "Building not found"
        }, { status: 404 })
      }

      tenantId = null
      
      // Use building's team if available, otherwise use provided teamId
      if (building.team_id) {
        interventionTeamId = building.team_id
      }

      logger.info({}, "✅ Building-wide intervention will be linked directly to building")
    }

    // Map frontend values to database enums
    const mapInterventionType = (frontendType: string): Database['public']['Enums']['intervention_type'] => {
      const typeMapping: Record<string, Database['public']['Enums']['intervention_type']> = {
        'maintenance': 'autre',
        'plumbing': 'plomberie',
        'electrical': 'electricite',
        'heating': 'chauffage',
        'locksmith': 'serrurerie',
        'painting': 'peinture',
        'cleaning': 'menage',
        'gardening': 'jardinage',
        'other': 'autre',
        // Already correct values
        'plomberie': 'plomberie',
        'electricite': 'electricite',
        'chauffage': 'chauffage',
        'serrurerie': 'serrurerie',
        'peinture': 'peinture',
        'menage': 'menage',
        'jardinage': 'jardinage',
        'autre': 'autre'
      }
      return typeMapping[frontendType] || 'autre'
    }

    const mapUrgencyLevel = (frontendUrgency: string): Database['public']['Enums']['intervention_urgency'] => {
      const urgencyMapping: Record<string, Database['public']['Enums']['intervention_urgency']> = {
        'low': 'basse',
        'medium': 'normale',
        'high': 'haute',
        'urgent': 'urgente',
        'critique': 'urgente',
        // Already correct values
        'basse': 'basse',
        'normale': 'normale',
        'haute': 'haute',
        'urgente': 'urgente'
      }
      return urgencyMapping[frontendUrgency] || 'normale'
    }

    // Generate unique reference for the intervention
    const generateReference = () => {
      const timestamp = new Date().toISOString().slice(2, 10).replace('-', '').replace('-', '') // YYMMDD
      const random = Math.random().toString(36).substring(2, 6).toUpperCase() // 4 random chars
      return `INT-${timestamp}-${random}`
    }

    // Determine scheduled date based on scheduling type
    let scheduledDate: string | null = null
    if (schedulingType === 'fixed' && fixedDateTime?.date && fixedDateTime?.time) {
      scheduledDate = `${fixedDateTime.date}T${fixedDateTime.time}:00.000Z`
    }

    // ✅ Note: assigned_contact_id n'existe plus dans la nouvelle structure DB
    // Les assignations se font maintenant via intervention_contacts

    // Prepare intervention data
    logger.info({ selectedManagerIds }, "📝 Preparing intervention data with multiple managers")
    
    // ✅ LOGIQUE MÉTIER: Déterminer le statut selon les règles de création par gestionnaire
    let interventionStatus: Database['public']['Enums']['intervention_status']
    
    logger.info({
      hasProviders: selectedProviderIds && selectedProviderIds.length > 0,
      expectsQuote,
      hasTenant: !!tenantId,
      onlyOneManager: selectedManagerIds.length === 1,
      noProviders: !selectedProviderIds || selectedProviderIds.length === 0,
      schedulingType,
      hasFixedDateTime: schedulingType === 'fixed' && fixedDateTime?.date && fixedDateTime?.time
    }, "🔍 Analyse des conditions pour déterminer le statut")
    
    // CAS 1: Demande de devis si prestataires assignés + devis requis
    if (selectedProviderIds && selectedProviderIds.length > 0 && expectsQuote) {
      interventionStatus = 'demande_de_devis'
      logger.info({}, "✅ Statut déterminé: DEMANDE_DE_DEVIS (prestataires + devis requis)")
      
    // CAS 2: Planifiée directement si conditions strictes remplies
    } else if (
      !tenantId && // Pas de locataire dans le bien
      selectedManagerIds.length === 1 && // Que le gestionnaire créateur
      (!selectedProviderIds || selectedProviderIds.length === 0) && // Pas de prestataires
      schedulingType === 'fixed' && // Date/heure fixe
      fixedDateTime?.date && fixedDateTime?.time // Date et heure définies
    ) {
      interventionStatus = 'planifiee'
      logger.info({}, "✅ Statut déterminé: PLANIFIEE (pas locataire + seul gestionnaire + date fixe)")

    // CAS 3: Planification dans tous les autres cas
    } else {
      interventionStatus = 'planification'
      logger.info({}, "✅ Statut déterminé: PLANIFICATION (cas par défaut)")
    }
    
    const interventionData: Record<string, unknown> = {
      title,
      description,
      type: mapInterventionType(type || ''),
      urgency: mapUrgencyLevel(urgency || ''),
      reference: generateReference(),
      tenant_id: tenantId, // Can be null for manager-created interventions
      // ✅ Pas de manager_id dans la nouvelle structure - les assignations se font via intervention_contacts
      team_id: interventionTeamId,
      status: interventionStatus, // ✅ NOUVEAU: Statut déterminé selon les règles métier
      scheduled_date: scheduledDate,
      manager_comment: location ? `Localisation: ${location}` : null,
      requires_quote: expectsQuote || false,
      scheduling_type: schedulingType,
      specific_location: location
    }

    // Add lot_id only if it exists (for lot-specific interventions)
    if (lotId) {
      interventionData.lot_id = lotId
    }

    // Add building_id only if it exists (for building-wide interventions)
    if (buildingId) {
      interventionData.building_id = buildingId
    }

    logger.info({ interventionData }, "📝 Creating intervention with data")

    // Create the intervention
    const intervention = await interventionService.create(interventionData)
    logger.info({ interventionId: intervention.id }, "✅ Intervention created")

    // Handle multiple contact assignments
    logger.info({}, "👥 Creating contact assignments...")
    logger.info({ count: selectedManagerIds.length }, "👥 Selected managers")
    logger.info({ count: selectedProviderIds?.length || 0 }, "👥 Selected providers")
    
    const contactAssignments: Array<{
      intervention_id: string,
      user_id: string, // ✅ Correction: c'est user_id, pas contact_id
      role: string,
      is_primary: boolean,
      individual_message?: string
    }> = []

    // ✅ Add all manager assignments
    selectedManagerIds.forEach((managerId: string, index: number) => {
      logger.info({ assignmentNumber: index + 1, managerId }, "👥 Adding manager assignment")
      contactAssignments.push({
        intervention_id: intervention.id,
        user_id: managerId, // ✅ Correction: user_id
        role: 'gestionnaire',
        is_primary: index === 0, // First manager is primary
        individual_message: messageType === 'individual' ? individualMessages[managerId] : undefined
      })
    })

    // ✅ Add provider assignments
    if (selectedProviderIds && selectedProviderIds.length > 0) {
      selectedProviderIds.forEach((providerId: string, index: number) => {
        logger.info({ assignmentNumber: index + 1, providerId }, "🔧 Adding provider assignment")
        contactAssignments.push({
          intervention_id: intervention.id,
          user_id: providerId, // ✅ Correction: user_id
          role: 'prestataire',
          is_primary: false, // Les gestionnaires sont prioritaires pour is_primary
          individual_message: messageType === 'individual' ? individualMessages[providerId] : undefined
        })
      })
    }

    // Insert contact assignments
    if (contactAssignments.length > 0) {
      logger.info({ count: contactAssignments.length }, "📝 Creating contact assignments")
      const { error: assignmentError } = await supabase
        .from('intervention_contacts')
        .insert(contactAssignments)

      if (assignmentError) {
        logger.error({ error: assignmentError }, "⚠️ Error creating contact assignments")
        // Don't fail the entire operation, just log the error
      } else {
        logger.info({ count: contactAssignments.length }, "✅ Contact assignments created")
      }
    }

    // Handle scheduling slots if provided
    if (schedulingType === 'slots' && timeSlots && timeSlots.length > 0) {
      logger.info({ count: timeSlots.length }, "📅 Creating time slots")
      
      const timeSlotsToInsert = timeSlots
        .filter((slot: { date?: string; startTime?: string; endTime?: string }) => slot.date && slot.startTime && slot.endTime) // Only valid slots
        .map((slot: { date: string; startTime: string; endTime: string }) => ({
          intervention_id: intervention.id,
          slot_date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_selected: false
        }))

      if (timeSlotsToInsert.length > 0) {
        const { error: slotsError } = await supabase
          .from('intervention_time_slots')
          .insert(timeSlotsToInsert)

        if (slotsError) {
          logger.error({ error: slotsError }, "⚠️ Error creating time slots")
        } else {
          logger.info({ count: timeSlotsToInsert.length }, "✅ Time slots created")
        }
      }
    }

    // ✅ Handle manager availabilities if provided (gestionnaire's own availability)
    if (managerAvailabilities && managerAvailabilities.length > 0) {
      logger.info({ count: managerAvailabilities.length }, "📅 Processing manager availabilities")

      try {
        // Validate and prepare manager availability data
        const validatedAvailabilities = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (const avail of managerAvailabilities) {
          const { date, startTime, endTime } = avail

          // Basic validation
          if (!date || !startTime || !endTime) {
            logger.warn({ availability: avail }, "⚠️ Skipping invalid manager availability")
            continue
          }

          // Validate date is not in the past
          const availDate = new Date(date)
          if (isNaN(availDate.getTime()) || availDate < today) {
            logger.warn({ date }, "⚠️ Skipping past date manager availability")
            continue
          }

          // Validate time format
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
          if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            logger.warn({ startTime, endTime }, "⚠️ Skipping invalid time format")
            continue
          }

          // Validate start < end
          const [startHour, startMin] = startTime.split(':').map(Number)
          const [endHour, endMin] = endTime.split(':').map(Number)
          if (startHour > endHour || (startHour === endHour && startMin >= endMin)) {
            logger.warn({ startTime, endTime }, "⚠️ Skipping invalid time range")
            continue
          }

          validatedAvailabilities.push({
            user_id: user.id, // Manager's ID
            intervention_id: intervention.id,
            date: date,
            start_time: startTime,
            end_time: endTime
          })
        }

        // Save manager availabilities to database
        if (validatedAvailabilities.length > 0) {
          const { data: savedAvailabilities, error: availError } = await supabase
            .from('user_availabilities')
            .insert(validatedAvailabilities)
            .select()

          if (availError) {
            logger.error({ error: availError }, "❌ Error saving manager availabilities")
            // Don't fail the whole intervention creation, just log the error
          } else {
            logger.info({ count: savedAvailabilities.length }, "✅ Manager availabilities saved")
          }
        } else {
          logger.info({}, "ℹ️ No valid manager availabilities to save")
        }
      } catch (availabilityError) {
        logger.error({ error: availabilityError }, "❌ Error processing manager availabilities")
        // Don't fail the intervention creation for availability errors
      }
    }

    // Handle file uploads if provided
    if (files && files.length > 0) {
      logger.info({ count: files.length }, "📎 Processing file uploads")
      
      try {
        // Store file information for later processing
        // Note: Actual file upload will be handled by separate API calls from the frontend
        // This is because FormData with files needs special handling in Next.js
        logger.info({}, "📝 Files will be uploaded separately via upload API")
        logger.info({ files: files.map((f: { name: string; size: number; type: string }) => ({ name: f.name, size: f.size, type: f.type })) }, "Files to upload")
        
        // We'll return the file information so the frontend can handle the uploads
        // The frontend will call /api/upload-intervention-document for each file
        
      } catch (error) {
        logger.error({ error }, "❌ Error handling file information")
        // Don't fail the entire intervention creation for file handling errors
      }
    }

    // Store additional metadata in manager_comment
    const managerCommentParts = []
    if (buildingId && !lotId) managerCommentParts.push('Intervention sur bâtiment entier')
    if (location) managerCommentParts.push(`Localisation: ${location}`)
    if (expectsQuote) managerCommentParts.push('Devis requis')
    if (globalMessage) managerCommentParts.push(`Instructions: ${globalMessage}`)
    if (schedulingType === 'flexible') managerCommentParts.push('Horaire flexible')
    if (schedulingType === 'slots') managerCommentParts.push(`${timeSlots?.length || 0} créneaux proposés`)

    // Update intervention with additional metadata if needed
    if (managerCommentParts.length > 0) {
      await interventionService.update(intervention.id, {
        manager_comment: managerCommentParts.join(' | ')
      })
    }

    logger.info({}, "🎉 Manager intervention creation completed successfully")

    return NextResponse.json({
      success: true,
      intervention: {
        id: intervention.id,
        reference: intervention.reference,
        title: intervention.title,
        status: intervention.status,
        created_at: intervention.created_at
      },
      message: 'Intervention créée avec succès'
    })

  } catch (error) {
    logger.error({ error }, "❌ Error in create-manager-intervention API")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la création de l\'intervention'
    }, { status: 500 })
  }
}
