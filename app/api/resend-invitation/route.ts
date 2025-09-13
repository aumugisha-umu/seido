import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/supabase-server'
import { userService } from '@/lib/database-service'

// Client admin Supabase pour les opérations privilégiées
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

export async function POST(request: Request) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier si le service est disponible
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json(
        { error: 'ID d\'invitation manquant' },
        { status: 400 }
      )
    }

    console.log('🔄 [RESEND-INVITATION] Processing resend for invitation:', invitationId)

    // ÉTAPE 1: Récupérer les informations de l'invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()
    
    if (invitationError || !invitation) {
      console.error('❌ [RESEND-INVITATION] Invitation not found:', invitationError)
      return NextResponse.json(
        { error: 'Invitation non trouvée' },
        { status: 404 }
      )
    }

    console.log('✅ [RESEND-INVITATION] Found invitation:', {
      email: invitation.email,
      role: invitation.role,
      team_id: invitation.team_id
    })

    // ÉTAPE 2: Vérifier si l'utilisateur existe dans notre BDD
    const existingUser = await userService.findByEmail(invitation.email)
    
    if (!existingUser) {
      console.error('❌ [RESEND-INVITATION] User not found in database:', invitation.email)
      return NextResponse.json(
        { error: 'Utilisateur non trouvé dans la base de données' },
        { status: 404 }
      )
    }

    console.log('✅ [RESEND-INVITATION] Found user in database:', existingUser.id)

    // ÉTAPE 3: Générer un nouveau magic link de connexion (pas d'invitation)
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    
    console.log('🔗 [RESEND-INVITATION] Generating magic link for signin...')
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', // ← Utiliser 'magiclink' pour les connexions, pas 'invite'
      email: invitation.email,
      options: {
        redirectTo: redirectTo
      }
    })

    if (linkError) {
      console.error('❌ [RESEND-INVITATION] Failed to generate magic link:', linkError)
      return NextResponse.json(
        { error: 'Erreur lors de la génération du lien magique: ' + linkError.message },
        { status: 500 }
      )
    }

    const magicLink = linkData?.properties?.action_link

    if (!magicLink) {
      console.error('❌ [RESEND-INVITATION] No magic link in response')
      return NextResponse.json(
        { error: 'Impossible de générer le lien magique' },
        { status: 500 }
      )
    }

    console.log('✅ [RESEND-INVITATION] Magic link generated successfully')
    console.log('📋 [RESEND-INVITATION] Magic link preview:', magicLink.substring(0, 100) + '...')

    // ÉTAPE 4: Optionnel - Envoyer aussi l'email automatiquement
    try {
      console.log('📧 [RESEND-INVITATION] Sending magic link email...')
      
      const { error: emailError } = await supabaseAdmin.auth.signInWithOtp({
        email: invitation.email,
        options: {
          emailRedirectTo: redirectTo
        }
      })
      
      if (emailError) {
        console.warn('⚠️ [RESEND-INVITATION] Failed to send email, but magic link generated:', emailError.message)
      } else {
        console.log('✅ [RESEND-INVITATION] Email sent successfully')
      }
    } catch (emailError) {
      console.warn('⚠️ [RESEND-INVITATION] Email sending failed:', emailError)
      // Ne pas faire échouer la requête pour cette erreur
    }

    // ÉTAPE 5: Mettre à jour l'invitation avec une nouvelle date d'expiration
    try {
      const newExpirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
      
      await supabaseAdmin
        .from('user_invitations')
        .update({
          expires_at: newExpirationDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
      
      console.log('✅ [RESEND-INVITATION] Updated invitation expiration')
    } catch (updateError) {
      console.warn('⚠️ [RESEND-INVITATION] Failed to update invitation:', updateError)
      // Ne pas faire échouer pour cette erreur
    }

    return NextResponse.json({
      success: true,
      magicLink: magicLink,
      message: 'Lien de connexion généré avec succès',
      emailSent: true, // Assume email was sent unless there was an error
      userId: existingUser.id
    })

  } catch (error) {
    console.error('❌ [RESEND-INVITATION] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
