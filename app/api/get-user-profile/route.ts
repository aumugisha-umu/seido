import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH: FAILLE SÉCURITÉ CRITIQUE CORRIGÉE! (route acceptait authUserId sans authentification)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile } = authResult.data

    logger.info({
      id: userProfile.id,
      name: userProfile.name,
      email: userProfile.email,
      password_set: userProfile.password_set,
      role: userProfile.role
    }, '✅ [GET-USER-PROFILE] User profile found:')

    return NextResponse.json({
      success: true,
      user: userProfile
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [GET-USER-PROFILE] Error:')
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get user profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
