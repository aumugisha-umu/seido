import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

// Helper function to determine document type from file type and name
function getDocumentType(mimeType: string, filename: string): string {
  const lowerFilename = filename.toLowerCase()
  
  // Photos
  if (mimeType.startsWith('image/')) {
    if (lowerFilename.includes('avant')) return 'photo_avant'
    if (lowerFilename.includes('apres') || lowerFilename.includes('après')) return 'photo_apres'
    return 'photo_avant' // Default for images
  }
  
  // Documents
  if (mimeType === 'application/pdf') {
    if (lowerFilename.includes('rapport')) return 'rapport'
    if (lowerFilename.includes('facture')) return 'facture'
    if (lowerFilename.includes('devis')) return 'devis'
    if (lowerFilename.includes('plan')) return 'plan'
    if (lowerFilename.includes('certificat')) return 'certificat'
    if (lowerFilename.includes('garantie')) return 'garantie'
  }
  
  // Spreadsheets and documents
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    if (lowerFilename.includes('devis')) return 'devis'
    if (lowerFilename.includes('facture')) return 'facture'
  }
  
  return 'autre' // Default type
}

// Generate unique filename to avoid conflicts
function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalFilename.split('.').pop()
  const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.')
  
  return `${timestamp}-${randomString}-${nameWithoutExt}.${extension}`
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("📤 [UPLOAD-API] Starting document upload process")

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

    // Parse the form data
    const formData = await request.formData()
    const interventionId = formData.get('interventionId') as string
    const file = formData.get('file') as File
    const description = formData.get('description') as string || ''

    if (!interventionId) {
      console.error("❌ Missing interventionId")
      return NextResponse.json({
        error: 'L\'identifiant de l\'intervention est requis',
        field: 'interventionId'
      }, { status: 400 })
    }

    if (!file) {
      console.error("❌ No file provided")
      return NextResponse.json({
        error: 'Aucun fichier n\'a été fourni',
        field: 'file'
      }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.error("❌ File too large:", file.size)
      return NextResponse.json({
        error: `Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB). Taille maximale: 10MB`,
        field: 'file'
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip'
    ]

    if (!allowedTypes.includes(file.type)) {
      console.error("❌ Invalid file type:", file.type)
      return NextResponse.json({
        error: `Type de fichier non autorisé: ${file.type}`,
        field: 'file',
        allowedTypes
      }, { status: 400 })
    }

    console.log("📁 Processing file upload:", {
      interventionId,
      filename: file.name,
      size: file.size,
      type: file.type
    })

    // Verify that the user has access to this intervention
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        team_id,
        team:team_id!inner(
          members:team_members!inner(user_id)
        )
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      console.error("❌ Intervention not found or access denied:", interventionError)
      return NextResponse.json({ 
        error: 'Intervention non trouvée ou accès refusé' 
      }, { status: 403 })
    }

    // Check if user is member of the team
    const userHasAccess = intervention.team.members.some(
      (member: any) => member.user_id === dbUser.id
    )

    if (!userHasAccess) {
      console.error("❌ User not member of intervention team")
      return NextResponse.json({ 
        error: 'Accès refusé à cette intervention' 
      }, { status: 403 })
    }

    // Generate unique filename and storage path
    const uniqueFilename = generateUniqueFilename(file.name)
    const storagePath = `interventions/${interventionId}/${uniqueFilename}`

    console.log("☁️ Uploading to Supabase Storage:", storagePath)

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('intervention-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false // Don't overwrite if file exists
      })

    if (uploadError) {
      console.error("❌ Error uploading file to storage:", uploadError)
      return NextResponse.json({ 
        error: 'Erreur lors de l\'upload du fichier: ' + uploadError.message 
      }, { status: 500 })
    }

    console.log("✅ File uploaded to storage:", uploadData.path)

    // Store document metadata in database
    const { data: document, error: docError } = await supabase
      .from('intervention_documents')
      .insert({
        intervention_id: interventionId,
        filename: uniqueFilename,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: uploadData.path,
        storage_bucket: 'intervention-documents',
        document_type: getDocumentType(file.type, file.name),
        uploaded_by: dbUser.id, // Use database user ID, not auth user ID
        description: description || `Document ajouté pour l'intervention`
      })
      .select(`
        *,
        uploaded_by_user:uploaded_by(name, email)
      `)
      .single()

    if (docError) {
      console.error("❌ Error storing document metadata:", docError)
      console.error("❌ Error details:", {
        code: docError.code,
        message: docError.message,
        details: docError.details,
        hint: docError.hint
      })

      // Try to clean up the uploaded file if metadata storage fails
      try {
        await supabase.storage
          .from('intervention-documents')
          .remove([uploadData.path])
        console.log("🧹 Cleaned up uploaded file after metadata error")
      } catch (cleanupError) {
        console.error("⚠️ Error cleaning up uploaded file:", cleanupError)
      }

      // Provide more specific error message based on the error
      let errorMessage = 'Erreur lors de l\'enregistrement des métadonnées du document'
      if (docError.code === '23503') {
        errorMessage = 'Référence utilisateur invalide. Veuillez vous reconnecter.'
      } else if (docError.code === '42501') {
        errorMessage = 'Permissions insuffisantes pour cette intervention.'
      }

      return NextResponse.json({
        error: errorMessage,
        details: docError.message
      }, { status: 500 })
    }

    console.log("✅ Document metadata stored:", document.id)

    // Update intervention to mark it as having attachments
    const { error: updateError } = await supabase
      .from('interventions')
      .update({ has_attachments: true })
      .eq('id', interventionId)

    if (updateError) {
      console.warn("⚠️ Warning: Could not update intervention has_attachments flag:", updateError)
      // Don't fail the entire operation for this
    }

    const elapsedTime = Date.now() - startTime
    console.log(`🎉 [UPLOAD-API] Document upload completed in ${elapsedTime}ms`)

    // Create a signed URL for immediate access (valid for 1 hour)
    let signedUrl = null
    try {
      const { data } = await supabase.storage
        .from('intervention-documents')
        .createSignedUrl(document.storage_path, 3600) // 1 hour

      signedUrl = data?.signedUrl
    } catch (urlError) {
      console.warn("⚠️ Could not create signed URL:", urlError)
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.original_filename,
        size: document.file_size,
        type: document.mime_type,
        uploadedAt: document.uploaded_at,
        documentType: document.document_type,
        storagePath: document.storage_path,
        signedUrl,
        uploadedBy: {
          name: document.uploaded_by_user?.name || dbUser.name,
          email: document.uploaded_by_user?.email || dbUser.email
        }
      },
      message: 'Document uploadé avec succès',
      processingTime: elapsedTime
    })

  } catch (error) {
    const elapsedTime = Date.now() - startTime
    console.error(`❌ [UPLOAD-API] Error after ${elapsedTime}ms:`, error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      type: error?.constructor?.name || 'Unknown'
    })

    // Provide user-friendly error messages
    let userMessage = 'Une erreur inattendue s\'est produite lors de l\'upload du document'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes('Network')) {
        userMessage = 'Erreur de connexion. Veuillez vérifier votre connexion internet.'
        statusCode = 503
      } else if (error.message.includes('timeout')) {
        userMessage = 'Le téléchargement a pris trop de temps. Veuillez réessayer.'
        statusCode = 408
      } else if (error.message.includes('size')) {
        userMessage = 'Le fichier est trop volumineux.'
        statusCode = 413
      }
    }

    return NextResponse.json({
      success: false,
      error: userMessage,
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined,
      processingTime: elapsedTime
    }, { status: statusCode })
  }
}
