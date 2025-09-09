import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService, lotService, buildingService, contactService, teamService } from '@/lib/database-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

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
      selectedManagerId,
      selectedProviderIds,
      
      // Scheduling
      schedulingType,
      fixedDateTime,
      timeSlots,
      
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
    if (!title || !description || (!selectedBuildingId && !selectedLotId)) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants (titre, description, logement)'
      }, { status: 400 })
    }

    // Get user data from database
    console.log("👤 Getting user data...")
    const user = await userService.getById(authUser.id)
    if (!user) {
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
    let tenantId: string | null = null
    let interventionTeamId = teamId

    if (selectedLotId) {
      // Lot-specific intervention
      lotId = selectedLotId.toString()
      console.log("🏠 Getting lot data for ID:", lotId)
      
      const lot = await lotService.getById(lotId)
      if (!lot) {
        return NextResponse.json({
          success: false,
          error: 'Lot non trouvé'
        }, { status: 404 })
      }

      // Get tenant for this lot if exists
      console.log("👤 Looking for tenant in lot...")
      
      // First check if there's a direct tenant user linked to the lot
      const { data: lotData } = await supabase
        .from('lots')
        .select('tenant_id')
        .eq('id', lotId)
        .single()

      if (lotData?.tenant_id) {
        tenantId = lotData.tenant_id
        console.log("✅ Found tenant from lot.tenant_id:", tenantId)
      } else {
        // Fallback: Look for tenant in lot_contacts
        const { data: tenantContactData } = await supabase
          .from('lot_contacts')
          .select(`
            contacts!inner(
              user_id,
              contact_type
            )
          `)
          .eq('lot_id', lotId)
          .eq('contacts.contact_type', 'locataire')
          .is('end_date', null)
          .maybeSingle()

        if (tenantContactData?.contacts?.user_id) {
          tenantId = tenantContactData.contacts.user_id
          console.log("✅ Found tenant from lot_contacts:", tenantId)
        } else {
          console.log("⚠️ No tenant found for this lot - creating intervention without tenant")
        }
      }

      // Use lot's team if available, otherwise use provided teamId
      if (lot.team_id) {
        interventionTeamId = lot.team_id
      }
    } else if (selectedBuildingId) {
      // Building-wide intervention
      console.log("🏢 Creating building-wide intervention for building ID:", selectedBuildingId)
      
      const building = await buildingService.getById(selectedBuildingId.toString())
      if (!building) {
        return NextResponse.json({
          success: false,
          error: 'Bâtiment non trouvé'
        }, { status: 404 })
      }

      // For building-wide interventions, we need to either:
      // 1. Create a special "building" lot, or 
      // 2. Use the first lot of the building, or
      // 3. Allow lot_id to be null (but this requires schema changes)
      
      // Let's get the first lot of this building to use as reference
      const { data: buildingLots, error: lotsError } = await supabase
        .from('lots')
        .select('id, reference')
        .eq('building_id', selectedBuildingId)
        .limit(1)
        .maybeSingle()

      if (buildingLots) {
        lotId = buildingLots.id
        console.log("✅ Using first lot of building as reference:", lotId)
      } else {
        // If no lots exist for this building, we cannot proceed
        console.error("❌ No lots found for building:", selectedBuildingId)
        return NextResponse.json({
          success: false,
          error: 'Aucun lot trouvé pour ce bâtiment. Veuillez créer au moins un lot pour ce bâtiment.'
        }, { status: 400 })
      }

      // For building-wide interventions, there's typically no specific tenant
      tenantId = null
      
      // Use building's team if available, otherwise use provided teamId
      if (building.team_id) {
        interventionTeamId = building.team_id
      }
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

    // Determine primary assigned contact (prefer provider over manager for assigned_contact_id)
    let primaryContactId: string | null = null
    if (selectedProviderIds && selectedProviderIds.length > 0) {
      primaryContactId = selectedProviderIds[0] // Use first provider as primary
    }

    // Prepare intervention data
    const interventionData = {
      title,
      description,
      type: mapInterventionType(type || ''),
      urgency: mapUrgencyLevel(urgency || ''),
      reference: generateReference(),
      lot_id: lotId,
      tenant_id: tenantId, // Can be null for manager-created interventions
      manager_id: selectedManagerId || authUser.id, // Use selected manager or current user
      assigned_contact_id: primaryContactId,
      team_id: interventionTeamId,
      status: 'validee' as Database['public']['Enums']['intervention_status'], // Manager interventions are pre-validated
      scheduled_date: scheduledDate,
      manager_comment: location ? `Localisation: ${location}` : null,
      requires_quote: expectsQuote || false,
      scheduling_type: schedulingType,
      specific_location: location
    }

    console.log("📝 Creating intervention with data:", interventionData)

    // Create the intervention
    const intervention = await interventionService.create(interventionData)
    console.log("✅ Intervention created:", intervention.id)

    // Handle multiple contact assignments
    console.log("👥 Creating contact assignments...")
    const contactAssignments: Array<{
      intervention_id: string,
      contact_id: string,
      role: string,
      is_primary: boolean,
      individual_message?: string
    }> = []

    // Add manager assignment
    if (selectedManagerId) {
      contactAssignments.push({
        intervention_id: intervention.id,
        contact_id: selectedManagerId,
        role: 'gestionnaire',
        is_primary: true,
        individual_message: messageType === 'individual' ? individualMessages[selectedManagerId] : undefined
      })
    }

    // Add provider assignments
    if (selectedProviderIds && selectedProviderIds.length > 0) {
      selectedProviderIds.forEach((providerId, index) => {
        contactAssignments.push({
          intervention_id: intervention.id,
          contact_id: providerId,
          role: 'prestataire',
          is_primary: index === 0, // First provider is primary
          individual_message: messageType === 'individual' ? individualMessages[providerId] : undefined
        })
      })
    }

    // Insert contact assignments
    if (contactAssignments.length > 0) {
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
        .filter(slot => slot.date && slot.startTime && slot.endTime) // Only valid slots
        .map(slot => ({
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

    // TODO: Handle file uploads if provided
    if (files && files.length > 0) {
      console.log("📎 File handling not yet implemented, files provided:", files.length)
      // This would involve uploading files to Supabase Storage and linking them to the intervention
    }

    // Store additional metadata in manager_comment
    let managerCommentParts = []
    if (selectedBuildingId && !selectedLotId) managerCommentParts.push('Intervention sur bâtiment entier')
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
