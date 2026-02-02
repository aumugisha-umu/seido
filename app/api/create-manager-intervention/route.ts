import { NextRequest, NextResponse, after } from 'next/server'
import { Database } from '@/lib/database.types'
import { createServerUserService, createServerLotService, createServerBuildingService, createServerInterventionService } from '@/lib/services'
import { logger } from '@/lib/logger'
import { createQuoteRequestsForProviders } from './create-quote-requests'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createManagerInterventionSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { mapInterventionType, mapUrgencyLevel } from '@/lib/utils/intervention-mappers'
import { createServerNotificationRepository, createServerUserRepository, createServerBuildingRepository, createServerLotRepository, createServerInterventionRepository, ConversationRepository } from '@/lib/services'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import { EmailNotificationService } from '@/lib/services/domain/email-notification.service'
import { EmailService } from '@/lib/services/domain/email.service'
// ✅ Static import for EmailLinkRepository (was dynamic import before)
import { EmailLinkRepository } from '@/lib/services/repositories/email-link.repository'
import { sendThreadWelcomeMessage } from '@/lib/utils/thread-welcome-messages'

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

      // Multi-provider mode
      assignmentMode,
      providerInstructions,

      // Scheduling
      schedulingType,
      fixedDateTime,
      timeSlots,

      // Messages
      messageType,
      globalMessage,

      // Options
      expectsQuote,
      includeTenants,
      // ✅ FIX 2026-01-25: Explicit tenant IDs from contract selection
      selectedTenantIds,

      // Confirmation des participants
      requiresParticipantConfirmation,
      confirmationRequiredUserIds,

      // Source email (validated as UUID by Zod)
      sourceEmailId,

      // Contract ID (for linking intervention to a specific contract)
      contractId,
    } = validation.data

    // Fields not in schema validation (passed through from body)
    const {
      managerAvailabilities,
      individualMessages,
      teamId,
      excludedLotIds = [], // For building interventions: lots to exclude from tenant assignment
    } = body

    // Validate required fields (description is optional per Zod schema)
    logger.info({
      title: !!title,
      hasDescription: !!description,
      selectedManagerIds: selectedManagerIds?.length || 0,
      hasLogement: !!(selectedBuildingId || selectedLotId)
    }, "🔍 Validating required fields")

    if (!title || (!selectedBuildingId && !selectedLotId)) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants (titre, logement)'
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

    // ✅ BUG FIX 2026-01: Validate team_id is required to prevent orphan interventions
    if (!interventionTeamId) {
      logger.error({
        selectedLotId: safeSelectedLotId,
        selectedBuildingId: safeSelectedBuildingId,
        bodyTeamId: teamId
      }, "❌ team_id could not be determined - intervention would be orphaned")
      return NextResponse.json({
        success: false,
        error: 'Impossible de déterminer l\'équipe pour cette intervention. Le lot ou le bâtiment n\'est pas associé à une équipe.'
      }, { status: 400 })
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

    // CAS 1: Planification si devis requis (besoin d'attendre les devis)
    // ✅ FIX 2026-01-26: Le statut demande_de_devis a été supprimé
    // Les devis sont maintenant gérés via requires_quote + intervention_quotes
    if (expectsQuote) {
      interventionStatus = 'planification'
      logger.info({}, "✅ Statut déterminé: PLANIFICATION (devis requis - géré via requires_quote)")

      // CAS 2: Planifiée directement si date fixe + pas de confirmation requise
      // ✅ FIX 2026-01-28: Retiré la condition "pas de prestataires" - si date fixe sans confirmation,
      // l'intervention est planifiée même avec un prestataire assigné
    } else if (
      schedulingType === 'fixed' && // Date/heure fixe
      fixedDateTime?.date && fixedDateTime?.time && // Date et heure définies
      !requiresParticipantConfirmation // Pas de confirmation requise des participants
    ) {
      interventionStatus = 'planifiee'
      logger.info({}, "✅ Statut déterminé: PLANIFIEE (date fixe, sans confirmation)")

      // CAS 3: Planification dans tous les autres cas (slots, flexible, confirmation requise)
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
      specific_location: location,
      // Multi-provider mode
      assignment_mode: assignmentMode || 'single',
      // ✅ FIX 2025-12-24: Ajout created_by pour exclure le créateur des notifications email
      created_by: user.id
    }

    // Add lot_id only if it exists (for lot-specific interventions)
    if (lotId) {
      interventionData.lot_id = lotId
    }

    // Add building_id only if it exists (for building-wide interventions)
    if (buildingId) {
      interventionData.building_id = buildingId
    }

    // Add contract_id if provided (for linking intervention to a specific contract)
    if (contractId) {
      interventionData.contract_id = contractId
      logger.info({ contractId }, "📄 Linking intervention to contract")
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

    // ✅ CREATE CONVERSATION THREADS (BEFORE assignments)
    // Threads must be created BEFORE assignments so that the trigger
    // add_assignment_to_conversation_participants can find and populate them
    //
    // Thread structure:
    // - group: All participants (always created)
    // - tenants_group: All tenants + managers (if >1 tenant)
    // - providers_group: All providers + managers (if grouped mode AND >1 provider)
    // - tenant_to_managers (×N): One per tenant with participant_id
    // - provider_to_managers (×N): One per provider with participant_id
    try {
      logger.info({ interventionId: intervention.id }, "💬 Creating conversation threads...")

      // Use Service Role to bypass RLS for thread creation
      const serviceClientForThreads = createServiceRoleSupabaseClient()
      const conversationRepo = new ConversationRepository(serviceClientForThreads)

      // Fetch tenant info for personalized messages
      // ✅ FIX 2026-02-01: Only include users with auth_id (invited users with accounts)
      // Users without auth_id are informational contacts - they can't log in or receive notifications
      let tenants: Array<{ id: string; name: string }> = []
      if (selectedTenantIds && selectedTenantIds.length > 0) {
        const { data: tenantUsers } = await supabase
          .from('users')
          .select('id, name')
          .in('id', selectedTenantIds)
          .not('auth_user_id', 'is', null)  // Only invited users with accounts
        tenants = tenantUsers || []

        // Log for debugging if some tenants were filtered out
        if (tenants.length < selectedTenantIds.length) {
          logger.info({
            selectedCount: selectedTenantIds.length,
            invitedCount: tenants.length,
            filteredOut: selectedTenantIds.length - tenants.length
          }, "ℹ️ Some tenants filtered out (no auth account - informational contacts)")
        }
      }

      // Fetch provider info for personalized messages
      // ✅ FIX 2026-02-01: Only include users with auth_id (invited users with accounts)
      let providers: Array<{ id: string; name: string }> = []
      if (selectedProviderIds && selectedProviderIds.length > 0) {
        const { data: providerUsers } = await supabase
          .from('users')
          .select('id, name')
          .in('id', selectedProviderIds)
          .not('auth_user_id', 'is', null)  // Only invited users with accounts
        providers = providerUsers || []

        // Log for debugging if some providers were filtered out
        if (providers.length < selectedProviderIds.length) {
          logger.info({
            selectedCount: selectedProviderIds.length,
            invitedCount: providers.length,
            filteredOut: selectedProviderIds.length - providers.length
          }, "ℹ️ Some providers filtered out (no auth account - informational contacts)")
        }
      }

      logger.info({ tenantCount: tenants.length, providerCount: providers.length }, "📋 Participants to create threads for")

      // ========== 1. GROUP THREAD (always) ==========
      const groupThreadResult = await conversationRepo.createThread({
        intervention_id: intervention.id,
        thread_type: 'group',
        title: 'Discussion générale',
        created_by: user.id,
        team_id: intervention.team_id
      })

      if (groupThreadResult.success && groupThreadResult.data?.id) {
        logger.info({ threadId: groupThreadResult.data.id, type: 'group' }, "✅ Group thread created")
        await sendThreadWelcomeMessage(serviceClientForThreads, groupThreadResult.data.id, 'group', user.id)
      } else {
        logger.error({ error: groupThreadResult.error }, "⚠️ Failed to create group thread")
      }

      // ========== 2. TENANTS_GROUP THREAD (if >1 tenant) ==========
      if (tenants.length > 1) {
        const tenantsGroupResult = await conversationRepo.createThread({
          intervention_id: intervention.id,
          thread_type: 'tenants_group',
          title: 'Groupe locataires',
          created_by: user.id,
          team_id: intervention.team_id
        })

        if (tenantsGroupResult.success && tenantsGroupResult.data?.id) {
          logger.info({ threadId: tenantsGroupResult.data.id, type: 'tenants_group' }, "✅ Tenants group thread created")
          await sendThreadWelcomeMessage(serviceClientForThreads, tenantsGroupResult.data.id, 'tenants_group', user.id)
        } else {
          logger.error({ error: tenantsGroupResult.error }, "⚠️ Failed to create tenants_group thread")
        }
      }

      // ========== 3. INDIVIDUAL TENANT THREADS ==========
      for (const tenant of tenants) {
        const tenantThreadResult = await conversationRepo.createThread({
          intervention_id: intervention.id,
          thread_type: 'tenant_to_managers',
          title: `Conversation avec ${tenant.name}`,
          created_by: user.id,
          team_id: intervention.team_id,
          participant_id: tenant.id  // Individual thread for this specific tenant
        })

        if (tenantThreadResult.success && tenantThreadResult.data?.id) {
          logger.info({ threadId: tenantThreadResult.data.id, type: 'tenant_to_managers', participantId: tenant.id }, "✅ Individual tenant thread created")
          await sendThreadWelcomeMessage(serviceClientForThreads, tenantThreadResult.data.id, 'tenant_to_managers', user.id, tenant.name)
        } else {
          logger.error({ error: tenantThreadResult.error, tenantId: tenant.id }, "⚠️ Failed to create individual tenant thread")
        }
      }

      // ========== 4. PROVIDERS_GROUP THREAD (if grouped mode AND >1 provider) ==========
      const isGroupedMode = assignmentMode === 'grouped'
      if (isGroupedMode && providers.length > 1) {
        const providersGroupResult = await conversationRepo.createThread({
          intervention_id: intervention.id,
          thread_type: 'providers_group',
          title: 'Groupe prestataires',
          created_by: user.id,
          team_id: intervention.team_id
        })

        if (providersGroupResult.success && providersGroupResult.data?.id) {
          logger.info({ threadId: providersGroupResult.data.id, type: 'providers_group' }, "✅ Providers group thread created")
          await sendThreadWelcomeMessage(serviceClientForThreads, providersGroupResult.data.id, 'providers_group', user.id)
        } else {
          logger.error({ error: providersGroupResult.error }, "⚠️ Failed to create providers_group thread")
        }
      }

      // ========== 5. INDIVIDUAL PROVIDER THREADS ==========
      for (const provider of providers) {
        const providerThreadResult = await conversationRepo.createThread({
          intervention_id: intervention.id,
          thread_type: 'provider_to_managers',
          title: `Conversation avec ${provider.name}`,
          created_by: user.id,
          team_id: intervention.team_id,
          participant_id: provider.id  // Individual thread for this specific provider
        })

        if (providerThreadResult.success && providerThreadResult.data?.id) {
          logger.info({ threadId: providerThreadResult.data.id, type: 'provider_to_managers', participantId: provider.id }, "✅ Individual provider thread created")
          await sendThreadWelcomeMessage(serviceClientForThreads, providerThreadResult.data.id, 'provider_to_managers', user.id, provider.name)
        } else {
          logger.error({ error: providerThreadResult.error, providerId: provider.id }, "⚠️ Failed to create individual provider thread")
        }
      }

      if (providers.length === 0) {
        logger.info({}, "ℹ️ No providers selected, provider threads will be created when providers are assigned")
      }

      logger.info({
        interventionId: intervention.id,
        threadsCreated: {
          group: 1,
          tenantsGroup: tenants.length > 1 ? 1 : 0,
          providersGroup: (isGroupedMode && providers.length > 1) ? 1 : 0,
          individualTenants: tenants.length,
          individualProviders: providers.length
        }
      }, "✅ Conversation threads creation completed")
    } catch (threadError) {
      logger.error({ error: threadError }, "❌ Error creating conversation threads (non-blocking)")
      // Don't fail the entire operation for thread creation errors
    }

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
      provider_instructions?: string, // ✅ Instructions spécifiques au prestataire (mode séparé)
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

        // Get provider-specific instructions (if in separate mode)
        const providerSpecificInstructions = providerInstructions?.[providerId] || undefined

        contactAssignments.push({
          intervention_id: intervention.id,
          user_id: providerId, // ✅ Correction: user_id
          role: 'prestataire',
          is_primary: false, // Les gestionnaires sont prioritaires pour is_primary
          notes: messageType === 'individual' ? individualMessages[providerId] : undefined,
          provider_instructions: providerSpecificInstructions, // ✅ Instructions spécifiques au prestataire
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

        // ✅ NEW: Gestion de la confirmation des participants
        // Si requiresParticipantConfirmation est activé, mettre à jour l'intervention et les assignments
        if (requiresParticipantConfirmation && confirmationRequiredUserIds && confirmationRequiredUserIds.length > 0) {
          logger.info({
            interventionId: intervention.id,
            confirmationRequiredUserIds
          }, "📋 Setting up participant confirmation requirements")

          // 1. Mettre à jour l'intervention avec le flag
          const { error: updateInterventionError } = await supabase
            .from('interventions')
            .update({ requires_participant_confirmation: true })
            .eq('id', intervention.id)

          if (updateInterventionError) {
            logger.error({
              error: updateInterventionError
            }, "⚠️ Failed to update intervention confirmation flag (non-blocking)")
          } else {
            logger.info({}, "✅ Intervention confirmation flag set")
          }

          // 2. Mettre à jour les assignments qui nécessitent une confirmation
          const { error: updateAssignmentsError } = await supabase
            .from('intervention_assignments')
            .update({
              requires_confirmation: true,
              confirmation_status: 'pending'
            })
            .eq('intervention_id', intervention.id)
            .in('user_id', confirmationRequiredUserIds)

          if (updateAssignmentsError) {
            logger.error({
              error: updateAssignmentsError
            }, "⚠️ Failed to update assignment confirmation status (non-blocking)")
          } else {
            logger.info({
              count: confirmationRequiredUserIds.length
            }, "✅ Assignment confirmation requirements set")
          }
        }
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

    // ✅ UPDATED 2025-12-10: Auto-assign tenants from ACTIVE CONTRACTS (not lot_contacts)
    // Only contracts with status='actif' are considered (not 'a_venir')
    // ✅ UPDATED 2026-01-05: Respect includeTenants toggle from wizard
    // ✅ UPDATED 2026-01-06: Support building-level tenant assignment
    // ✅ FIX 2026-01-25: Respect selectedTenantIds from wizard (explicit contract selection)
    if (lotId && includeTenants !== false) {
      // LOT-LEVEL: Assign tenants based on explicit selection from wizard
      const explicitTenantIds = selectedTenantIds || []

      if (explicitTenantIds.length > 0) {
        // ✅ FIX: Use ONLY the explicitly selected tenants from the wizard
        // This respects the contract selection made by the user
        logger.info({
          selectedTenantIds: explicitTenantIds,
          count: explicitTenantIds.length
        }, "👤 Assigning explicitly selected tenants from wizard...")

        try {
          // Prepare tenant assignments from explicit selection
          const tenantAssignments = explicitTenantIds.map((userId: string, index: number) => ({
            intervention_id: intervention.id,
            user_id: userId,
            role: 'locataire',
            is_primary: index === 0, // First selected tenant is primary
            assigned_by: user.id
          }))

          // Insert tenant assignments
          const { error: tenantAssignError } = await supabase
            .from('intervention_assignments')
            .insert(tenantAssignments)

          if (tenantAssignError) {
            logger.error({ error: tenantAssignError }, "⚠️ Error assigning tenants")
          } else {
            logger.info({
              count: tenantAssignments.length
            }, "✅ Tenants assigned from explicit selection")
          }
        } catch (error) {
          logger.error({ error }, "❌ Error in tenant assignment")
          // Don't fail the entire operation for tenant assignment errors
        }
      } else {
        // ✅ FIX: No tenants selected (no contract chosen or lot unoccupied)
        // Don't auto-assign ANY tenants - this was the bug causing 7 tenants to be assigned
        logger.info({
          lotId,
          includeTenants,
          selectedTenantIdsProvided: !!selectedTenantIds,
          contractId: contractId || null
        }, "ℹ️ No tenants explicitly selected - skipping tenant auto-assignment")
      }
    } else if (buildingId && !lotId && includeTenants !== false) {
      // 🆕 BUILDING-LEVEL: Assign tenants from selected lots in the building
      const excludedLotIdsSet = new Set(excludedLotIds as string[])
      logger.info({ includeTenants, buildingId, excludedLotsCount: excludedLotIdsSet.size }, "👤 Extracting and assigning tenants from building's lots...")

      try {
        const { createServerContractService } = await import('@/lib/services')
        const contractService = await createServerContractService()
        const tenantsResult = await contractService.getActiveTenantsByBuilding(buildingId)

        if (!tenantsResult.success) {
          logger.error({ error: tenantsResult.error }, "⚠️ Error fetching tenants from building's active contracts")
        } else if (tenantsResult.data.tenants.length > 0) {
          // Filter out tenants from excluded lots, then deduplicate by user_id
          const uniqueTenants = new Map<string, typeof tenantsResult.data.tenants[0]>()
          for (const tenant of tenantsResult.data.tenants) {
            // Skip tenants from excluded lots
            if (excludedLotIdsSet.has(tenant.lot_id)) {
              continue
            }
            // Keep first occurrence (already sorted by lot reference, then primary)
            if (!uniqueTenants.has(tenant.user_id)) {
              uniqueTenants.set(tenant.user_id, tenant)
            }
          }

          if (uniqueTenants.size > 0) {
            // Prepare tenant assignments
            const tenantAssignments = Array.from(uniqueTenants.values()).map((tenant, index) => ({
              intervention_id: intervention.id,
              user_id: tenant.user_id,
              role: 'locataire',
              is_primary: index === 0, // First tenant is primary for building-level
              assigned_by: user.id
            }))

            // Insert tenant assignments
            const { error: tenantAssignError } = await supabase
              .from('intervention_assignments')
              .insert(tenantAssignments)

            if (tenantAssignError) {
              logger.error({ error: tenantAssignError }, "⚠️ Error assigning building tenants")
            } else {
              logger.info({
                count: tenantAssignments.length,
                uniqueCount: uniqueTenants.size,
                excludedLots: excludedLotIdsSet.size,
                fromLots: tenantsResult.data.occupiedLotsCount - excludedLotIdsSet.size
              }, "✅ Building tenants auto-assigned from active contracts")
            }
          } else {
            logger.info({ buildingId, excludedLotsCount: excludedLotIdsSet.size }, "ℹ️ No tenants to assign (all lots excluded or no active tenants)")
          }
        } else {
          logger.info({ buildingId }, "ℹ️ No active tenants found in building's lots")
        }
      } catch (error) {
        logger.error({ error }, "❌ Error in building tenant auto-assignment")
        // Don't fail the entire operation for tenant assignment errors
      }
    } else if ((lotId || buildingId) && includeTenants === false) {
      logger.info({}, "ℹ️ Tenant auto-assignment skipped (includeTenants=false)")
    }

    // Handle scheduling slots if provided (slots mode only)
    // ✅ FIX 2026-01-25: Removed 'flexible' - only 'slots' mode should create multiple slots
    // This prevents accidental slot creation if timeSlots array is injected in flexible mode
    if (schedulingType === 'slots' && timeSlots && timeSlots.length > 0) {
      logger.info({ count: timeSlots.length }, "📅 Creating time slots")

      const timeSlotsToInsert = timeSlots
        .filter((slot: { date?: string; startTime?: string; endTime?: string }) => slot.date && slot.startTime && slot.endTime) // Only valid slots
        .map((slot: { date: string; startTime: string; endTime: string }) => ({
          intervention_id: intervention.id,
          slot_date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          status: 'pending', // Modern status pattern (replaces is_selected: false)
          proposed_by: user.id // Track who proposed these slots
        }))

      if (timeSlotsToInsert.length > 0) {
        // ✅ FIX 2026-01-28: Use service role to bypass RLS for time slot creation
        // The RLS policy can_manage_time_slot() has timing issues with multi-profile checks
        const serviceClientForSlots = createServiceRoleSupabaseClient()
        const { error: slotsError } = await serviceClientForSlots
          .from('intervention_time_slots')
          .insert(timeSlotsToInsert)

        if (slotsError) {
          logger.error({ error: slotsError }, "❌ Error creating time slots")
          return NextResponse.json({
            success: false,
            error: `Erreur lors de la création des créneaux: ${slotsError.message}`
          }, { status: 500 })
        } else {
          logger.info({ count: timeSlotsToInsert.length }, "✅ Time slots created")
        }
      }
    }

    // Handle fixed date/time (create single slot)
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

      // ✅ FIX 2026-01-28: Use service role to bypass RLS for time slot creation
      // The RLS policy can_manage_time_slot() has timing issues with multi-profile checks
      const serviceClientForFixedSlot = createServiceRoleSupabaseClient()
      const { data: fixedSlot, error: fixedSlotError } = await serviceClientForFixedSlot
        .from('intervention_time_slots')
        .insert({
          intervention_id: intervention.id,
          slot_date: fixedDateTime.date,
          start_time: fixedDateTime.time,
          end_time: end_time, // ✅ 1 hour after start_time
          // ✅ FIX 2026-01-25: Si confirmation requise, créneau en attente. Sinon: confirmé directement
          status: requiresParticipantConfirmation ? 'pending' : 'selected',
          selected_by_manager: !requiresParticipantConfirmation, // Confirmé seulement si pas de confirmation requise
          proposed_by: user.id, // ✅ Set creator as proposer (uses public.users.id, not auth.users.id)
        })
        .select('id')
        .single()

      if (fixedSlotError) {
        logger.error({ error: fixedSlotError }, "❌ Error creating fixed slot")
        return NextResponse.json({
          success: false,
          error: `Erreur lors de la création du créneau: ${fixedSlotError.message}`
        }, { status: 500 })
      } else {
        logger.info({ slotId: fixedSlot?.id }, "✅ Fixed slot created")

        // ✅ FIX 2026-01-25: Mettre à jour l'intervention avec le slot sélectionné
        if (fixedSlot?.id) {
          const { error: updateSlotError } = await supabase
            .from('interventions')
            .update({ selected_slot_id: fixedSlot.id })
            .eq('id', intervention.id)

          if (updateSlotError) {
            logger.warn({ error: updateSlotError, slotId: fixedSlot.id }, "⚠️ Failed to set selected_slot_id on intervention")
          } else {
            logger.info({ interventionId: intervention.id, slotId: fixedSlot.id }, "✅ Intervention linked to selected slot")
          }
        }

        // 🆕 FIX: Si date fixe SANS confirmation requise, supprimer les réponses 'pending'
        // Le trigger PostgreSQL crée automatiquement des responses pour tous les participants
        // Mais en mode date fixe sans confirmation, aucune réponse n'est attendue des locataires
        // ✅ FIX 2026-01-25: Utiliser Service Role pour bypass RLS (le gestionnaire ne peut pas
        // supprimer les réponses des locataires avec son propre client - RLS bloque silencieusement)
        if (!requiresParticipantConfirmation && fixedSlot?.id) {
          const serviceClient = createServiceRoleSupabaseClient()

          const { error: cleanupError } = await serviceClient
            .from('time_slot_responses')
            .delete()
            .eq('time_slot_id', fixedSlot.id)
            .eq('response', 'pending')

          if (cleanupError) {
            logger.warn({ error: cleanupError, slotId: fixedSlot.id }, "⚠️ Failed to cleanup pending responses for fixed slot")
          } else {
            logger.info({ slotId: fixedSlot.id }, "🧹 Cleaned up pending responses for fixed slot (no confirmation required)")
          }
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

    // Handle file uploads if provided - ✅ OPTIMIZED: Parallel uploads
    if (files && files.length > 0) {
      logger.info({ count: files.length }, "📎 Processing file uploads (parallel)")

      try {
        const { fileService } = await import('@/lib/file-service')

        // ✅ Upload all files in parallel instead of sequentially
        const uploadResults = await Promise.all(
          files.map(async (file, i) => {
            const metadata = fileMetadata[i] || {}

            try {
              // Validate file
              const validation = fileService.validateFile(file)
              if (!validation.isValid) {
                logger.error({ fileName: file.name, error: validation.error }, "❌ File validation failed")
                return { success: false, fileName: file.name }
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

              logger.info({ fileName: file.name }, "✅ File uploaded successfully")
              return { success: true, fileName: file.name }
            } catch (fileError) {
              logger.error({ fileName: file.name, error: fileError }, "❌ Error uploading file")
              return { success: false, fileName: file.name }
            }
          })
        )

        // Count successful uploads
        const uploadedCount = uploadResults.filter(r => r.success).length

        // Update intervention has_attachments flag if any files were uploaded
        if (uploadedCount > 0) {
          try {
            const updateResult = await interventionService.update(intervention.id, { has_attachments: true })
            if (updateResult.success) {
              logger.info({ uploadedCount, totalFiles: files.length }, "✅ Files uploaded successfully and has_attachments flag updated")
            } else {
              logger.warn({ error: updateResult.error }, "⚠️ Could not update intervention has_attachments flag (non-critical)")
            }
          } catch (error) {
            logger.warn({ error }, "⚠️ Error updating intervention has_attachments flag (non-critical)")
            // Don't fail the entire operation for this
          }
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

    // ✅ EMAIL LINK: Create automatic link if intervention was created from an email
    // sourceEmailId is already validated as UUID by Zod schema
    if (sourceEmailId) {
      try {
        logger.info({ sourceEmailId, interventionId: intervention.id }, "🔗 [API] Creating email-intervention link")

        // ✅ SECURITY: Verify email exists and belongs to user's team before linking
        const { data: emailExists, error: emailCheckError } = await supabase
          .from('emails')
          .select('id')
          .eq('id', sourceEmailId)
          .eq('team_id', intervention.team_id)
          .single()

        if (emailCheckError || !emailExists) {
          logger.warn({
            sourceEmailId,
            interventionId: intervention.id,
            error: emailCheckError?.message
          }, "⚠️ [API] Email not found or not in team, skipping link creation")
          // Non-blocking: continue without creating the link
        } else {
          // Email exists and belongs to the team, create the link
          const emailLinkRepo = new EmailLinkRepository(supabase)

          await emailLinkRepo.createLink({
            email_id: sourceEmailId,
            entity_type: 'intervention',
            entity_id: intervention.id,
            linked_by: user.id
          })

          logger.info({
            sourceEmailId,
            interventionId: intervention.id
          }, "✅ [API] Email-intervention link created successfully")
        }

      } catch (linkError) {
        // Non-blocking: log error but don't fail intervention creation
        logger.error({
          error: linkError instanceof Error ? linkError.message : String(linkError),
          sourceEmailId,
          interventionId: intervention.id
        }, "⚠️ [API] Failed to create email-intervention link")
      }
    }

    // ✅ NOTIFICATIONS: Send notifications to team members
    // ✅ FIXED 2026-01: Use after() to ensure execution in serverless environments (Vercel)
    // The after() API runs code after the response is sent while keeping the function alive
    {
      logger.info({ interventionId: intervention.id }, "📬 [API] Scheduling in-app notifications via after()")

      // Capture variables for closure before after()
      const notificationInterventionId = intervention.id
      const notificationTeamId = intervention.team_id
      const notificationCreatedBy = user.id
      const notificationReference = intervention.reference

      after(async () => {
        try {
          // ✅ Use Service Role to bypass RLS for notification context fetching
          const serviceRoleClient = createServiceRoleSupabaseClient()
          const notificationRepository = new NotificationRepository(serviceRoleClient)
          const notificationService = new NotificationService(notificationRepository)

          await notificationService.notifyInterventionCreated({
            interventionId: notificationInterventionId,
            teamId: notificationTeamId,
            createdBy: notificationCreatedBy
          })

          logger.info({
            reference: notificationReference,
            interventionId: notificationInterventionId
          }, "✅ [API] In-app notifications created successfully (via after())")
        } catch (error) {
          logger.error({
            interventionId: notificationInterventionId,
            error: error instanceof Error ? error.message : String(error)
          }, "⚠️ [API] Failed to create in-app notifications (via after())")
        }
      })
    }

    // ✅ EMAILS: Send email notifications to assigned users
    // ✅ FIXED 2026-01: Use after() to ensure execution in serverless environments (Vercel)
    // The after() API runs code after the response is sent while keeping the function alive
    {
      logger.info({ interventionId: intervention.id }, "📧 [API] Scheduling email notifications via after()")

      // Capture variables for closure before after()
      const emailInterventionId = intervention.id

      after(async () => {
        try {
          logger.info({ interventionId: emailInterventionId }, "📧 [EMAIL-NOTIFICATION] Starting email send (via after())")

          // Use Service Role client for email notification service
          const serviceRoleClient = createServiceRoleSupabaseClient()

          // Create all required repositories
          const emailNotificationRepository = new NotificationRepository(serviceRoleClient)
          const emailService = new EmailService()
          const interventionRepository = await createServerInterventionRepository()
          const userRepository = await createServerUserRepository()
          const buildingRepository = await createServerBuildingRepository()
          const lotRepository = await createServerLotRepository()

          // Create the EmailNotificationService
          const emailNotificationService = new EmailNotificationService(
            emailNotificationRepository,
            emailService,
            interventionRepository,
            userRepository,
            buildingRepository,
            lotRepository
          )

          // ✅ Now using await - after() keeps the function alive
          const emailResult = await emailNotificationService.sendInterventionCreatedBatch(
            emailInterventionId,
            'intervention'
          )

          logger.info({
            interventionId: emailInterventionId,
            sentCount: emailResult.sentCount,
            failedCount: emailResult.failedCount,
            success: emailResult.success
          }, "📧 [API] Email notifications completed (via after())")

        } catch (error) {
          logger.error({
            interventionId: emailInterventionId,
            error: error instanceof Error ? error.message : String(error)
          }, "⚠️ [API] Email notifications failed (via after())")
        }
      })
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
