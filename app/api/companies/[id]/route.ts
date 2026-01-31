import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/companies/[id]
 * Fetch a single company by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authContext = await getApiAuthContext()

    if (!authContext) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { profile, supabase } = authContext

    if (!profile?.team_id) {
      return NextResponse.json({ error: 'Équipe non trouvée' }, { status: 404 })
    }

    // Fetch company
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .eq('team_id', profile.team_id)
      .is('deleted_at', null)
      .single()

    if (error || !company) {
      return NextResponse.json({ error: 'Société non trouvée' }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error) {
    logger.error('[API] Error fetching company:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PATCH /api/companies/[id]
 * Update a company
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const authContext = await getApiAuthContext()

    if (!authContext) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { profile, supabase } = authContext

    if (!profile?.team_id) {
      return NextResponse.json({ error: 'Équipe non trouvée' }, { status: 404 })
    }

    // Check if user is gestionnaire or admin
    if (!['gestionnaire', 'admin'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
    }

    // Verify company belongs to team
    const { data: existingCompany, error: fetchError } = await supabase
      .from('companies')
      .select('id, team_id')
      .eq('id', id)
      .eq('team_id', profile.team_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingCompany) {
      return NextResponse.json({ error: 'Société non trouvée' }, { status: 404 })
    }

    // Update company
    const updateData = {
      name: body.name,
      legal_name: body.legal_name,
      vat_number: body.vat_number,
      email: body.email,
      phone: body.phone,
      street: body.street,
      street_number: body.street_number,
      postal_code: body.postal_code,
      city: body.city,
      country: body.country,
      website: body.website,
      notes: body.notes,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }

    const { data: company, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[API] Error updating company:', error)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    logger.info(`[API] Company updated: ${company.name} (ID: ${id})`)
    return NextResponse.json(company)
  } catch (error) {
    logger.error('[API] Error updating company:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]
 * Soft delete a company
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authContext = await getApiAuthContext()

    if (!authContext) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { profile, supabase } = authContext

    if (!profile?.team_id) {
      return NextResponse.json({ error: 'Équipe non trouvée' }, { status: 404 })
    }

    // Check if user is gestionnaire or admin
    if (!['gestionnaire', 'admin'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
    }

    // Verify company belongs to team
    const { data: existingCompany, error: fetchError } = await supabase
      .from('companies')
      .select('id, team_id, name')
      .eq('id', id)
      .eq('team_id', profile.team_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingCompany) {
      return NextResponse.json({ error: 'Société non trouvée' }, { status: 404 })
    }

    // Soft delete: set deleted_at timestamp
    const { error } = await supabase
      .from('companies')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', id)

    if (error) {
      logger.error('[API] Error deleting company:', error)
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
    }

    // Also remove company_id from associated contacts
    await supabase
      .from('users')
      .update({ company_id: null })
      .eq('company_id', id)

    logger.info(`[API] Company deleted: ${existingCompany.name} (ID: ${id})`)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[API] Error deleting company:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
