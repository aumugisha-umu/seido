import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { userService } from '@/lib/database-service'
import { logger, logError } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interventionId } = await params

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

    // Get user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is gestionnaire
    if (user.role !== 'gestionnaire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires peuvent accéder au contexte de finalisation'
      }, { status: 403 })
    }

    console.log(`📊 Fetching finalization context for intervention:`, interventionId)

    // Fetch intervention with basic info
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(
          id,
          reference,
          building:building_id(
            id,
            name,
            address
          )
        ),
        tenant:tenant_id(
          id,
          name,
          email,
          phone
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

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à accéder à cette intervention'
      }, { status: 403 })
    }

    // Check if intervention is in finalizable status
    if (!['cloturee_par_prestataire', 'cloturee_par_locataire', 'contestee'].includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `Cette intervention ne peut pas être finalisée dans son état actuel: ${intervention.status}`
      }, { status: 400 })
    }

    // Fetch work completion report
    const { data: workCompletion, error: workError } = await supabase
      .from('intervention_work_completions')
      .select(`
        *,
        provider:provider_id(
          id,
          name,
          email,
          phone,
          provider_category
        )
      `)
      .eq('intervention_id', interventionId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (workError) {
      console.warn('⚠️ Error fetching work completion:', workError)
    }

    // Fetch tenant validation if exists
    const { data: tenantValidation, error: validationError } = await supabase
      .from('intervention_tenant_validations')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (validationError) {
      console.warn('⚠️ Error fetching tenant validation:', validationError)
    }

    // Fetch selected quote if exists
    const { data: quotes, error: quotesError } = await supabase
      .from('intervention_quotes')
      .select(`
        *,
        provider:provider_id(
          id,
          name,
          email,
          provider_category
        )
      `)
      .eq('intervention_id', interventionId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)

    if (quotesError) {
      console.warn('⚠️ Error fetching quotes:', quotesError)
    }

    const selectedQuote = quotes && quotes.length > 0 ? quotes[0] : null

    // Fetch all intervention contacts for context
    const { data: contacts, error: contactsError } = await supabase
      .from('intervention_contacts')
      .select(`
        *,
        user:user_id(
          id,
          name,
          email,
          phone,
          role,
          provider_category
        )
      `)
      .eq('intervention_id', interventionId)

    if (contactsError) {
      console.warn('⚠️ Error fetching contacts:', contactsError)
    }

    // Check if there's already a finalization record
    const { data: existingFinalization, error: finalizationError } = await supabase
      .from('intervention_manager_finalizations')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('finalized_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (finalizationError) {
      console.warn('⚠️ Error checking existing finalization:', finalizationError)
    }

    // Build response data
    const responseData = {
      intervention: {
        ...intervention,
        lot: intervention.lot,
        tenant: intervention.tenant
      },
      workCompletion: workCompletion ? {
        id: workCompletion.id,
        workSummary: workCompletion.work_summary,
        workDetails: workCompletion.work_details,
        materialsUsed: workCompletion.materials_used,
        actualDurationHours: workCompletion.actual_duration_hours,
        actualCost: workCompletion.actual_cost,
        issuesEncountered: workCompletion.issues_encountered,
        recommendations: workCompletion.recommendations,
        qualityAssurance: workCompletion.quality_assurance ?
          (typeof workCompletion.quality_assurance === 'string' ?
            JSON.parse(workCompletion.quality_assurance) : workCompletion.quality_assurance) : null,
        beforePhotos: workCompletion.before_photos ?
          (typeof workCompletion.before_photos === 'string' ?
            JSON.parse(workCompletion.before_photos) : workCompletion.before_photos) : [],
        afterPhotos: workCompletion.after_photos ?
          (typeof workCompletion.after_photos === 'string' ?
            JSON.parse(workCompletion.after_photos) : workCompletion.after_photos) : [],
        documents: workCompletion.documents ?
          (typeof workCompletion.documents === 'string' ?
            JSON.parse(workCompletion.documents) : workCompletion.documents) : [],
        submittedAt: workCompletion.submitted_at,
        provider: workCompletion.provider
      } : null,
      tenantValidation: tenantValidation ? {
        id: tenantValidation.id,
        validationType: tenantValidation.validation_type,
        satisfaction: tenantValidation.satisfaction ?
          (typeof tenantValidation.satisfaction === 'string' ?
            JSON.parse(tenantValidation.satisfaction) : tenantValidation.satisfaction) : null,
        workApproval: tenantValidation.work_approval ?
          (typeof tenantValidation.work_approval === 'string' ?
            JSON.parse(tenantValidation.work_approval) : tenantValidation.work_approval) : null,
        comments: tenantValidation.comments,
        issues: tenantValidation.issues ?
          (typeof tenantValidation.issues === 'string' ?
            JSON.parse(tenantValidation.issues) : tenantValidation.issues) : null,
        recommendProvider: tenantValidation.recommend_provider,
        additionalComments: tenantValidation.additional_comments,
        submittedAt: tenantValidation.submitted_at
      } : null,
      selectedQuote: selectedQuote ? {
        id: selectedQuote.id,
        amount: selectedQuote.amount,
        description: selectedQuote.description,
        details: selectedQuote.details ?
          (typeof selectedQuote.details === 'string' ?
            JSON.parse(selectedQuote.details) : selectedQuote.details) : null,
        provider: selectedQuote.provider,
        createdAt: selectedQuote.created_at
      } : null,
      contacts: contacts || [],
      existingFinalization: existingFinalization ? {
        id: existingFinalization.id,
        finalStatus: existingFinalization.final_status,
        adminComments: existingFinalization.admin_comments,
        finalizedAt: existingFinalization.finalized_at
      } : null
    }

    console.log(`✅ Finalization context fetched successfully`)
    console.log(`📋 Context includes: intervention=${!!responseData.intervention}, workCompletion=${!!responseData.workCompletion}, tenantValidation=${!!responseData.tenantValidation}, quote=${!!responseData.selectedQuote}`)

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error("❌ Error in finalization context API:", error)
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}