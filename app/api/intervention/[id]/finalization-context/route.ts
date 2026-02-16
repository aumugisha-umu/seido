import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * GET /api/intervention/[id]/finalization-context
 *
 * Fetches context data for manager finalization modal.
 * Uses only existing tables: interventions, intervention_assignments, intervention_reports
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interventionId } = await params

    // Auth + role check (gestionnaire required)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    logger.info({ interventionId, userId: user.id }, '📊 Fetching finalization context')

    // 1. Fetch intervention (flat, no nested building/lot to avoid RLS issues)
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.warn({ error: interventionError }, '❌ Intervention not found')
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check team membership
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à accéder à cette intervention'
      }, { status: 403 })
    }

    // Check finalizable status (planifiee allows direct finalization by manager)
    if (!['planifiee', 'cloturee_par_prestataire', 'cloturee_par_locataire', 'contestee'].includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `Cette intervention ne peut pas être finalisée dans son état actuel: ${intervention.status}`
      }, { status: 400 })
    }

    // ⚡ Fetch building, lot, assignments, reports en parallèle
    // Separate queries avoid RLS issues with nested PostgREST joins (AGENTS.md pattern)
    // Same pattern as gestionnaire intervention detail page (page.tsx lines 116-132)
    const [buildingResult, lotResult, assignmentsResult, reportsResult, timeSlotsResult, quotesResult] = await Promise.all([
      // Building (with address — separate query, not nested)
      intervention.building_id
        ? supabase.from('buildings').select('*, address_record:address_id(*)').eq('id', intervention.building_id).single()
        : Promise.resolve({ data: null, error: null }),

      // Lot (with building + address — same select as page.tsx line 124)
      intervention.lot_id
        ? supabase.from('lots').select('*, address_record:address_id(*), building:building_id(*, address_record:address_id(*))').eq('id', intervention.lot_id).single()
        : Promise.resolve({ data: null, error: null }),

      // ALL assignments with full user data (same as page.tsx line 130)
      supabase
        .from('intervention_assignments')
        .select('*, user:users!user_id(*, company:company_id(*))')
        .eq('intervention_id', interventionId)
        .order('assigned_at', { ascending: false }),

      // Reports
      supabase
        .from('intervention_reports')
        .select(`
          id,
          report_type,
          title,
          content,
          metadata,
          created_at,
          created_by,
          creator:created_by(id, name, role)
        `)
        .eq('intervention_id', interventionId)
        .is('deleted_at', null)
        .in('report_type', ['provider_report', 'tenant_report'])
        .order('created_at', { ascending: true }),

      // Time slots (for planning status in details card)
      supabase
        .from('intervention_time_slots')
        .select('id, slot_date, start_time, end_time, status, selected_by_manager')
        .eq('intervention_id', interventionId)
        .order('slot_date', { ascending: true }),

      // Quotes (for estimation status in details card)
      supabase
        .from('intervention_quotes')
        .select('id, amount, status')
        .eq('intervention_id', interventionId)
        .is('deleted_at', null)
    ])

    const { data: building, error: buildingError } = buildingResult
    const { data: lot, error: lotError } = lotResult
    const { data: assignments, error: assignmentsError } = assignmentsResult
    const { data: reports, error: reportsError } = reportsResult
    const { data: timeSlots, error: timeSlotsError } = timeSlotsResult
    const { data: quotes, error: quotesError } = quotesResult

    if (buildingError) logger.warn({ error: buildingError }, '⚠️ Error fetching building')
    if (lotError) logger.warn({ error: lotError }, '⚠️ Error fetching lot')
    if (assignmentsError) logger.warn({ error: assignmentsError }, '⚠️ Error fetching assignments')
    if (reportsError) logger.warn({ error: reportsError }, '⚠️ Error fetching reports')
    if (timeSlotsError) logger.warn({ error: timeSlotsError }, '⚠️ Error fetching time slots')
    if (quotesError) logger.warn({ error: quotesError }, '⚠️ Error fetching quotes')

    // Build response — return raw assignments for frontend to map (same as General tab)
    const responseData = {
      intervention: {
        id: intervention.id,
        reference: intervention.reference,
        title: intervention.title,
        type: intervention.type,
        urgency: intervention.urgency,
        description: intervention.description,
        instructions: intervention.provider_guidelines,
        scheduling_type: intervention.scheduling_type,
        requires_quote: intervention.requires_quote,
        status: intervention.status,
        is_contested: intervention.is_contested,
        lot,
        building
      },
      assignments: assignments || [],
      timeSlots: timeSlots || [],
      quotes: quotes || [],
      reports: reports || []
    }

    logger.info({
      hasIntervention: true,
      assignmentsCount: (assignments || []).length,
      timeSlotsCount: (timeSlots || []).length,
      quotesCount: (quotes || []).length,
      reportsCount: responseData.reports.length
    }, '✅ Finalization context fetched successfully')

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    logger.error({ error }, '❌ Error in finalization context API')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
