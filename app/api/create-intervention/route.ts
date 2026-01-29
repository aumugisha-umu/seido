import { NextRequest, NextResponse, after } from 'next/server'
import { createServerUserService, createServerTenantService, createServerBuildingService, createServerTeamService, createServerInterventionService, ConversationRepository } from '@/lib/services'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { Database } from '@/lib/database.types'
import { createInterventionSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { mapInterventionType, mapUrgencyLevel } from '@/lib/utils/intervention-mappers'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'

export async function POST(request: NextRequest) {
  logger.info({}, "🔧 create-intervention API route called")

  try {
    // ✅ AUTH: createServerClient pattern → getApiAuthContext (42 lignes → 6 lignes)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, authUser } = authResult.data

    // Initialize services
    const userService = await createServerUserService()
    const tenantService = await createServerTenantService()
    const buildingService = await createServerBuildingService()
    const teamService = await createServerTeamService()
    const interventionService = await createServerInterventionService()

    logger.info({ userId: authUser.id }, "✅ Authenticated user")

    // Parse the request body (handle both JSON and FormData)
    let body: Record<string, unknown>
    const files: File[] = []
    const fileMetadata: Record<string, unknown>[] = []

    const contentType = request.headers.get('content-type')

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (with files)
      logger.info({}, "📝 Processing FormData request")
      const formData = await request.formData()

      // Extract intervention data
      const interventionDataString = formData.get('interventionData') as string
      if (!interventionDataString) {
        return NextResponse.json({
          success: false,
          error: 'Missing intervention data'
        }, { status: 400 })
      }

      body = JSON.parse(interventionDataString)

      // Extract files
      const fileCount = parseInt(formData.get('fileCount') as string || '0')
      logger.info({ fileCount }, "📎 Processing files from FormData")

      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file_${i}`) as File
        const metadataString = formData.get(`file_${i}_metadata`) as string

        if (file && metadataString) {
          files.push(file)
          fileMetadata.push(JSON.parse(metadataString))
          logger.info({ fileIndex: i, fileName: file.name, fileSize: file.size }, "📎 File from FormData")
        }
      }
    } else {
      // Handle JSON (backward compatibility)
      logger.info({}, "📝 Processing JSON request")
      body = await request.json()
      logger.info({ body }, "📝 Request body")

      // Extract file metadata from JSON (if any)
      if (body.files && Array.isArray(body.files)) {
        fileMetadata = body.files
      }
    }

    // ✅ ZOD VALIDATION: Type-safe input validation avec sécurité renforcée
    const validation = validateRequest(createInterventionSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [CREATE-INTERVENTION] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const {
      title,
      description,
      type,
      urgency,
      lot_id
    } = validation.data

    // Get user data from database using auth_user_id
    logger.info({}, "👤 Getting user data...")
    let user
    try {
      const userResult = await userService.findByAuthUserId(authUser.id)
      if (userResult?.success === false) {
        logger.error({ error: userResult.error }, "❌ findByAuthUserId returned error")
      }
      user = userResult?.data ?? null
      logger.info({ user: user ? { id: user.id, name: user.name, role: user.role } : null }, "✅ Found user via findByAuthUserId")
    } catch (error) {
      logger.error({ error }, "❌ Error with findByAuthUserId")
    }

    if (!user) {
      logger.error({ authUserId: authUser.id }, "❌ No user found for auth_user_id")
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    logger.info({ name: user.name, role: user.role }, "✅ User found")

    // ✅ Get teamId from request body (same pattern as manager)
    const { teamId } = body

    if (!teamId) {
      logger.error({}, "❌ CRITICAL: No teamId provided in request")
      return NextResponse.json({
        success: false,
        error: 'L\'équipe est requise pour créer une intervention'
      }, { status: 400 })
    }

    logger.info({ teamId, source: 'request_body' }, "✅ Using teamId from request")

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

    // Prepare intervention data (according to new schema)
    const interventionData = {
      title,
      description,
      type: mapInterventionType(type || ''),
      urgency: mapUrgencyLevel(urgency || ''),
      reference: generateReference(),
      lot_id,
      // ✅ tenant_id REMOVED - tenant relationship via intervention_assignments
      team_id: teamId,
      status: 'demande' as Database['public']['Enums']['intervention_status'],
      // ✅ FIX 2025-12-24: Ajout created_by pour exclure le créateur des notifications email
      created_by: user.id
    }

    logger.info({ interventionData }, "📝 Creating intervention (step 1/3: INSERT only)")

    // ✅ STEP 1: Create intervention WITHOUT SELECT (to avoid RLS block before assignment)
    const result = await interventionService.create(interventionData, user.id, {
      skipInitialSelect: true  // Don't SELECT immediately, we'll do it after creating assignment
    })

    if (!result.success || !result.data) {
      logger.error({ error: result.error }, "❌ Failed to create intervention")
      return NextResponse.json({
        success: false,
        error: result.error?.message || 'Failed to create intervention'
      }, { status: 500 })
    }

    const interventionId = result.data.id
    logger.info({ interventionId }, "✅ Intervention INSERT successful (ID only)")

    // ✅ STEP 2: Create intervention_assignments for tenant IMMEDIATELY (before SELECT)
    // Now that CHECK constraint is fixed (migration 20251024192745), we can use normal client with RLS
    try {
      logger.info({ userId: user.id, interventionId }, "👤 Creating tenant assignment (step 2/3)...")

      const { error: tenantAssignError } = await supabase
        .from('intervention_assignments')
        .insert({
          intervention_id: interventionId,
          user_id: user.id,
          role: 'locataire',
          is_primary: true,
          assigned_by: user.id,
          assigned_at: new Date().toISOString()
        })

      if (tenantAssignError) {
        logger.error({ error: tenantAssignError }, "❌ Failed to create tenant assignment")
        // This is critical - without assignment, tenant can't view intervention
        return NextResponse.json({
          success: false,
          error: 'Erreur lors de l\'assignation du locataire à l\'intervention'
        }, { status: 500 })
      }

      logger.info({}, "✅ Tenant assignment created successfully")
    } catch (error) {
      logger.error({ error }, "❌ Error creating tenant assignment")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de l\'assignation du locataire'
      }, { status: 500 })
    }

    // ✅ STEP 2.5: CREATE CONVERSATION THREADS (BEFORE auto-assignments)
    // Threads must be created BEFORE auto-assignments so that triggers can populate participants
    try {
      logger.info({ interventionId }, "💬 Creating conversation threads...")

      // Use Service Role to bypass RLS for thread creation
      const serviceClientForThreads = createServiceRoleSupabaseClient()
      const conversationRepo = new ConversationRepository(serviceClientForThreads)

      // Create GROUP thread (all participants - general discussion)
      const groupThreadResult = await conversationRepo.createThread({
        intervention_id: interventionId,
        thread_type: 'group',
        title: 'Discussion générale',
        created_by: user.id,
        team_id: teamId
      })

      if (groupThreadResult.success) {
        logger.info({ threadId: groupThreadResult.data?.id, type: 'group' }, "✅ Group thread created")
      } else {
        logger.error({ error: groupThreadResult.error }, "⚠️ Failed to create group thread")
      }

      // Create TENANT_TO_MANAGERS thread (for tenant-manager communication)
      const tenantThreadResult = await conversationRepo.createThread({
        intervention_id: interventionId,
        thread_type: 'tenant_to_managers',
        title: 'Communication avec les gestionnaires',
        created_by: user.id,
        team_id: teamId
      })

      if (tenantThreadResult.success) {
        logger.info({ threadId: tenantThreadResult.data?.id, type: 'tenant_to_managers' }, "✅ Tenant thread created")
      } else {
        logger.error({ error: tenantThreadResult.error }, "⚠️ Failed to create tenant thread")
      }

      // Create PROVIDER_TO_MANAGERS thread (for provider-manager communication)
      const providerThreadResult = await conversationRepo.createThread({
        intervention_id: interventionId,
        thread_type: 'provider_to_managers',
        title: 'Communication avec les prestataires',
        created_by: user.id,
        team_id: teamId
      })

      if (providerThreadResult.success) {
        logger.info({ threadId: providerThreadResult.data?.id, type: 'provider_to_managers' }, "✅ Provider thread created")
      } else {
        logger.error({ error: providerThreadResult.error }, "⚠️ Failed to create provider thread")
      }

      // ✅ Add tenant as explicit participant to relevant threads
      // Note: Tenant assignment was created BEFORE threads, so trigger didn't add them
      // We need to manually add the tenant to the group thread and tenant_to_managers thread
      const threadsToAddTenant = [
        groupThreadResult.data?.id,
        tenantThreadResult.data?.id
      ].filter(Boolean)

      for (const threadId of threadsToAddTenant) {
        await conversationRepo.addParticipant(threadId!, user.id)
      }
      logger.info({ threadCount: threadsToAddTenant.length }, "✅ Tenant added to conversation threads")

      logger.info({ interventionId }, "✅ Conversation threads creation completed")
    } catch (threadError) {
      logger.error({ error: threadError }, "❌ Error creating conversation threads (non-blocking)")
      // Don't fail the entire operation for thread creation errors
    }

    // ✅ STEP 3: NOW fetch complete intervention (RLS will allow it thanks to assignment)
    logger.info({ interventionId }, "📥 Fetching complete intervention (step 3/3)...")

    const { data: intervention, error: fetchError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single()

    if (fetchError || !intervention) {
      logger.error({ error: fetchError }, "❌ Failed to fetch intervention after assignment")
      return NextResponse.json({
        success: false,
        error: 'Intervention créée mais impossible de la récupérer'
      }, { status: 500 })
    }

    logger.info({ interventionId: intervention.id }, "✅ Intervention fetched successfully")

    // Log successful intervention creation
    if (teamId) {
      try {
        logger.info({ userId: user.id, teamId, userName: user.name }, "📝 Attempting to create activity log...")
        
        // ✅ FIX: Use factory function to create proper server instance instead of legacy singleton
        const { createActivityLogger } = await import('@/lib/activity-logger')
        const activityLogger = await createActivityLogger()
        
        // Set context BEFORE calling log methods
        activityLogger.setContext({
          userId: user.id,
          teamId: teamId
        })
        
        logger.info({ interventionId: intervention.id, reference: intervention.reference }, "📝 Calling logInterventionAction...")
        
        const logResult = await activityLogger.logInterventionAction(
          'create',
          intervention.id,
          intervention.reference,
          {
            title: intervention.title,
            type: intervention.type,
            urgency: intervention.urgency,
            status: intervention.status,
            lot_id: intervention.lot_id,
            tenant_name: user.name,
            created_by_role: user.role
          }
        )
        
        if (logResult) {
          logger.info({ logResult }, "✅ Activity log created for intervention creation")
        } else {
          logger.error({ userId: user.id, teamId }, "❌ Failed to create activity log - returned null (check console for details)")
        }
      } catch (error) {
        logger.error({ error, userId: user.id, teamId }, "❌ Exception while creating activity log")
      }
    } else {
      logger.warn({ userId: user.id }, "⚠️ No teamId available, skipping activity log creation")
    }

    // ✅ FIX: Initialize effectiveTeamId BEFORE auto-assignment (so notifications work even if auto-assignment fails)
    let effectiveTeamId = teamId

    // Auto-assign relevant users to the intervention
    try {
      logger.info({}, "👥 Auto-assigning users to intervention...")
      const assignments = await interventionService.autoAssignIntervention(
        intervention.id,
        lot_id || undefined,
        undefined, // buildingId not needed for lot interventions
        teamId || undefined
      )
      logger.info({ assignmentCount: assignments?.length || 0 }, "✅ Auto-assignment completed")

      // Get effective team ID from auto-assignment if original teamId was null
      let shouldUpdateInterventionTeam = false
      if (!effectiveTeamId && assignments && assignments.length > 0) {
        // Try to get team from assigned intervention
        try {
          const { data: interventionWithTeam } = await interventionService.getById(intervention.id)
          if (interventionWithTeam?.team_id) {
            effectiveTeamId = interventionWithTeam.team_id
            logger.info({ effectiveTeamId }, "✅ [CREATE-INTERVENTION] Using intervention team_id for notifications")
          } else {
            // Fallback: derive team from lot (same logic as auto-assignment)
            const { data: lotTeam } = await supabase
              .from('lots')
              .select('team_id')
              .eq('id', lot_id)
              .single()

            if (lotTeam?.team_id) {
              effectiveTeamId = lotTeam.team_id
              shouldUpdateInterventionTeam = true
              logger.info({ effectiveTeamId }, "✅ [CREATE-INTERVENTION] Derived team_id from lot for notifications")
            }
          }
        } catch (error) {
          logger.warn({ error }, "⚠️ [CREATE-INTERVENTION] Could not derive team_id for notifications")
        }
      }

      // ✅ UPDATE: Set team_id on intervention if it was derived
      if (shouldUpdateInterventionTeam && effectiveTeamId) {
        try {
          await interventionService.update(intervention.id, { team_id: effectiveTeamId })
          logger.info({ effectiveTeamId }, "✅ [CREATE-INTERVENTION] Updated intervention with derived team_id")
        } catch (error) {
          logger.warn({ error }, "⚠️ [CREATE-INTERVENTION] Could not update intervention team_id")
        }
      }

      // ✅ NOTE: Tenant assignment already created BEFORE (step 2/3, line 210-241)
      // This ensures RLS allows SELECT immediately after INSERT

    } catch (assignmentError) {
      logger.error({ error: assignmentError }, "❌ Error during auto-assignment (intervention still created)")
      // Don't fail the whole creation if assignment fails - the intervention was created successfully
    }

    // ✅ NOTIFICATIONS: Now OUTSIDE the auto-assignment try-catch block
    // This ensures notifications are sent even if auto-assignment fails
    if (effectiveTeamId) {
      // Create in-app notifications for gestionnaires
      try {
        const { createInterventionNotification } = await import('@/app/actions/notification-actions')

        logger.info({ interventionId: intervention.id }, '📬 [CREATE-INTERVENTION] Creating intervention notifications via Server Action')

        const notifResult = await createInterventionNotification(intervention.id)

        if (notifResult.success) {
          logger.info({
            count: notifResult.data?.length || 0
          }, "✅ Intervention notifications created successfully")
        } else {
          logger.error({ error: notifResult.error }, "❌ Failed to create notifications (intervention still created)")
        }
      } catch (notificationError) {
        logger.error({ error: notificationError }, "❌ Error creating notifications (intervention still created)")
      }
    } else {
      logger.warn({ interventionId: intervention.id }, "⚠️ [CREATE-INTERVENTION] No teamId available, skipping notifications")
    }

    // Handle file uploads if provided
    if (files && files.length > 0) {
      logger.info({ fileCount: files.length }, "📎 Processing file(s) for intervention...")

      try {
        const { fileService } = await import('@/lib/file-service')

        let filesUploaded = 0
        const fileErrors: string[] = []
        const uploadedDocuments: unknown[] = []

        // Process each file
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const metadata = fileMetadata[i] || {}

          try {
            logger.info({ fileNumber: i + 1, totalFiles: files.length, fileName: file.name, fileSize: file.size }, "📎 Processing file")

            // Validate file before upload
            const validation = fileService.validateFile(file)
            if (!validation.isValid) {
              logger.error({ fileName: file.name, error: validation.error }, "❌ File validation failed")
              fileErrors.push(`${file.name}: ${validation.error}`)
              continue
            }

            // Get document type from metadata or use default
            const documentType = (metadata as { documentType?: string }).documentType || 'photo_avant'

            // Upload file to storage and create database record
            const uploadResult = await fileService.uploadInterventionDocument(supabase, file, {
              interventionId: intervention.id,
              uploadedBy: user.id,
              teamId: intervention.team_id,
              documentType: documentType as Database['public']['Enums']['intervention_document_type'],
              description: `File uploaded during intervention creation: ${file.name}`
            })

            logger.info({ fileName: file.name }, "✅ File uploaded successfully")
            uploadedDocuments.push(uploadResult.documentRecord)
            filesUploaded++

          } catch (fileError) {
            logger.error({ fileName: file.name, error: fileError }, "❌ Error uploading file")
            fileErrors.push(`Failed to upload ${file.name}: ${fileError instanceof Error ? fileError.message : String(fileError)}`)
          }
        }

        logger.info({ filesUploaded, errorCount: fileErrors.length }, "📎 File upload summary")

        if (filesUploaded > 0) {
          // Update intervention to mark it as having attachments
          try {
            const updateResult = await interventionService.update(intervention.id, {
              has_attachments: true
            })
            if (updateResult.success) {
              logger.info({}, "✅ Updated intervention to mark has_attachments = true")
            } else {
              logger.warn({ error: updateResult.error }, "⚠️ Could not update intervention has_attachments flag (non-critical)")
            }
          } catch (error) {
            logger.warn({ error }, "⚠️ Error updating intervention has_attachments flag (non-critical)")
            // Don't fail the entire operation for this
          }
        }

        if (fileErrors.length > 0) {
          logger.warn({ fileErrors }, "⚠️ Some files could not be uploaded")
          // Note: We don't fail the whole creation if some files fail - the intervention was created successfully
        }

      } catch (fileProcessingError) {
        logger.error({ error: fileProcessingError }, "❌ Error during file processing (intervention still created)")
        // Don't fail the whole creation if file processing fails - the intervention was created successfully
      }
    }

    // ✅ SEND EMAIL NOTIFICATIONS to gestionnaires and prestataires (via after())
    // NOTE: This is done AFTER file uploads so that attachments are included in the emails
    if (effectiveTeamId) {
      // Capture variables for after() closure
      const emailInterventionId = intervention.id
      const emailExcludeUserId = user.id

      after(async () => {
        try {
          const { EmailNotificationService } = await import('@/lib/services/domain/email-notification.service')
          const { EmailService } = await import('@/lib/services/domain/email.service')
          const {
            createServerNotificationRepository,
            createServerInterventionRepository,
            createServerUserRepository,
            createServerBuildingRepository,
            createServerLotRepository
          } = await import('@/lib/services')

          // Use factory functions (same pattern as notifyInterventionStatusChange)
          const notificationRepo = await createServerNotificationRepository()
          const interventionRepo = await createServerInterventionRepository()
          const userRepo = await createServerUserRepository()
          const buildingRepo = await createServerBuildingRepository()
          const lotRepo = await createServerLotRepository()
          const emailService = new EmailService()

          const emailNotificationService = new EmailNotificationService(
            notificationRepo,
            emailService,
            interventionRepo,
            userRepo,
            buildingRepo,
            lotRepo
          )

          logger.info({ interventionId: emailInterventionId }, '📧 [CREATE-INTERVENTION] Sending email notifications (via after())')

          const emailResult = await emailNotificationService.sendInterventionEmails({
            interventionId: emailInterventionId,
            eventType: 'created',
            excludeUserId: emailExcludeUserId  // Don't email the creator (locataire)
          })

          logger.info({
            interventionId: emailInterventionId,
            emailsSent: emailResult.sentCount,
            emailsFailed: emailResult.failedCount
          }, '✅ [API] Email notifications completed (via after())')
        } catch (emailError) {
          // Don't fail the creation if emails fail
          logger.error({ error: emailError }, '⚠️ [API] Email notifications failed (via after())')
        }
      })
    }

    logger.info({}, "🎉 Intervention creation completed successfully")

    // ⚡ NO-CACHE: Mutations ne doivent pas être cachées
    return NextResponse.json({
      success: true,
      intervention: {
        id: intervention.id,
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
    logger.error({ error }, "❌ Error in create-intervention API")
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
