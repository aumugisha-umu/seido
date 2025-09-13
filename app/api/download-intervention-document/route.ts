import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  console.log("📥 download-intervention-document API route called")
  
  try {
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Get document ID from query params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ 
        error: 'documentId est requis' 
      }, { status: 400 })
    }

    console.log("📄 Getting document info for:", documentId)

    // Get document information and verify access
    const { data: document, error: docError } = await supabase
      .from('intervention_documents')
      .select(`
        *,
        intervention:intervention_id!inner(
          id,
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
      (member: any) => member.user_id === user.id
    )

    if (!userHasAccess) {
      console.error("❌ User not member of document's intervention team")
      return NextResponse.json({ 
        error: 'Accès refusé à ce document' 
      }, { status: 403 })
    }

    console.log("🔐 Generating signed URL for:", document.storage_path)

    // Generate signed URL for download (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(document.storage_bucket || 'intervention-documents')
      .createSignedUrl(document.storage_path, 3600) // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      console.error("❌ Error generating signed URL:", signedUrlError)
      return NextResponse.json({ 
        error: 'Erreur lors de la génération de l\'URL de téléchargement' 
      }, { status: 500 })
    }

    console.log("✅ Signed URL generated successfully")

    return NextResponse.json({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      document: {
        id: document.id,
        filename: document.original_filename,
        size: document.file_size,
        type: document.mime_type
      },
      expiresIn: 3600 // 1 hour in seconds
    })

  } catch (error) {
    console.error("❌ Error in download-intervention-document API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur lors de la génération de l\'URL de téléchargement'
    }, { status: 500 })
  }
}
