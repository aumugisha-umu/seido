import { userService } from '@/lib/database-service'
import { getServerSession } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logger, logError } from '@/lib/logger'

export async function PATCH(request: Request) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer le profil utilisateur pour avoir le bon ID
    const currentUserProfile = await userService.findByAuthUserId(session.user.id)
    if (!currentUserProfile) {
      return NextResponse.json(
        { error: 'Profil utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { password_set } = body

    console.log('🔐 [UPDATE-USER-PROFILE] Updating password_set for user:', currentUserProfile.email, 'to:', password_set)

    // ✅ SÉCURITÉ: Vérifier que l'utilisateur a vraiment besoin de définir son mot de passe
    if (password_set === true && currentUserProfile.password_set === true) {
      console.log('⚠️ [UPDATE-USER-PROFILE] User already has password_set=true, rejecting update')
      return NextResponse.json(
        { error: 'Le mot de passe a déjà été configuré' },
        { status: 400 }
      )
    }

    // Mettre à jour le champ password_set
    const updatedUser = await userService.update(currentUserProfile.id, {
      password_set: password_set
    })

    console.log('✅ [UPDATE-USER-PROFILE] User profile updated successfully')

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    console.error('❌ [UPDATE-USER-PROFILE] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour du profil' },
      { status: 500 }
    )
  }
}
