import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  console.log("👁️ view-intervention-document API route called")

  try {
    // ⚠️ TEMPORAIRE: Utiliser Service Role client pour bypasser RLS
    console.log("⚠️ USING SERVICE ROLE CLIENT TO BYPASS RLS (TEMPORARY)")

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase Service Role configuration')
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY, // Service Role bypasse tous les RLS
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Initialize auth client pour récupérer l'utilisateur authentifié
    const cookieStore = await cookies()
    const authClient = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      }
    )

    // Get current auth user (via auth client, pas service client)
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser()
    if (authError || !authUser) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Get database user from auth user
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !dbUser) {
      console.error("❌ Database user not found:", userError)
      return NextResponse.json({
        error: 'Profil utilisateur non trouvé. Veuillez compléter votre profil.'
      }, { status: 404 })
    }

    console.log("👤 User found:", {
      authId: authUser.id,
      dbId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role
    })

    // Get document ID from query params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ 
        error: 'documentId est requis' 
      }, { status: 400 })
    }

    console.log("👁️ Getting document for viewing:", documentId)

    // Get document information and verify access
    const { data: document, error: docError } = await supabase
      .from('intervention_documents')
      .select(`
        *,
        intervention:intervention_id!inner(
          id,
          title,
          reference,
          team_id,
          team:team_id!inner(
            members:team_members!inner(user_id)
          )
        )
      `)
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error("❌ Document not found:", docError)
      return NextResponse.json({ 
        error: 'Document non trouvé' 
      }, { status: 404 })
    }

    // Check if user is member of the team that owns this intervention
    const userHasAccess = document.intervention.team.members.some(
      (member: any) => member.user_id === dbUser.id
    )

    if (!userHasAccess) {
      console.error("❌ User not member of document's intervention team")
      return NextResponse.json({
        error: 'Accès refusé à ce document'
      }, { status: 403 })
    }

    console.log("🔐 Generating signed URL for viewing:", document.storage_path)

    // Generate signed URL for viewing (valid for 30 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(document.storage_bucket || 'intervention-documents')
      .createSignedUrl(document.storage_path, 1800) // 30 minutes expiry

    if (signedUrlError || !signedUrlData) {
      console.error("❌ Error generating signed URL:", signedUrlError)
      return NextResponse.json({ 
        error: 'Erreur lors de la génération de l\'URL de visualisation' 
      }, { status: 500 })
    }

    console.log("✅ Signed URL for viewing generated successfully")

    return NextResponse.json({
      success: true,
      viewUrl: signedUrlData.signedUrl,
      document: {
        id: document.id,
        filename: document.original_filename,
        size: document.file_size,
        type: document.mime_type,
        documentType: document.document_type,
        description: document.description,
        uploadedAt: document.uploaded_at
      },
      intervention: {
        id: document.intervention.id,
        title: document.intervention.title,
        reference: document.intervention.reference
      },
      expiresIn: 1800 // 30 minutes in seconds
    })

  } catch (error) {
    console.error("❌ Error in view-intervention-document API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur lors de la génération de l\'URL de visualisation'
    }, { status: 500 })
  }
}
