/**
 * 🧪 API TEST - Vérifier qu'un contact existe
 *
 * Cette route permet aux tests E2E de vérifier qu'un contact
 * a bien été créé dans la base de données.
 *
 * ⚠️  IMPORTANT: Cette route doit UNIQUEMENT être accessible en environnement de test
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  // ✅ SÉCURITÉ: Vérifier qu'on est bien en environnement de test
  if (process.env.NODE_ENV === 'production') {
    logger.error({}, '🚨 [CHECK-CONTACT] Attempted access in production - BLOCKED')
    return NextResponse.json(
      { error: 'This endpoint is only available in development/test environments' },
      { status: 403 }
    )
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    logger.info({ email: email }, '🧪 [CHECK-CONTACT] Checking if contact exists:')

    // Créer client Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error({}, '❌ [CHECK-CONTACT] Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Chercher le contact dans la table contacts
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (contactError) {
      logger.error({ error: contactError }, '❌ [CHECK-CONTACT] Error querying contacts:')
      return NextResponse.json(
        { error: 'Failed to check contact' },
        { status: 500 }
      )
    }

    if (!contact) {
      logger.info({ email: email }, 'ℹ️  [CHECK-CONTACT] Contact not found:')
      return NextResponse.json({
        exists: false,
        contact: null,
      })
    }

    logger.info({ contact: contact.id }, '✅ [CHECK-CONTACT] Contact found:')

    return NextResponse.json({
      exists: true,
      contact: {
        id: contact.id,
        email: contact.email,
        type: contact.type,
        firstName: contact.first_name,
        lastName: contact.last_name,
        phone: contact.phone,
      },
    })
  } catch (error) {
    logger.error({ error: error }, '❌ [CHECK-CONTACT] Unexpected error:')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
