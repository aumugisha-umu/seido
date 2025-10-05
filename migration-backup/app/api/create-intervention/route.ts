import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService, tenantService, teamService, buildingService } from '@/lib/database-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  console.log("🔧 create-intervention API route called")
  
  try {
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
    
    if (authError) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({
        success: false,
        error: 'Erreur d\'authentification'
      }, { status: 401 })
    }
    
    if (!authUser) {
      console.error("❌ No authenticated user")
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non authentifié'
      }, { status: 401 })
    }

    console.log("✅ Authenticated user:", authUser.id)

    // Parse the request body (handle both JSON and FormData)
    let body: Record<string, unknown>
    const files: File[] = []
    const fileMetadata: Record<string, unknown>[] = []

    const contentType = request.headers.get('content-type')

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (with files)
      console.log("📝 Processing FormData request")
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
      console.log(`📎 Processing ${fileCount} files from FormData`)

      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file_${i}`) as File
        const metadataString = formData.get(`file_${i}_metadata`) as string

        if (file && metadataString) {
          files.push(file)
          fileMetadata.push(JSON.parse(metadataString))
          console.log(`📎 File ${i}: ${file.name} (${file.size} bytes)`)
        }
      }
    } else {
      // Handle JSON (backward compatibility)
      console.log("📝 Processing JSON request")
      body = await request.json()
      console.log("📝 Request body:", body)

      // Extract file metadata from JSON (if any)
      if (body.files && Array.isArray(body.files)) {
        fileMetadata = body.files
      }
    }

    const {
      title,
      description,
      type,
      urgency,
      lot_id
    } = body

    // Validate required fields
    if (!title || !description || !lot_id) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants (titre, description, lot_id)'
      }, { status: 400 })
    }

    // Get user data from database using auth_user_id
    console.log("👤 Getting user data...")
    let user
    try {
      user = await userService.findByAuthUserId(authUser.id)
      console.log("✅ Found user via findByAuthUserId:", user ? { id: user.id, name: user.name, role: user.role } : 'null')
    } catch (error) {
      console.error("❌ Error with findByAuthUserId:", error)
    }
    
    if (!user) {
      console.error("❌ No user found for auth_user_id:", authUser.id)
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    console.log("✅ User found:", user.name, user.role)

    // Get team ID for the intervention
    let teamId = null

    if (user.role === 'locataire') {
      // Get the team associated with this tenant via their lot
      console.log("👥 Getting tenant's team...")
      const tenantData = await tenantService.getTenantData(user.id)

      // ✅ FIX: Try multiple sources for team ID for independent lots
      if (tenantData?.team_id) {
        // First priority: direct team assignment on the lot
        teamId = tenantData.team_id
        console.log("✅ Found team ID from lot:", _teamId)
      } else if (tenantData?.building_id) {
        // Second priority: team from building (for lots in buildings)
        try {
          const building = await buildingService.getById(tenantData.building_id)
          if (building?.team_id) {
            teamId = building.team_id
            console.log("✅ Found team ID from building:", _teamId)
          }
        } catch (error) {
          console.warn("⚠️ Could not get building details for team ID:", error)
        }
      } else {
        // ✅ NEW: Fallback for independent lots - get team from user's team membership
        console.log("⚠️ Independent lot detected, checking user's team membership...")
        try {
          const userTeams = await teamService.getUserTeams(user.id)
          if (userTeams.length > 0) {
            teamId = userTeams[0].id
            console.log("✅ Found team ID from user membership for independent lot:", _teamId)
          }
        } catch (error) {
          console.warn("⚠️ Could not get user teams for independent lot:", error)
        }
      }
    } else {
      // For other roles, get team from teamService
      console.log("👥 Getting user's team...")
      const userTeams = await teamService.getUserTeams(user.id)
      if (userTeams.length > 0) {
        teamId = userTeams[0].id
        console.log("✅ Found team ID:", _teamId)
      }
    }

    if (!_teamId) {
      console.warn("⚠️ No team found for user, intervention will be created without team association")
    }

    // Map frontend values to database enums
    const mapInterventionType = (_frontendType: string): Database['public']['Enums']['intervention_type'] => {
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

    const mapUrgencyLevel = (_frontendUrgency: string): Database['public']['Enums']['intervention_urgency'] => {
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
      team_id: _teamId,
      status: 'demande' as Database['public']['Enums']['intervention_status']
    }

    console.log("📝 Creating intervention with data:", interventionData)

    // Create the intervention
    const intervention = await interventionService.create(interventionData)
    console.log("✅ Intervention created:", intervention.id)

    // Log successful intervention creation
    if (_teamId) {
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
          console.log("✅ Activity log created for intervention creation:", logResult)
        } else {
          console.error("❌ Failed to create activity log - returned null")
        }
      } catch (error) {
        console.error("❌ Error creating activity log:", error)
      }
    }

    // Auto-assign relevant users to the intervention
    try {
      console.log("👥 Auto-assigning users to intervention...")
      const assignments = await interventionService.autoAssignIntervention(
        intervention.id,
        lot_id || undefined,
        undefined, // buildingId not needed for lot interventions
        teamId || undefined
      )
      console.log("✅ Auto-assignment completed:", assignments?.length || 0, "users assigned")

      // ✅ FIX: Get effective team ID from auto-assignment if original teamId was null
      let effectiveTeamId = teamId
      let shouldUpdateInterventionTeam = false
      if (!effectiveTeamId && assignments && assignments.length > 0) {
        // Try to get team from assigned intervention
        try {
          const { data: interventionWithTeam } = await interventionService.getById(intervention.id)
          if (interventionWithTeam?.team_id) {
            effectiveTeamId = interventionWithTeam.team_id
            console.log("✅ [CREATE-INTERVENTION] Using intervention team_id for notifications:", effectiveTeamId)
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
              console.log("✅ [CREATE-INTERVENTION] Derived team_id from lot for notifications:", effectiveTeamId)
            }
          }
        } catch (error) {
          console.warn("⚠️ [CREATE-INTERVENTION] Could not derive team_id for notifications:", error)
        }
      }

      // ✅ UPDATE: Set team_id on intervention if it was derived
      if (shouldUpdateInterventionTeam && effectiveTeamId) {
        try {
          await interventionService.update(intervention.id, { team_id: effectiveTeamId })
          console.log("✅ [CREATE-INTERVENTION] Updated intervention with derived team_id:", effectiveTeamId)
        } catch (error) {
          console.warn("⚠️ [CREATE-INTERVENTION] Could not update intervention team_id:", error)
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
              console.log('📬 [CREATE-INTERVENTION] Creating personal notification for manager LINKED TO BUILDING/LOT:', {
                userId: assignment.user_id,
                teamId: effectiveTeamId,
                createdBy: user.id,
                isPersonal: true,
                assignmentRole: assignment.role,
                isPrimary: assignment.is_primary
              })
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
                  console.log(`✅ Personal notification created for manager ${assignment.user_id}:`, result.id)
                  return result
                } else {
                  console.error(`❌ Failed to create personal notification for manager ${assignment.user_id}`)
                  return null
                }
              })
            })
          } else {
            console.log('ℹ️ [CREATE-INTERVENTION] No assignments found, skipping personal notifications')
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
                console.log('📬 [CREATE-INTERVENTION] Creating team notification for gestionnaire:', {
                  userId: member.user_id,
                  teamId: effectiveTeamId,
                  createdBy: user.id,
                  isPersonal: false,
                  userRole: member.user?.role
                })
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
                    console.log(`✅ Team notification created for gestionnaire ${member.user_id}:`, result.id)
                    return result
                  } else {
                    console.error(`❌ Failed to create team notification for gestionnaire ${member.user_id}`)
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
            
            console.log(`✅ Notifications summary:`)
            console.log(`   - ${assignments?.length || 0} total users auto-assigned to intervention`)
            console.log(`   - ${personalSuccessful} personal notifications sent (to managers linked to building/lot)`)
            console.log(`   - ${teamSuccessful} team notifications sent (to managers in team NOT linked to building/lot)`)
          } else {
            console.log("⚠️ No team members found for team notifications")
          }
        } catch (notificationError) {
          console.error("❌ Error creating notifications (intervention still created):", notificationError)
        }
      }
      
    } catch (assignmentError) {
      console.error("❌ Error during auto-assignment (intervention still created):", assignmentError)
      // Don't fail the whole creation if assignment fails - the intervention was created successfully
    }

    // Handle file uploads if provided
    if (files && files.length > 0) {
      console.log(`📎 Processing ${files.length} file(s) for intervention...`)

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
            console.log(`📎 Processing file ${i + 1}/${files.length}: ${file.name} (${file.size} bytes)`)

            // Validate file before upload
            const validation = fileService.validateFile(file)
            if (!validation.isValid) {
              console.error(`❌ File validation failed for ${file.name}:`, validation.error)
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

            console.log(`✅ File uploaded successfully: ${file.name}`)
            uploadedDocuments.push(uploadResult.documentRecord)
            filesUploaded++

          } catch (fileError) {
            console.error(`❌ Error uploading file ${file.name}:`, fileError)
            fileErrors.push(`Failed to upload ${file.name}: ${fileError instanceof Error ? fileError.message : String(fileError)}`)
          }
        }

        console.log(`📎 File upload summary: ${filesUploaded} files uploaded successfully, ${fileErrors.length} errors`)

        if (filesUploaded > 0) {
          // Update intervention to mark it as having attachments
          await interventionService.update(intervention.id, {
            has_attachments: true
          })
          console.log("✅ Updated intervention to mark has_attachments = true")
        }

        if (fileErrors.length > 0) {
          console.warn("⚠️ Some files could not be uploaded:", fileErrors)
          // Note: We don't fail the whole creation if some files fail - the intervention was created successfully
        }

      } catch (fileProcessingError) {
        console.error("❌ Error during file processing (intervention still created):", fileProcessingError)
        // Don't fail the whole creation if file processing fails - the intervention was created successfully
      }
    }


    console.log("🎉 Intervention creation completed successfully")

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
    console.error("❌ Error in create-intervention API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la création de l\'intervention'
    }, { status: 500 })
  }
}
