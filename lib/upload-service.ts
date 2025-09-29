import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

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

  // NETTOYER le nom : supprimer espaces, accents, caractères spéciaux
  const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.')
    .replace(/[^a-zA-Z0-9]/g, '_') // Remplacer tout caractère non alphanum par _
    .replace(/_+/g, '_')          // Éviter les _ multiples
    .replace(/^_|_$/g, '')        // Supprimer _ au début/fin
    .toLowerCase()                 // Tout en minuscules

  // Ensure we have a valid name
  const cleanName = nameWithoutExt || 'document'

  return `${timestamp}-${randomString}-${cleanName}.${extension}`
}

interface UploadDocumentParams {
  file: File
  interventionId: string
  description?: string
  uploadedBy: string
  supabaseClient: SupabaseClient<Database>
}

/**
 * Internal upload function that uses the same logic as the working API
 * but with Service Role client for direct backend usage
 */
export async function uploadDocumentInternal({
  file,
  interventionId,
  description = '',
  uploadedBy,
  supabaseClient
}: UploadDocumentParams) {
  console.log("📁 [INTERNAL-UPLOAD] Starting file upload:", {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    interventionId
  })

  // Create Service Role client for file operations (bypass RLS)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase Service Role configuration')
  }

  const serviceClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error(`Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB). Taille maximale: 10MB`)
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
    throw new Error(`Type de fichier non autorisé: ${file.type}`)
  }

  // Verify that the user has access to this intervention (using auth client)
  const { data: intervention, error: interventionError } = await supabaseClient
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
    console.error("❌ [INTERNAL-UPLOAD] Intervention not found or access denied:", interventionError)
    throw new Error('Intervention non trouvée ou accès refusé')
  }

  // Check if user is member of the team
  const userHasAccess = intervention.team.members.some(
    (member: any) => member.user_id === uploadedBy
  )

  if (!userHasAccess) {
    console.error("❌ [INTERNAL-UPLOAD] User not member of intervention team")
    throw new Error('Accès refusé à cette intervention')
  }

  // Generate unique filename and storage path
  const uniqueFilename = generateUniqueFilename(file.name)
  const storagePath = `interventions/${interventionId}/${uniqueFilename}`

  console.log("☁️ [INTERNAL-UPLOAD] Uploading to Supabase Storage:", storagePath)

  // Upload file to Supabase Storage using Service Role client
  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from('intervention-documents')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false // Don't overwrite if file exists
    })

  if (uploadError) {
    console.error("❌ [INTERNAL-UPLOAD] Error uploading file to storage:", uploadError)
    throw new Error('Erreur lors de l\'upload du fichier: ' + uploadError.message)
  }

  console.log("✅ [INTERNAL-UPLOAD] File uploaded to storage:", uploadData.path)

  // Store document metadata in database using Service Role client
  const { data: document, error: docError } = await serviceClient
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
      uploaded_by: uploadedBy,
      description: description || `Document ajouté pour l'intervention`
    })
    .select(`
      *,
      uploaded_by_user:uploaded_by(name, email)
    `)
    .single()

  if (docError) {
    console.error("❌ [INTERNAL-UPLOAD] Error storing document metadata:", docError)

    // Try to clean up the uploaded file if metadata storage fails
    try {
      await serviceClient.storage
        .from('intervention-documents')
        .remove([uploadData.path])
      console.log("🧹 [INTERNAL-UPLOAD] Cleaned up uploaded file after metadata error")
    } catch (cleanupError) {
      console.error("⚠️ [INTERNAL-UPLOAD] Error cleaning up uploaded file:", cleanupError)
    }

    throw new Error('Erreur lors de l\'enregistrement des métadonnées du document')
  }

  console.log("✅ [INTERNAL-UPLOAD] Document metadata stored:", document.id)

  // Update intervention to mark it as having attachments
  const { error: updateError } = await serviceClient
    .from('interventions')
    .update({ has_attachments: true })
    .eq('id', interventionId)

  if (updateError) {
    console.warn("⚠️ [INTERNAL-UPLOAD] Warning: Could not update intervention has_attachments flag:", updateError)
  }

  // Create a signed URL for immediate access (valid for 1 hour)
  let signedUrl = null
  try {
    const { data } = await serviceClient.storage
      .from('intervention-documents')
      .createSignedUrl(document.storage_path, 3600) // 1 hour

    signedUrl = data?.signedUrl
  } catch (urlError) {
    console.warn("⚠️ [INTERNAL-UPLOAD] Could not create signed URL:", urlError)
  }

  console.log("🎉 [INTERNAL-UPLOAD] Document upload completed successfully")

  return {
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
        name: document.uploaded_by_user?.name,
        email: document.uploaded_by_user?.email
      }
    }
  }
}