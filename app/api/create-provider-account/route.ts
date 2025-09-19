import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/database-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { createClient } from '@supabase/supabase-js'

// Admin client for creating auth users
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = supabaseServiceRoleKey ? createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

export async function POST(request: NextRequest) {
  console.log("✅ create-provider-account API route called")

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Service de création de compte non configuré'
      }, { status: 503 })
    }

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

    // Parse request body
    const body = await request.json()
    const {
      email,
      magicLinkToken,
      interventionId
    } = body

    if (!email || !magicLinkToken || !interventionId) {
      return NextResponse.json({
        success: false,
        error: 'Email, token et interventionId sont requis'
      }, { status: 400 })
    }

    console.log("📝 Creating provider account for:", email)

    // Verify magic link exists and is valid
    const { data: magicLink, error: magicLinkError } = await supabase
      .from('intervention_magic_links')
      .select(`
        *,
        intervention:intervention_id(id, title, team_id)
      `)
      .eq('token', magicLinkToken)
      .eq('provider_email', email)
      .eq('intervention_id', interventionId)
      .single()

    if (magicLinkError || !magicLink) {
      console.error("❌ Magic link not found:", magicLinkError)
      return NextResponse.json({
        success: false,
        error: 'Lien magique invalide ou expiré'
      }, { status: 404 })
    }

    // Check if magic link has expired
    const now = new Date()
    const expiresAt = new Date(magicLink.expires_at)

    if (expiresAt < now) {
      return NextResponse.json({
        success: false,
        error: 'Ce lien a expiré'
      }, { status: 410 })
    }

    // Check if provider already has an account
    if (magicLink.provider_id) {
      return NextResponse.json({
        success: true,
        message: 'Le compte existe déjà',
        accountExists: true,
        userId: magicLink.provider_id
      })
    }

    // Check if user already exists in our system
    const existingUser = await userService.findByEmail(email)
    if (existingUser) {
      // Link existing user to magic link
      await supabase
        .from('intervention_magic_links')
        .update({
          provider_id: existingUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', magicLink.id)

      return NextResponse.json({
        success: true,
        message: 'Compte existant lié avec succès',
        accountExists: true,
        userId: existingUser.id
      })
    }

    // Generate a temporary password for the account
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)

    console.log("🔑 Creating auth user...")

    // Create auth user with admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email for magic link users
      user_metadata: {
        full_name: `Prestataire ${email.split('@')[0]}`,
        role: 'prestataire',
        provider_category: 'prestataire',
        created_via_magic_link: true,
        magic_link_token: magicLinkToken
      }
    })

    if (authError || !authData.user) {
      console.error("❌ Error creating auth user:", authError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la création du compte: ' + (authError?.message || 'Unknown error')
      }, { status: 500 })
    }

    console.log("✅ Auth user created:", authData.user.id)

    // Create user profile in our database
    const userProfile = await userService.create({
      auth_user_id: authData.user.id,
      email: email,
      name: `Prestataire ${email.split('@')[0]}`, // Default name, can be updated later
      role: 'prestataire' as Database['public']['Enums']['user_role'],
      provider_category: 'prestataire' as Database['public']['Enums']['provider_category'],
      team_id: magicLink.intervention.team_id, // Add to intervention team
      is_active: true
    })

    console.log("✅ User profile created:", userProfile.id)

    // Update magic link with provider ID
    await supabase
      .from('intervention_magic_links')
      .update({
        provider_id: userProfile.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', magicLink.id)

    // Add provider to intervention via intervention_contacts
    await supabase
      .from('intervention_contacts')
      .upsert({
        intervention_id: interventionId,
        user_id: userProfile.id,
        role: 'prestataire',
        is_primary: false, // Not primary, added via magic link
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'intervention_id,user_id,role'
      })

    console.log("✅ Provider added to intervention contacts")

    // Send magic link for password setup (they can change password later)
    try {
      const { error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
      })

      if (magicLinkError) {
        console.warn("⚠️ Could not generate password reset link:", magicLinkError)
      } else {
        console.log("✅ Password reset link generated")
      }
    } catch (linkError) {
      console.warn("⚠️ Error generating password reset link:", linkError)
    }

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      accountExists: false,
      userId: userProfile.id,
      authUserId: authData.user.id,
      tempPasswordGenerated: true
    })

  } catch (error) {
    console.error("❌ Error in create-provider-account API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la création du compte'
    }, { status: 500 })
  }
}