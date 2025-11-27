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

    // 1. Fetch intervention with lot/building
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
        )
      `)
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

    // Check finalizable status
    if (!['cloturee_par_prestataire', 'cloturee_par_locataire', 'contestee'].includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `Cette intervention ne peut pas être finalisée dans son état actuel: ${intervention.status}`
      }, { status: 400 })
    }

    // ⚡ OPTIMISATION: Fetch assignments et reports en parallèle
    // (intervention déjà validée, ces deux requêtes sont indépendantes)
    const [assignmentsResult, reportsResult] = await Promise.all([
      // 2. Fetch assignments (to get tenant/provider contacts)
      supabase
        .from('intervention_assignments')
        .select(`
          id,
          role,
          is_primary,
          user:user_id(
            id,
            name,
            email,
            phone,
            role,
            provider_category
          )
        `)
        .eq('intervention_id', interventionId),

      // 3. Fetch intervention reports (provider_report, tenant_report)
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
        .order('created_at', { ascending: true })
    ])

    const { data: assignments, error: assignmentsError } = assignmentsResult
    const { data: reports, error: reportsError } = reportsResult

    if (assignmentsError) {
      logger.warn({ error: assignmentsError }, '⚠️ Error fetching assignments')
    }
    if (reportsError) {
      logger.warn({ error: reportsError }, '⚠️ Error fetching reports')
    }

    // Extract tenant and provider from assignments
    const tenantAssignment = assignments?.find(a => a.role === 'locataire')
    const providerAssignment = assignments?.find(a => a.role === 'prestataire' && a.is_primary)
      || assignments?.find(a => a.role === 'prestataire')

    const tenant = tenantAssignment?.user || null
    const provider = providerAssignment?.user || null

    // Build simplified response
    const responseData = {
      intervention: {
        id: intervention.id,
        reference: intervention.reference,
        title: intervention.title,
        type: intervention.type,
        urgency: intervention.urgency,
        description: intervention.description,
        status: intervention.status,
        is_contested: intervention.is_contested,
        lot: intervention.lot
      },
      tenant,
      provider,
      reports: reports || []
    }

    logger.info({
      hasIntervention: true,
      hasTenant: !!tenant,
      hasProvider: !!provider,
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
