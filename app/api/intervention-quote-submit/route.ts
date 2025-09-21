import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  console.log("✅ intervention-quote-submit API route called")

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

    // Parse request body
    const body = await request.json()
    const {
      interventionId,
      laborCost,
      materialsCost = 0,
      description,
      workDetails,
      estimatedDurationHours,
      estimatedStartDate,
      termsAndConditions,
      attachments = []
    } = body

    if (!interventionId || !laborCost || !description) {
      return NextResponse.json({
        success: false,
        error: 'interventionId, laborCost et description sont requis'
      }, { status: 400 })
    }

    console.log("📝 Submitting quote for intervention:", interventionId)

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is prestataire
    if (user.role !== 'prestataire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les prestataires peuvent soumettre des devis'
      }, { status: 403 })
    }

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(id, reference, building:building_id(name, address, team_id)),
        team:team_id(id, name)
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      console.error("❌ Intervention not found:", interventionError)
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if intervention is in quote request status
    if (intervention.status !== 'demande_de_devis') {
      return NextResponse.json({
        success: false,
        error: `Un devis ne peut être soumis que pour les interventions en demande de devis (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user is assigned to this intervention
    const { data: assignment, error: assignmentError } = await supabase
      .from('intervention_contacts')
      .select('*')
      .eq('intervention_id', interventionId)
      .eq('user_id', user.id)
      .eq('role', 'prestataire')
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas assigné à cette intervention'
      }, { status: 403 })
    }

    // Validate costs
    const laborCostNum = parseFloat(laborCost)
    const materialsCostNum = parseFloat(materialsCost || 0)

    if (isNaN(laborCostNum) || laborCostNum < 0) {
      return NextResponse.json({
        success: false,
        error: 'Le coût de la main d\'œuvre doit être un nombre positif'
      }, { status: 400 })
    }

    if (isNaN(materialsCostNum) || materialsCostNum < 0) {
      return NextResponse.json({
        success: false,
        error: 'Le coût des matériaux doit être un nombre positif'
      }, { status: 400 })
    }

    console.log("💰 Quote details:", {
      laborCost: laborCostNum,
      materialsCost: materialsCostNum,
      totalAmount: laborCostNum + materialsCostNum
    })

    // Create or update quote (upsert based on unique constraint)
    const quoteData = {
      intervention_id: interventionId,
      provider_id: user.id,
      labor_cost: laborCostNum,
      materials_cost: materialsCostNum,
      description: description.trim(),
      work_details: workDetails?.trim() || null,
      estimated_duration_hours: estimatedDurationHours ? parseInt(estimatedDurationHours) : null,
      estimated_start_date: estimatedStartDate || null,
      terms_and_conditions: termsAndConditions?.trim() || null,
      attachments: JSON.stringify(attachments || []),
      status: 'pending' as const,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert or update quote
    const { data: quote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .upsert(quoteData, {
        onConflict: 'intervention_id,provider_id',
        ignoreDuplicates: false
      })
      .select(`
        *,
        provider:provider_id(id, name, email, provider_category)
      `)
      .single()

    if (quoteError) {
      console.error("❌ Error creating/updating quote:", quoteError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la soumission du devis'
      }, { status: 500 })
    }

    console.log("✅ Quote submitted successfully:", quote.id)

    // Send notification to gestionnaires responsible for this intervention
    try {
      const { data: responsibleManagers } = await supabase
        .from('intervention_contacts')
        .select(`
          user:user_id(id, name, email)
        `)
        .eq('intervention_id', interventionId)
        .eq('role', 'gestionnaire')

      if (responsibleManagers && responsibleManagers.length > 0) {
        const notificationPromises = responsibleManagers.map(async (manager) => {
          return notificationService.createNotification({
            userId: manager.user.id,
            teamId: intervention.team_id,
            createdBy: user.id,
            type: 'intervention',
            priority: 'high',
            title: 'Nouveau devis reçu',
            message: `${user.name} a soumis un devis de ${(laborCostNum + materialsCostNum).toFixed(2)}€ pour l'intervention "${intervention.title}"`,
            isPersonal: true,
            metadata: {
              interventionId: interventionId,
              interventionTitle: intervention.title,
              quoteId: quote.id,
              quoteAmount: laborCostNum + materialsCostNum,
              providerName: user.name,
              actionRequired: 'quote_review'
            },
            relatedEntityType: 'intervention',
            relatedEntityId: interventionId
          })
        })

        await Promise.all(notificationPromises)
        console.log(`📧 Quote submission notifications sent to ${responsibleManagers.length} gestionnaire(s)`)
      }
    } catch (notifError) {
      console.warn("⚠️ Could not send quote submission notifications:", notifError)
      // Don't fail the submission for notification errors
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        intervention_id: quote.intervention_id,
        labor_cost: quote.labor_cost,
        materials_cost: quote.materials_cost,
        total_amount: quote.total_amount,
        description: quote.description,
        work_details: quote.work_details,
        estimated_duration_hours: quote.estimated_duration_hours,
        estimated_start_date: quote.estimated_start_date,
        status: quote.status,
        submitted_at: quote.submitted_at,
        updated_at: quote.updated_at
      },
      message: 'Devis soumis avec succès'
    })

  } catch (error) {
    console.error("❌ Error in intervention-quote-submit API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la soumission du devis'
    }, { status: 500 })
  }
}