import { NextRequest, NextResponse } from 'next/server'
import { createServerUserService } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
export async function POST(request: NextRequest) {
  try {
    const { authUserId } = await request.json()

    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: 'Auth user ID is required' },
        { status: 400 }
      )
    }

    logger.info({ user: authUserId }, '🔍 [GET-USER-PROFILE] Looking up user profile for auth_user_id:')

    // Récupérer le profil utilisateur par auth_user_id
    const userService = await createServerUserService()
    const userResult = await userService.getByAuthUserId(authUserId)

    if (!userResult.success || !userResult.data) {
      logger.info({ user: authUserId }, '❌ [GET-USER-PROFILE] No user profile found for auth_user_id:')
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userProfile = userResult.data

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
