import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { createServerUserService, createServerLotService, createServerBuildingService, createServerInterventionService } from '@/lib/services'
import { logger } from '@/lib/logger'
import { createQuoteRequestsForProviders } from './create-quote-requests'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createManagerInterventionSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { mapInterventionType, mapUrgencyLevel } from '@/lib/utils/intervention-mappers'
import { createServerNotificationRepository } from '@/lib/services'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { NotificationRepository } from '@/lib/services/repositories/notification-repository'

export async function POST(request: NextRequest) {
  logger.info({}, "🔧 create-manager-intervention API route called")

  try {
    // ✅ AUTH: createServerClient pattern → getApiAuthContext (42 lignes → 6 lignes)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, authUser } = authResult.data

    // Initialize services
    const userService = await createServerUserService()
    const lotService = await createServerLotService()
    const buildingService = await createServerBuildingService()
    const interventionService = await createServerInterventionService()

    logger.info({ userId: authUser.id }, "✅ Authenticated user")

    // Parse the request body - support both FormData (with files) and JSON (backward compatibility)
    let body: Record<string, unknown>
    const files: File[] = []
    const fileMetadata: Record<string, unknown>[] = []
    const contentType = request.headers.get('content-type')

    if (contentType?.includes('multipart/form-data')) {
      logger.info({}, "📦 Parsing FormData request")
      const formData = await request.formData()
      const interventionDataString = formData.get('interventionData') as string
      body = JSON.parse(interventionDataString)

      const fileCount = parseInt(formData.get('fileCount') as string || '0')
      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file_${i}`) as File
        const metadataString = formData.get(`file_${i}_metadata`) as string

        if (file) {
          files.push(file)
          if (metadataString) {
            fileMetadata.push(JSON.parse(metadataString))
          } else {
            fileMetadata.push({})
          }
        }
      }
      logger.info({ fileCount: files.length }, "📎 Files extracted from FormData")
    } else {
      logger.info({}, "📝 Parsing JSON request")
      body = await request.json()
    }

    logger.info({ body }, "📝 Request body")

    // Log specific fields that often cause validation issues
    logger.info({
      selectedManagerIds: body.selectedManagerIds,
      selectedProviderIds: body.selectedProviderIds,
      selectedBuildingId: body.selectedBuildingId,
      selectedLotId: body.selectedLotId,
      urgency: body.urgency,
      schedulingType: body.schedulingType,
      fixedDateTime: body.fixedDateTime,
      timeSlots: body.timeSlots
    }, "🔍 Key validation fields")

    // ✅ ZOD VALIDATION: Type-safe input validation avec sécurité renforcée
    const validation = validateRequest(createManagerInterventionSchema, body)
    if (!validation.success) {
      const formattedErrors = formatZodErrors(validation.errors)
      logger.error({
        errors: formattedErrors,
        rawErrors: validation.errors
      }, '❌ [CREATE-MANAGER-INTERVENTION] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formattedErrors
      }, { status: 400 })
    }

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

      // Messages
      messageType,
      globalMessage,

      // Options
      expectsQuote,
    } = validation.data

    // Fields not in schema validation (passed through from body)
    const {
      managerAvailabilities,
      individualMessages,
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

    // ✅ Role check already done by getApiAuthContext({ requiredRole: 'gestionnaire' })
    logger.info({ name: user.name, role: user.role }, "✅ Manager user found")

    // Determine if this is a building or lot intervention
    let lotId: string | null = null
    let buildingId: string | null = null
    // ✅ FIX 2025-10-15: tenant_id REMOVED - tenants added via intervention_assignments
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

      // ✅ FIX 2025-10-15: No longer extract tenant_id here
      // Tenants will be added via intervention_assignments AFTER intervention creation
      logger.info({}, "ℹ️ Tenants will be linked via intervention_assignments")

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

      // ✅ FIX 2025-10-15: No tenant_id for building-wide interventions
      // Use building's team if available, otherwise use provided teamId
      if (building.team_id) {
        interventionTeamId = building.team_id
      }

      logger.info({}, "✅ Building-wide intervention - tenants via intervention_assignments")
    }

    // ✅ Mapping functions centralisées dans lib/utils/intervention-mappers.ts

    // Generate unique reference for the intervention
    const generateReference = () => {
      const now = new Date()
      const year = String(now.getFullYear()).slice(-2)
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`
      return `INT-${timestamp}`
    }

    // Determine scheduled date based on scheduling type
    let scheduledDate: string | null = null
    if (schedulingType === 'fixed' && fixedDateTime?.date && fixedDateTime?.time) {
      scheduledDate = `${fixedDateTime.date}T${fixedDateTime.time}:00.000Z`
    }

    // ✅ Note: assigned_contact_id n'existe plus dans la nouvelle structure DB
    // Les assignations se font maintenant viaintervention_assignments

    // Prepare intervention data
    logger.info({ selectedManagerIds }, "📝 Preparing intervention data with multiple managers")

    // ✅ LOGIQUE MÉTIER: Déterminer le statut selon les règles de création par gestionnaire
    let interventionStatus: Database['public']['Enums']['intervention_status']

    logger.info({
      hasProviders: selectedProviderIds && selectedProviderIds.length > 0,
      expectsQuote,
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
      selectedManagerIds.length === 1 && // Que le gestionnaire créateur
      (!selectedProviderIds || selectedProviderIds.length === 0) && // Pas de prestataires
      schedulingType === 'fixed' && // Date/heure fixe
      fixedDateTime?.date && fixedDateTime?.time // Date et heure définies
    ) {
      interventionStatus = 'planifiee'
      logger.info({}, "✅ Statut déterminé: PLANIFIEE (seul gestionnaire + date fixe)")

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
      // ✅ FIX 2025-10-15: tenant_id REMOVED - all participants via intervention_assignments
      team_id: interventionTeamId,
      status: interventionStatus, // ✅ Statut déterminé selon les règles métier
      scheduled_date: scheduledDate,
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
    // ✅ FIX: Pass user.id as second parameter (required by interventionService.create signature)
    const interventionResult = await interventionService.create(interventionData, user.id)

    // ✅ CRITICAL: Check if creation succeeded BEFORE continuing
    if (!interventionResult.success || !interventionResult.data) {
      logger.error({ error: interventionResult.error }, "❌ Intervention creation failed")
      return NextResponse.json({
        success: false,
        error: interventionResult.error?.message || 'Failed to create intervention'
      }, { status: 500 })
    }

    const intervention = interventionResult.data
    logger.info({ interventionId: intervention.id }, "✅ Intervention created successfully")

    // Handle multiple contact assignments
    logger.info({}, "👥 Creating contact assignments...")
    logger.info({ count: selectedManagerIds.length }, "👥 Selected managers")
    logger.info({ count: selectedProviderIds?.length || 0 }, "👥 Selected providers")

    // ✅ VALIDATE user IDs before creating assignments
    logger.info({}, "🔍 Validating selected user IDs...")
    const allUserIds = [
      ...selectedManagerIds,
      ...(selectedProviderIds || [])
    ]

    if (allUserIds.length > 0) {
      const { data: validUsers, error: validateError } = await supabase
        .from('users')
        .select('id, name, role')
        .in('id', allUserIds)

      if (validateError) {
        logger.error({ error: validateError }, "❌ Error validating user IDs")
        return NextResponse.json({
          success: false,
          error: 'Erreur lors de la validation des utilisateurs sélectionnés'
        }, { status: 500 })
      } else {
        const validUserIds = new Set(validUsers?.map(u => u.id) || [])
        const invalidManagerIds = selectedManagerIds.filter(id => !validUserIds.has(id))
        const invalidProviderIds = (selectedProviderIds || []).filter(id => !validUserIds.has(id))

        if (invalidManagerIds.length > 0 || invalidProviderIds.length > 0) {
          logger.error({
            invalidManagerIds,
            invalidProviderIds
          }, "❌ Invalid user IDs detected")

          return NextResponse.json({
            success: false,
            error: 'Certains utilisateurs sélectionnés sont invalides',
            details: {
              invalidManagers: invalidManagerIds,
              invalidProviders: invalidProviderIds
            }
          }, { status: 400 })
        }

        logger.info({
          validCount: validUsers?.length || 0,
          totalProvided: allUserIds.length,
          validUsers: validUsers?.map(u => ({ id: u.id, name: u.name, role: u.role }))
        }, "✅ All user IDs validated successfully")
      }
    }

    const contactAssignments: Array<{
      intervention_id: string,
      user_id: string, // ✅ Correction: c'est user_id, pas contact_id
      role: string,
      is_primary: boolean,
      notes?: string,
      assigned_by: string
    }> = []

    // ✅ Add all manager assignments
    selectedManagerIds.forEach((managerId: string, index: number) => {
      logger.info({ assignmentNumber: index + 1, managerId }, "👥 Adding manager assignment")
      contactAssignments.push({
        intervention_id: intervention.id,
        user_id: managerId, // ✅ Correction: user_id
        role: 'gestionnaire',
        is_primary: index === 0, // First manager is primary
        notes: messageType === 'individual' ? individualMessages[managerId] : undefined,
        assigned_by: user.id
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
          notes: messageType === 'individual' ? individualMessages[providerId] : undefined,
          assigned_by: user.id
        })
      })
    }

    // Insert contact assignments
    if (contactAssignments.length > 0) {
      logger.info({ count: contactAssignments.length }, "📝 Creating contact assignments")

      // ✅ LOG LE PAYLOAD EXACT AVANT L'INSERT
      logger.info({
        currentUserId: user.id,
        assignments: contactAssignments.map(a => ({
          intervention_id: a.intervention_id,
          user_id: a.user_id,
          role: a.role,
          is_primary: a.is_primary,
          assigned_by: a.assigned_by,
          has_notes: !!a.notes
        }))
      }, "📋 Assignment payload details")

      const { error: assignmentError, data: assignmentData } = await supabase
        .from('intervention_assignments')
        .insert(contactAssignments)
        .select()

      if (assignmentError) {
        // ✅ LOG L'ERREUR COMPLÈTE
        logger.error({
          error: assignmentError,
          code: assignmentError.code,
          message: assignmentError.message,
          details: assignmentError.details,
          hint: assignmentError.hint
        }, "❌ ERREUR DÉTAILLÉE lors de l'insertion des assignments")

        // ✅ Retourner l'erreur au client pour debugging
        return NextResponse.json({
          success: false,
          error: `Erreur lors de l'assignation: ${assignmentError.message}`,
          details: {
            code: assignmentError.code,
            hint: assignmentError.hint
          }
        }, { status: 500 })
      } else {
        logger.info({
          count: assignmentData?.length || 0,
          inserted: assignmentData?.map(a => ({ id: a.id, user_id: a.user_id, role: a.role }))
        }, "✅ Contact assignments created successfully")
      }
    }

    // ✅ NEW 2025-10-17: Auto-create quote requests if expectsQuote and providers assigned
    if (expectsQuote && selectedProviderIds && selectedProviderIds.length > 0) {
      await createQuoteRequestsForProviders({
        interventionId: intervention.id,
        teamId: interventionTeamId,
        providerIds: selectedProviderIds,
        createdBy: user.id,
        messageType,
        globalMessage,
        individualMessages,
        supabase
      })
    }

    // ✅ NEW 2025-10-15: Auto-assign tenants from lot_contacts (if lot intervention)
    if (lotId) {
      logger.info({}, "👤 Extracting and assigning tenants from lot_contacts...")

      try {
        const { data: tenantContactsData, error: tenantsError } = await supabase
          .from('lot_contacts')
          .select(`
            user_id,
            is_primary,
            users!inner (
              id,
              name,
              email,
              role
            )
          `)
          .eq('lot_id', lotId)
          .eq('users.role', 'locataire')

        if (tenantsError) {
          logger.error({ error: tenantsError }, "⚠️ Error fetching tenants from lot_contacts")
        } else if (tenantContactsData && tenantContactsData.length > 0) {
          // Prepare tenant assignments
          const tenantAssignments = tenantContactsData.map((contact: any, index: number) => ({
            intervention_id: intervention.id,
            user_id: contact.user_id,
            role: 'locataire',
            is_primary: contact.is_primary || index === 0, // Use lot_contacts is_primary or first tenant
            assigned_by: user.id
          }))

          // Insert tenant assignments
          const { error: tenantAssignError } = await supabase
            .from('intervention_assignments')
            .insert(tenantAssignments)

          if (tenantAssignError) {
            logger.error({ error: tenantAssignError }, "⚠️ Error assigning tenants")
          } else {
            logger.info({ count: tenantAssignments.length }, "✅ Tenants auto-assigned from lot_contacts")
          }
        } else {
          logger.info({}, "ℹ️ No tenants found in lot_contacts for this lot")
        }
      } catch (error) {
        logger.error({ error }, "❌ Error in tenant auto-assignment")
        // Don't fail the entire operation for tenant assignment errors
      }
    }

    // Handle scheduling slots if provided (flexible/slots = multiple slots)
    if ((schedulingType === 'flexible' || schedulingType === 'slots') && timeSlots && timeSlots.length > 0) {
      logger.info({ count: timeSlots.length }, "📅 Creating time slots")

      const timeSlotsToInsert = timeSlots
        .filter((slot: { date?: string; startTime?: string; endTime?: string }) => slot.date && slot.startTime && slot.endTime) // Only valid slots
        .map((slot: { date: string; startTime: string; endTime: string }) => ({
          intervention_id: intervention.id,
          slot_date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_selected: false,
          proposed_by: user.id // Track who proposed these slots
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

    // Handle fixed date/time (create single slot)
    logger.info({
      schedulingType,
      typeCheck: schedulingType === 'fixed',
      fixedDateTime,
      hasDate: !!fixedDateTime?.date,
      hasTime: !!fixedDateTime?.time,
      conditionResult: schedulingType === 'fixed' && !!fixedDateTime?.date && !!fixedDateTime?.time
    }, "🔍 [DEBUG] Checking fixed slot creation condition")

    if (schedulingType === 'fixed' && fixedDateTime?.date && fixedDateTime?.time) {
      // Calculate end_time as start_time + 1 hour (to satisfy valid_time_range constraint)
      const [hours, minutes] = fixedDateTime.time.split(':').map(Number)
      const endHour = (hours + 1) % 24 // Wrap around midnight
      const end_time = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      logger.info({
        date: fixedDateTime.date,
        start_time: fixedDateTime.time,
        end_time,
        duration: '1 hour'
      }, "📅 Creating fixed slot with 1-hour default duration")

      const { error: fixedSlotError } = await supabase
        .from('intervention_time_slots')
        .insert({
          intervention_id: intervention.id,
          slot_date: fixedDateTime.date,
          start_time: fixedDateTime.time,
          end_time: end_time, // ✅ 1 hour after start_time
          is_selected: true, // Pre-selected because it's fixed
          proposed_by: user.id, // ✅ Set creator as proposer (uses public.users.id, not auth.users.id)
        })

      if (fixedSlotError) {
        logger.error({ error: fixedSlotError }, "⚠️ Error creating fixed slot")
      } else {
        logger.info("✅ Fixed slot created")
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
        const { fileService } = await import('@/lib/file-service')
        let uploadedCount = 0

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const metadata = fileMetadata[i] || {}

          try {
            // Validate file
            const validation = fileService.validateFile(file)
            if (!validation.isValid) {
              logger.error({ fileName: file.name, error: validation.error }, "❌ File validation failed")
              continue
            }

            // Get document type from metadata or use default
            const documentType = (metadata as { documentType?: string }).documentType || 'photo_avant'

            // Upload to Supabase Storage and create database record
            await fileService.uploadInterventionDocument(supabase, file, {
              interventionId: intervention.id,
              uploadedBy: user.id,
              teamId: intervention.team_id,
              documentType: documentType as Database['public']['Enums']['intervention_document_type'],
              description: `Fichier uploadé lors de la création: ${file.name}`
            })

            uploadedCount++
            logger.info({ fileName: file.name }, "✅ File uploaded successfully")
          } catch (fileError) {
            logger.error({ fileName: file.name, error: fileError }, "❌ Error uploading file")
            // Continue with other files even if one fails
          }
        }

        // Update intervention has_attachments flag if any files were uploaded
        if (uploadedCount > 0) {
          await interventionService.update(intervention.id, { has_attachments: true })
          logger.info({ uploadedCount }, "✅ Files uploaded successfully")
        }

      } catch (error) {
        logger.error({ error }, "❌ Error handling file uploads")
        // Don't fail the entire intervention creation for file handling errors
      }
    }

    // Store provider guidelines and additional metadata
    const updateData: {
      provider_guidelines?: string
      metadata?: Record<string, unknown>
    } = {}

    // Store provider guidelines if provided
    if (globalMessage && globalMessage.trim()) {
      updateData.provider_guidelines = globalMessage.trim()
    }

    // Store system metadata in JSONB metadata field
    const systemMetadata: Record<string, unknown> = {}
    if (buildingId && !lotId) systemMetadata.building_level = true
    if (location) systemMetadata.specific_location = location
    if (expectsQuote) systemMetadata.requires_quote = expectsQuote
    if (schedulingType === 'flexible' && timeSlots?.length) {
      systemMetadata.proposed_slots_count = timeSlots.length
    }

    if (Object.keys(systemMetadata).length > 0) {
      updateData.metadata = systemMetadata
    }

    // Update intervention with provider guidelines and metadata if needed
    if (Object.keys(updateData).length > 0) {
      await interventionService.update(intervention.id, updateData, user.id)
    }

    logger.info({}, "🎉 Manager intervention creation completed successfully")

    // ✅ NOTIFICATIONS: Send notifications to team members
    try {
      logger.info({ interventionId: intervention.id }, "📬 [API] Creating intervention notifications")

      // ✅ Use Service Role to bypass RLS for notification context fetching
      // This ensures we can fetch the full intervention details even if RLS blocked the read for the user
      const serviceRoleClient = createServiceRoleSupabaseClient()
      const notificationRepository = new NotificationRepository(serviceRoleClient)
      const notificationService = new NotificationService(notificationRepository)

      const notifications = await notificationService.notifyInterventionCreated({
        interventionId: intervention.id,
        teamId: intervention.team_id,
        createdBy: user.id
      })

      logger.info({
        reference: intervention.reference,
        title: intervention.title,
        status: intervention.status,
        created_at: intervention.created_at
      }, "✅ [API] Notifications created successfully")

    } catch (error) {
      logger.error(error, "⚠️ [API] Failed to create notifications")
    }

    // ⚡ NO-CACHE: Mutations ne doivent pas être cachées
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
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    })

  } catch (error) {
    logger.error(error, "❌ Error in create-manager-intervention API")
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
