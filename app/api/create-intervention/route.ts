import { NextRequest, NextResponse } from 'next/server'
import { createServerUserService, createServerTenantService, createServerBuildingService, createServerTeamService, createServerInterventionService } from '@/lib/services'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { Database } from '@/lib/database.types'
import { createInterventionSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

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
      user = await userService.findByAuthUserId(authUser.id)
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

    // Get team ID for the intervention
    let teamId = null

    if (user.role === 'locataire') {
      // Get the team associated with this tenant via their lot
      logger.info({}, "👥 Getting tenant's team...")
      const tenantData = await tenantService.getTenantData(user.id)

      // ✅ FIX: Try multiple sources for team ID for independent lots
      if (tenantData?.team_id) {
        // First priority: direct team assignment on the lot
        teamId = tenantData.team_id
        logger.info({ teamId }, "✅ Found team ID from lot")
      } else if (tenantData?.building_id) {
        // Second priority: team from building (for lots in buildings)
        try {
          const building = await buildingService.getById(tenantData.building_id)
          if (building?.team_id) {
            teamId = building.team_id
            logger.info({ teamId }, "✅ Found team ID from building")
          }
        } catch (error) {
          logger.warn({ error }, "⚠️ Could not get building details for team ID")
        }
      } else {
        // ✅ NEW: Fallback for independent lots - get team from user's team membership
        logger.info({}, "⚠️ Independent lot detected, checking user's team membership...")
        try {
          const userTeams = await teamService.getUserTeams(user.id)
          if (userTeams.length > 0) {
            teamId = userTeams[0].id
            logger.info({ teamId }, "✅ Found team ID from user membership for independent lot")
          }
        } catch (error) {
          logger.warn({ error }, "⚠️ Could not get user teams for independent lot")
        }
      }
    } else {
      // For other roles, get team from teamService
      logger.info({}, "👥 Getting user's team...")
      const userTeams = await teamService.getUserTeams(user.id)
      if (userTeams.length > 0) {
        teamId = userTeams[0].id
        logger.info({ teamId }, "✅ Found team ID")
      }
    }

    if (!teamId) {
      logger.warn({}, "⚠️ No team found for user, intervention will be created without team association")
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

    // Prepare intervention data (according to new schema)
    const interventionData = {
      title,
      description,
      type: mapInterventionType(type || ''),
      urgency: mapUrgencyLevel(urgency || ''),
      reference: generateReference(),
      lot_id,
      tenant_id: user.id, // Use the database user ID, not auth ID
      team_id: teamId,
      status: 'demande' as Database['public']['Enums']['intervention_status']
    }

    logger.info({ interventionData }, "📝 Creating intervention with data")

    // Create the intervention
    const intervention = await interventionService.create(interventionData)
    logger.info({ interventionId: intervention.id }, "✅ Intervention created")

    // Log successful intervention creation
    if (teamId) {
      try {
        const { activityLogger } = await import('@/lib/activity-logger')
        
        // Set context BEFORE calling log methods
        activityLogger.setContext({
          userId: user.id,
          teamId: teamId
        })
        
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
          logger.error({}, "❌ Failed to create activity log - returned null")
        }
      } catch (error) {
        logger.error({ error }, "❌ Error creating activity log")
      }
    }

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

      // ✅ FIX: Get effective team ID from auto-assignment if original teamId was null
      let effectiveTeamId = teamId
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

      // Create notifications for assigned users and team members
      if (effectiveTeamId) {
        try {
          const { notificationService } = await import('@/lib/notification-service')
          
          // 1. Créer des notifications PERSONNELLES pour les gestionnaires directement assignés/responsables du bien
          //    Ces gestionnaires sont automatiquement assignés car ils sont liés au lot/bâtiment via lot_contacts/building_contacts
          let personalNotificationPromises: Promise<unknown>[] = []
          
          if (assignments && assignments.length > 0) {
            personalNotificationPromises = assignments
              .filter((assignment: { user_id: string; role: string; is_primary?: boolean }) => 
                assignment.user_id !== user.id && // Don't notify the creator
                assignment.role === 'gestionnaire' // Only managers get personal notifications
              )
              .map((assignment: { user_id: string; role: string; is_primary?: boolean }) => {
              logger.info({
                userId: assignment.user_id,
                teamId: effectiveTeamId,
                createdBy: user.id,
                isPersonal: true,
                assignmentRole: assignment.role,
                isPrimary: assignment.is_primary
              }, '📬 [CREATE-INTERVENTION] Creating personal notification for manager LINKED TO BUILDING/LOT')
              return notificationService.createNotification({
                userId: assignment.user_id,
                teamId: effectiveTeamId,
                createdBy: user.id,
                type: 'intervention',
                priority: intervention.urgency === 'urgente' ? 'urgent' : 
                         intervention.urgency === 'haute' ? 'high' : 'normal',
                title: `Nouvelle intervention créée - ${intervention.title}`,
                message: `Une nouvelle intervention "${intervention.title}" a été créée dans votre secteur et nécessite votre attention.`,
                isPersonal: true, // NOTIFICATION PERSONNELLE
                metadata: { 
                  intervention_id: intervention.id,
                  intervention_type: intervention.type,
                  assignment_role: assignment.role,
                  is_primary: assignment.is_primary
                },
                relatedEntityType: 'intervention',
                relatedEntityId: intervention.id
              }).then(result => {
                if (result) {
                  logger.info({ userId: assignment.user_id, notificationId: result.id }, "✅ Personal notification created for manager")
                  return result
                } else {
                  logger.error({ userId: assignment.user_id }, "❌ Failed to create personal notification for manager")
                  return null
                }
              })
            })
          } else {
            logger.info({}, 'ℹ️ [CREATE-INTERVENTION] No assignments found, skipping personal notifications')
          }

          // 2. Créer une notification D'ÉQUIPE pour les gestionnaires de l'équipe NON assignés au bien
          //    Ces gestionnaires font partie de l'équipe mais ne sont PAS liés au lot/bâtiment spécifique
          //    Ils reçoivent une notification informative (pas personnelle) pour rester au courant
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select(`
              user_id,
              user:user_id(
                id,
                role
              )
            `)
            .eq('team_id', effectiveTeamId)
          
          if (teamMembers && teamMembers.length > 0) {
            const teamNotificationPromises = teamMembers
              .filter(member => 
                member.user_id !== user.id && // Don't notify the creator
                member.user?.role === 'gestionnaire' && // Only gestionnaires
                !(assignments && assignments.some((assignment: { user_id: string }) => assignment.user_id === member.user_id)) // Don't double-notify assigned users (those linked to the building/lot)
              )
              .map(member => {
                logger.info({
                  userId: member.user_id,
                  teamId: effectiveTeamId,
                  createdBy: user.id,
                  isPersonal: false,
                  userRole: member.user?.role
                }, '📬 [CREATE-INTERVENTION] Creating team notification for gestionnaire')
                return notificationService.createNotification({
                  userId: member.user_id,
                  teamId: effectiveTeamId,
                  createdBy: user.id,
                  type: 'intervention',
                  priority: intervention.urgency === 'urgente' ? 'urgent' : 
                           intervention.urgency === 'haute' ? 'high' : 'normal',
                  title: `Nouvelle intervention dans l'équipe - ${intervention.title}`,
                  message: `Une nouvelle intervention "${intervention.title}" a été créée dans votre équipe.`,
                  isPersonal: false, // NOTIFICATION D'ÉQUIPE
                  metadata: { 
                    intervention_id: intervention.id,
                    intervention_type: intervention.type
                  },
                  relatedEntityType: 'intervention',
                  relatedEntityId: intervention.id
                }).then(result => {
                  if (result) {
                    logger.info({ userId: member.user_id, notificationId: result.id }, "✅ Team notification created for gestionnaire")
                    return result
                  } else {
                    logger.error({ userId: member.user_id }, "❌ Failed to create team notification for gestionnaire")
                    return null
                  }
                })
              })

            // Attendre toutes les notifications (personnelles + équipe)
            const [personalResults, teamResults] = await Promise.all([
              Promise.all(personalNotificationPromises),
              Promise.all(teamNotificationPromises)
            ])

            const personalSuccessful = personalResults.filter(result => result !== null).length
            const teamSuccessful = teamResults.filter(result => result !== null).length
            
            logger.info({}, "✅ Notifications summary:")
            logger.info({ count: assignments?.length || 0 }, "   - total users auto-assigned to intervention")
            logger.info({ count: personalSuccessful }, "   - personal notifications sent (to managers linked to building/lot)")
            logger.info({ count: teamSuccessful }, "   - team notifications sent (to managers in team NOT linked to building/lot)")
          } else {
            logger.info({}, "⚠️ No team members found for team notifications")
          }
        } catch (notificationError) {
          logger.error({ error: notificationError }, "❌ Error creating notifications (intervention still created)")
        }
      }

    } catch (assignmentError) {
      logger.error({ error: assignmentError }, "❌ Error during auto-assignment (intervention still created)")
      // Don't fail the whole creation if assignment fails - the intervention was created successfully
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

            // Upload file to storage and create database record
            const uploadResult = await fileService.uploadInterventionDocument(supabase, file, {
              interventionId: intervention.id,
              uploadedBy: user.id, // Use database user ID
              documentType: 'intervention_photo', // Could be made dynamic based on file type
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
          await interventionService.update(intervention.id, {
            has_attachments: true
          })
          logger.info({}, "✅ Updated intervention to mark has_attachments = true")
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


    logger.info({}, "🎉 Intervention creation completed successfully")

    return NextResponse.json({
      success: true,
      intervention: {
        id: intervention.id,
        title: intervention.title,
        status: intervention.status,
        created_at: intervention.created_at
      },
      message: 'Intervention créée avec succès'
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
