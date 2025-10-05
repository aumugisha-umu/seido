import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
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
function generateUniqueFilename(_originalFilename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalFilename.split('.').pop()
  const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.')
  
  return `${timestamp}-${randomString}-${nameWithoutExt}.${extension}`
}

export async function POST(request: NextRequest) {
  logger.info("📤 upload-intervention-document API route called")
  
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
            } catch {
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

    // Parse the form data
    const formData = await request.formData()
    const interventionId = formData.get('interventionId') as string
    const file = formData.get('file') as File
    const description = formData.get('description') as string || ''

    if (!interventionId || !file) {
      return NextResponse.json({ 
        error: 'interventionId et file sont requis' 
      }, { status: 400 })
    }

    logger.info("📁 Processing file upload:", {
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
      logger.error("❌ Intervention not found or access denied:", interventionError)
      return NextResponse.json({ 
        error: 'Intervention non trouvée ou accès refusé' 
      }, { status: 403 })
    }

    // Check if user is member of the team
    const userHasAccess = intervention.team.members.some(
      (member) => member.user_id === user.id
    )

    if (!userHasAccess) {
      logger.error("❌ User not member of intervention team")
      return NextResponse.json({ 
        error: 'Accès refusé à cette intervention' 
      }, { status: 403 })
    }

    // Generate unique filename and storage path
    const uniqueFilename = generateUniqueFilename(file.name)
    const storagePath = `interventions/${interventionId}/${uniqueFilename}`

    logger.info("☁️ Uploading to Supabase Storage:", storagePath)

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('intervention-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false // Don't overwrite if file exists
      })

    if (uploadError) {
      logger.error("❌ Error uploading file to storage:", uploadError)
      return NextResponse.json({ 
        error: 'Erreur lors de l\'upload du fichier: ' + uploadError.message 
      }, { status: 500 })
    }

    logger.info("✅ File uploaded to storage:", uploadData.path)

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
        uploaded_by: user.id,
        description: description || `Document ajouté pour l'intervention`
      })
      .select(`
        *,
        uploaded_by_user:uploaded_by(name, email)
      `)
      .single()

    if (docError) {
      logger.error("❌ Error storing document metadata:", docError)
      
      // Try to clean up the uploaded file if metadata storage fails
      try {
        await supabase.storage
          .from('intervention-documents')
          .remove([uploadData.path])
      } catch (cleanupError) {
        logger.error("⚠️ Error cleaning up uploaded file:", cleanupError)
      }
      
      return NextResponse.json({ 
        error: 'Erreur lors de l\'enregistrement des métadonnées du document' 
      }, { status: 500 })
    }

    logger.info("✅ Document metadata stored:", document.id)

    // Update intervention to mark it as having attachments
    const { error: updateError } = await supabase
      .from('interventions')
      .update({ has_attachments: true })
      .eq('id', interventionId)

    if (updateError) {
      logger.warn("⚠️ Warning: Could not update intervention has_attachments flag:", updateError)
      // Don't fail the entire operation for this
    }

    logger.info("🎉 Document upload completed successfully")

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
        uploadedBy: {
          name: document.uploaded_by_user?.name || 'Utilisateur',
          email: document.uploaded_by_user?.email
        }
      },
      message: 'Document uploadé avec succès'
    })

  } catch (error) {
    logger.error("❌ Error in upload-intervention-document API:", error)
    logger.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur lors de l\'upload du document'
    }, { status: 500 })
  }
}
