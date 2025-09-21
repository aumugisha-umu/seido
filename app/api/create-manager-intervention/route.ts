import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService, lotService, buildingService, contactService, teamService } from '@/lib/database-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

// Helper function to determine document type from file type and name
function getDocumentType(mimeType: string, filename: string): string {
  const lowerFilename = filename.toLowerCase()
  
  // Photos
  if (mimeType.startsWith('image/')) {
    if (lowerFilename.includes('avant')) return 'photo_avant'
    if (lowerFilename.includes('apres') || lowerFilename.includes('après')) return 'photo_apres'
    return 'photo_avant' // Default for images
  }
  
  // Documents
  if (mimeType === 'application/pdf') {
    if (lowerFilename.includes('rapport')) return 'rapport'
    if (lowerFilename.includes('facture')) return 'facture'
    if (lowerFilename.includes('devis')) return 'devis'
    if (lowerFilename.includes('plan')) return 'plan'
    if (lowerFilename.includes('certificat')) return 'certificat'
    if (lowerFilename.includes('garantie')) return 'garantie'
  }
  
  // Spreadsheets and documents
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    if (lowerFilename.includes('devis')) return 'devis'
    if (lowerFilename.includes('facture')) return 'facture'
  }
  
  return 'autre' // Default type
}

export async function POST(request: NextRequest) {
  console.log("🔧 create-manager-intervention API route called")
  
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
    
    if (authError || !authUser) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({
        success: false,
        error: 'Erreur d\'authentification'
      }, { status: 401 })
    }

    console.log("✅ Authenticated user:", authUser.id)

    // Parse the request body
    const body = await request.json()
    console.log("📝 Request body:", body)
    
    const {
      // Basic intervention data
      title,
      description,
      type,
      urgency,
      location,
      
      // Housing selection
      selectedLogement,
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
    console.log("🔍 Validating required fields:", { 
      title: !!title, 
      description: !!description, 
      selectedManagerIds: selectedManagerIds?.length || 0,
      hasLogement: !!(selectedBuildingId || selectedLotId) 
    })
    
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
    console.log("👤 Getting user data...")
    console.log("👤 Looking for user with auth_user_id:", authUser.id)
    
    // ✅ Utiliser findByAuthUserId au lieu de getById pour la nouvelle structure DB
    let user
    try {
      user = await userService.findByAuthUserId(authUser.id)
      console.log("✅ Found user via findByAuthUserId:", user ? { id: user.id, name: user.name, role: user.role } : 'null')
    } catch (error) {
      console.error("❌ Error with findByAuthUserId, trying getById:", error)
      // Fallback: essayer avec getById au cas où
      try {
        user = await userService.getById(authUser.id)
        console.log("✅ Found user via getById fallback:", user ? { id: user.id, name: user.name, role: user.role } : 'null')
      } catch (fallbackError) {
        console.error("❌ Both methods failed:", fallbackError)
      }
    }
    
    if (!user) {
      console.error("❌ No user found for auth_user_id:", authUser.id)
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    if (user.role !== 'gestionnaire') {
      return NextResponse.json({
        success: false,
        error: 'Accès réservé aux gestionnaires'
      }, { status: 403 })
    }

    console.log("✅ Manager user found:", user.name, user.role)

    // Determine if this is a building or lot intervention
    let lotId: string | null = null
    let buildingId: string | null = null
    let tenantId: string | null = null
    let interventionTeamId = teamId

    if (selectedLotId) {
      // Lot-specific intervention
      lotId = selectedLotId.toString()
      console.log("🏠 Creating lot-specific intervention for lot ID:", lotId)
      
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
      console.log("👤 Looking for tenant in lot...")
      
      // ✅ Utiliser uniquement lot_contacts (nouvelle architecture)
      console.log("🔄 Using only lot_contacts for tenant lookup...")
      
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
            console.log("✅ Found tenant from lot_contacts:", tenantId)
          } else {
            console.log("ℹ️ No tenant found in lot_contacts")
          }
        } else {
          console.log("ℹ️ No contacts found for this lot")
        }
      }

      // Use lot's team if available, otherwise use provided teamId
      if (lot.team_id) {
        interventionTeamId = lot.team_id
      }
    } else if (selectedBuildingId) {
      // Building-wide intervention
      buildingId = selectedBuildingId.toString()
      console.log("🏢 Creating building-wide intervention for building ID:", buildingId)
      
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

      console.log("✅ Building-wide intervention will be linked directly to building")
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
    console.log("📝 Preparing intervention data with multiple managers:", selectedManagerIds)
    
    // ✅ LOGIQUE MÉTIER: Déterminer le statut selon les règles de création par gestionnaire
    let interventionStatus: Database['public']['Enums']['intervention_status']
    
    console.log("🔍 Analyse des conditions pour déterminer le statut:", {
      hasProviders: selectedProviderIds && selectedProviderIds.length > 0,
      expectsQuote,
      hasTenant: !!tenantId,
      onlyOneManager: selectedManagerIds.length === 1,
      noProviders: !selectedProviderIds || selectedProviderIds.length === 0,
      schedulingType,
      hasFixedDateTime: schedulingType === 'fixed' && fixedDateTime?.date && fixedDateTime?.time
    })
    
    // CAS 1: Demande de devis si prestataires assignés + devis requis
    if (selectedProviderIds && selectedProviderIds.length > 0 && expectsQuote) {
      interventionStatus = 'demande_de_devis'
      console.log("✅ Statut déterminé: DEMANDE_DE_DEVIS (prestataires + devis requis)")
      
    // CAS 2: Planifiée directement si conditions strictes remplies
    } else if (
      !tenantId && // Pas de locataire dans le bien
      selectedManagerIds.length === 1 && // Que le gestionnaire créateur
      (!selectedProviderIds || selectedProviderIds.length === 0) && // Pas de prestataires
      schedulingType === 'fixed' && // Date/heure fixe
      fixedDateTime?.date && fixedDateTime?.time // Date et heure définies
    ) {
      interventionStatus = 'planifiee'
      console.log("✅ Statut déterminé: PLANIFIEE (pas locataire + seul gestionnaire + date fixe)")
      
    // CAS 3: Planification dans tous les autres cas
    } else {
      interventionStatus = 'planification'
      console.log("✅ Statut déterminé: PLANIFICATION (cas par défaut)")
    }
    
    const interventionData: any = {
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

    console.log("📝 Creating intervention with data:", interventionData)

    // Create the intervention
    const intervention = await interventionService.create(interventionData)
    console.log("✅ Intervention created:", intervention.id)

    // Handle multiple contact assignments
    console.log("👥 Creating contact assignments...")
    console.log("👥 Selected managers:", selectedManagerIds.length)
    console.log("👥 Selected providers:", selectedProviderIds?.length || 0)
    
    const contactAssignments: Array<{
      intervention_id: string,
      user_id: string, // ✅ Correction: c'est user_id, pas contact_id
      role: string,
      is_primary: boolean,
      individual_message?: string
    }> = []

    // ✅ Add all manager assignments
    selectedManagerIds.forEach((managerId: string, index: number) => {
      console.log(`👥 Adding manager assignment ${index + 1}:`, managerId)
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
        console.log(`🔧 Adding provider assignment ${index + 1}:`, providerId)
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
      console.log("📝 Creating contact assignments:", contactAssignments.length)
      const { error: assignmentError } = await supabase
        .from('intervention_contacts')
        .insert(contactAssignments)

      if (assignmentError) {
        console.error("⚠️ Error creating contact assignments:", assignmentError)
        // Don't fail the entire operation, just log the error
      } else {
        console.log("✅ Contact assignments created:", contactAssignments.length)
      }
    }

    // Handle scheduling slots if provided
    if (schedulingType === 'slots' && timeSlots && timeSlots.length > 0) {
      console.log("📅 Creating time slots:", timeSlots.length)
      
      const timeSlotsToInsert = timeSlots
        .filter((slot: any) => slot.date && slot.startTime && slot.endTime) // Only valid slots
        .map((slot: any) => ({
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
          console.error("⚠️ Error creating time slots:", slotsError)
        } else {
          console.log("✅ Time slots created:", timeSlotsToInsert.length)
        }
      }
    }

    // ✅ Handle manager availabilities if provided (gestionnaire's own availability)
    if (managerAvailabilities && managerAvailabilities.length > 0) {
      console.log("📅 Processing manager availabilities:", managerAvailabilities.length)

      try {
        // Validate and prepare manager availability data
        const validatedAvailabilities = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (const avail of managerAvailabilities) {
          const { date, startTime, endTime } = avail

          // Basic validation
          if (!date || !startTime || !endTime) {
            console.warn("⚠️ Skipping invalid manager availability:", avail)
            continue
          }

          // Validate date is not in the past
          const availDate = new Date(date)
          if (isNaN(availDate.getTime()) || availDate < today) {
            console.warn("⚠️ Skipping past date manager availability:", date)
            continue
          }

          // Validate time format
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
          if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            console.warn("⚠️ Skipping invalid time format:", startTime, endTime)
            continue
          }

          // Validate start < end
          const [startHour, startMin] = startTime.split(':').map(Number)
          const [endHour, endMin] = endTime.split(':').map(Number)
          if (startHour > endHour || (startHour === endHour && startMin >= endMin)) {
            console.warn("⚠️ Skipping invalid time range:", startTime, endTime)
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
            console.error("❌ Error saving manager availabilities:", availError)
            // Don't fail the whole intervention creation, just log the error
          } else {
            console.log("✅ Manager availabilities saved:", savedAvailabilities.length)
          }
        } else {
          console.log("ℹ️ No valid manager availabilities to save")
        }
      } catch (availabilityError) {
        console.error("❌ Error processing manager availabilities:", availabilityError)
        // Don't fail the intervention creation for availability errors
      }
    }

    // Handle file uploads if provided
    if (files && files.length > 0) {
      console.log("📎 Processing file uploads:", files.length)
      
      try {
        // Store file information for later processing
        // Note: Actual file upload will be handled by separate API calls from the frontend
        // This is because FormData with files needs special handling in Next.js
        console.log("📝 Files will be uploaded separately via upload API")
        console.log("Files to upload:", files.map((f: any) => ({ name: f.name, size: f.size, type: f.type })))
        
        // We'll return the file information so the frontend can handle the uploads
        // The frontend will call /api/upload-intervention-document for each file
        
      } catch (error) {
        console.error("❌ Error handling file information:", error)
        // Don't fail the entire intervention creation for file handling errors
      }
    }

    // Store additional metadata in manager_comment
    let managerCommentParts = []
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

    console.log("🎉 Manager intervention creation completed successfully")

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
    console.error("❌ Error in create-manager-intervention API:", error)
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
