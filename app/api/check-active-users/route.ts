import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { checkActiveUsersSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

// Client admin pour les opérations privilégiées
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH: FAILLE SÉCURITÉ CORRIGÉE! (admin client utilisé sans auth check)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(checkActiveUsersSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [CHECK-ACTIVE-USERS] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { emails, teamId } = validatedData

    logger.info({ emailCount: emails.length, teamId }, '👥 [CHECK-ACTIVE-USERS] Checking emails for team')

    // Vérifier quels emails correspondent à des utilisateurs actifs
    // Un utilisateur est "actif" s'il existe dans la table users avec cet email
    // Emails already normalized by schema (toLowerCase + trim)
    const { data: activeUsers, error } = await supabaseAdmin
      .from('users')
      .select('email')
      .in('email', emails)
      .eq('team_id', teamId)

    if (error) {
      logger.error({ error }, '❌ [CHECK-ACTIVE-USERS] Database error')
      return NextResponse.json(
        { error: 'Erreur lors de la vérification des utilisateurs actifs' },
        { status: 500 }
      )
    }

    const activeEmails = activeUsers?.map(user => user.email) || []
    logger.info({ activeCount: activeEmails.length }, '✅ [CHECK-ACTIVE-USERS] Found active users')

    return NextResponse.json({
      success: true,
      activeEmails,
      totalChecked: emails.length,
      activeCount: activeEmails.length
    })

  } catch (error) {
    logger.error({ error }, '❌ [CHECK-ACTIVE-USERS] Unexpected error')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
