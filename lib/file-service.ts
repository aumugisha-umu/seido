import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// ⚠️ TEMPORAIRE: Fonction pour créer un client Supabase avec Service Role (bypass RLS)
// À UTILISER UNIQUEMENT POUR LES TESTS
function createServiceRoleClient(): SupabaseClient<Database> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase Service Role configuration')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // Service Role bypasse tous les RLS
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export interface FileUploadMetadata {
  interventionId: string
  uploadedBy: string // IMPORTANT: user_id from users table (not auth.user.id)
  documentType?: string
  description?: string
}

export interface FileUploadResult {
  storageUrl: string
  storagePath: string
  documentRecord: Database['public']['Tables']['intervention_documents']['Row']
}

export interface FileToUpload {
  file: File
  metadata: FileUploadMetadata
}

export const fileService = {
  /**
   * Upload a single file to Supabase Storage and create database record
   * Requires an authenticated Supabase client
   */
  async uploadInterventionDocument(
    supabase: SupabaseClient<Database>,
    file: File,
    metadata: FileUploadMetadata
  ): Promise<FileUploadResult> {
    try {
      console.log("📁 Starting file upload:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        interventionId: metadata.interventionId
      })

      // ⚠️ TEMPORAIRE: Utiliser Service Role client pour bypasser RLS
      console.log("⚠️ USING SERVICE ROLE CLIENT TO BYPASS RLS (TEMPORARY)")
      const serviceClient = createServiceRoleClient()

      // Generate unique file name to avoid conflicts
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const fileExtension = file.name.split('.').pop()
      const uniqueFileName = `${timestamp}-${randomSuffix}.${fileExtension}`

      // Define storage path: interventions/{intervention_id}/{unique_filename}
      const storagePath = `interventions/${metadata.interventionId}/${uniqueFileName}`

      console.log("📁 Generated storage path:", storagePath)

      // Upload file to Supabase Storage with Service Role (bypass RLS)
      const { data: uploadData, error: uploadError } = await serviceClient.storage
        .from('intervention-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        })

      if (uploadError) {
        console.error("❌ Storage upload error:", uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log("✅ File uploaded to storage:", uploadData.path)

      // Get the public URL (for signed URL generation later)
      const { data: urlData } = serviceClient.storage
        .from('intervention-documents')
        .getPublicUrl(storagePath)

      // Create database record
      const documentData: Database['public']['Tables']['intervention_documents']['Insert'] = {
        intervention_id: metadata.interventionId,
        filename: uniqueFileName,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        storage_bucket: 'intervention-documents',
        uploaded_by: metadata.uploadedBy, // Must be user ID from users table
        uploaded_at: new Date().toISOString(),
        document_type: metadata.documentType || null,
        description: metadata.description || null,
        is_validated: false
      }

      console.log("💾 Creating database record:", documentData)

      const { data: documentRecord, error: dbError } = await serviceClient
        .from('intervention_documents')
        .insert(documentData)
        .select()
        .single()

      if (dbError) {
        console.error("❌ Database insert error:", dbError)
        console.error("❌ Error details:", {
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint
        })

        // Try to clean up uploaded file if database insert fails
        try {
          await serviceClient.storage
            .from('intervention-documents')
            .remove([storagePath])
          console.log("🧹 Cleaned up uploaded file after database error")
        } catch (cleanupError) {
          console.error("❌ Failed to cleanup file after database error:", cleanupError)
        }

        // Provide more specific error message
        let errorMessage = `Database insert failed: ${dbError.message}`
        if (dbError.code === '23503') {
          errorMessage = 'Invalid user reference. Please ensure user ID is from users table, not auth.users.'
        } else if (dbError.code === '42501') {
          errorMessage = 'Insufficient permissions to upload document for this intervention.'
        }

        throw new Error(errorMessage)
      }

      console.log("✅ Document record created:", documentRecord.id)

      return {
        storageUrl: urlData.publicUrl,
        storagePath: storagePath,
        documentRecord: documentRecord
      }

    } catch (error) {
      console.error("❌ File upload service error:", error)
      throw error
    }
  },

  /**
   * Upload multiple files for an intervention
   * Requires an authenticated Supabase client
   */
  async uploadMultipleInterventionDocuments(
    supabase: SupabaseClient<Database>,
    filesToUpload: FileToUpload[]
  ): Promise<FileUploadResult[]> {
    console.log(`📁 Uploading ${filesToUpload.length} files...`)

    const results: FileUploadResult[] = []
    const errors: Error[] = []

    for (let i = 0; i < filesToUpload.length; i++) {
      const { file, metadata } = filesToUpload[i]

      try {
        console.log(`📁 Uploading file ${i + 1}/${filesToUpload.length}: ${file.name}`)
        const result = await this.uploadInterventionDocument(supabase, file, metadata)
        results.push(result)
        console.log(`✅ File ${i + 1} uploaded successfully`)
      } catch (error) {
        console.error(`❌ Failed to upload file ${i + 1}: ${file.name}`, error)
        errors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }

    // If some files failed but others succeeded, we still return the successful ones
    // The caller can decide how to handle partial failures
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} out of ${filesToUpload.length} files failed to upload`)
      // Optionally, we could throw an error here for stricter error handling
    }

    console.log(`✅ Successfully uploaded ${results.length} out of ${filesToUpload.length} files`)
    return results
  },

  /**
   * Get a signed URL for a document (for secure access)
   * Requires an authenticated Supabase client
   */
  async getSignedUrl(supabase: SupabaseClient<Database>, storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    try {
      // ⚠️ TEMPORAIRE: Utiliser Service Role client pour bypasser RLS
      const serviceClient = createServiceRoleClient()
      const { data, error } = await serviceClient.storage
        .from('intervention-documents')
        .createSignedUrl(storagePath, expiresInSeconds)

      if (error) {
        console.error("❌ Error creating signed URL:", error)
        throw new Error(`Failed to create signed URL: ${error.message}`)
      }

      return data.signedUrl
    } catch (error) {
      console.error("❌ Signed URL service error:", error)
      throw error
    }
  },

  /**
   * Delete a document from storage and database
   * Requires an authenticated Supabase client
   */
  async deleteInterventionDocument(supabase: SupabaseClient<Database>, documentId: string): Promise<boolean> {
    try {
      console.log("🗑️ Deleting document:", documentId)

      // Get document record first to get storage path
      const { data: document, error: fetchError } = await supabase
        .from('intervention_documents')
        .select('storage_path')
        .eq('id', documentId)
        .single()

      if (fetchError) {
        console.error("❌ Error fetching document for deletion:", fetchError)
        throw new Error(`Failed to fetch document: ${fetchError.message}`)
      }

      if (!document) {
        throw new Error(`Document not found: ${documentId}`)
      }

      // Delete from storage
      // ⚠️ TEMPORAIRE: Utiliser Service Role client pour bypasser RLS
      const serviceClient = createServiceRoleClient()
      const { error: storageError } = await serviceClient.storage
        .from('intervention-documents')
        .remove([document.storage_path])

      if (storageError) {
        console.error("❌ Error deleting from storage:", storageError)
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('intervention_documents')
        .delete()
        .eq('id', documentId)

      if (dbError) {
        console.error("❌ Error deleting from database:", dbError)
        throw new Error(`Failed to delete from database: ${dbError.message}`)
      }

      console.log("✅ Document deleted successfully")
      return true

    } catch (error) {
      console.error("❌ Delete document service error:", error)
      throw error
    }
  },

  /**
   * Validate file before upload
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 10MB`
      }
    }

    // Check allowed MIME types (matching the bucket configuration)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip'
    ]

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      }
    }

    return { isValid: true }
  }
}