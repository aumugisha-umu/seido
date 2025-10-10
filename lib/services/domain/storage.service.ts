/**
 * StorageService - Service pour gérer les opérations sur Supabase Storage
 *
 * Gère:
 * - Upload de fichiers avec validation
 * - Download de fichiers (signed URLs)
 * - Suppression de fichiers
 * - Validation de type MIME et taille
 *
 * Buckets supportés:
 * - property-documents (Phase 2)
 * - intervention-documents (existant)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { Database } from '@/lib/database.types'

export interface UploadFileOptions {
  bucket: string
  path: string
  file: File | Buffer
  contentType?: string
  upsert?: boolean
}

export interface UploadFileResult {
  success: boolean
  data?: {
    path: string
    fullPath: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface DownloadFileOptions {
  bucket: string
  path: string
  expiresIn?: number // Durée de validité du signed URL en secondes (défaut: 1 heure)
}

export interface DownloadFileResult {
  success: boolean
  data?: {
    signedUrl: string
    expiresAt: Date
  }
  error?: {
    code: string
    message: string
  }
}

export interface DeleteFileOptions {
  bucket: string
  paths: string[]
}

export interface DeleteFileResult {
  success: boolean
  error?: {
    code: string
    message: string
  }
}

// Configuration des types MIME autorisés par bucket
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'property-documents': [
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
  ],
  'intervention-documents': [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
}

// Limite de taille par bucket (en bytes)
const MAX_FILE_SIZE: Record<string, number> = {
  'property-documents': 10 * 1024 * 1024, // 10 MB
  'intervention-documents': 5 * 1024 * 1024, // 5 MB
}

export class StorageService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Valider un fichier avant upload
   */
  private validateFile(
    file: File | Buffer,
    bucket: string,
    contentType?: string
  ): { valid: boolean; error?: string } {
    // Vérifier la taille
    const maxSize = MAX_FILE_SIZE[bucket] || 10 * 1024 * 1024
    const fileSize = file instanceof File ? file.size : file.length

    if (fileSize > maxSize) {
      return {
        valid: false,
        error: `Fichier trop volumineux (max: ${maxSize / 1024 / 1024} MB)`
      }
    }

    // Vérifier le type MIME
    const allowedTypes = ALLOWED_MIME_TYPES[bucket] || []
    const mimeType = file instanceof File ? file.type : contentType

    if (allowedTypes.length > 0 && mimeType && !allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `Type de fichier non autorisé: ${mimeType}`
      }
    }

    return { valid: true }
  }

  /**
   * Upload un fichier vers Supabase Storage
   */
  async uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
    try {
      const { bucket, path, file, contentType, upsert = false } = options

      // Validation
      const validation = this.validateFile(file, bucket, contentType)
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error || 'Validation failed'
          }
        }
      }

      logger.info({ bucket, path }, '📤 [STORAGE] Uploading file')

      // Upload vers Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: contentType || (file instanceof File ? file.type : undefined),
          upsert
        })

      if (error) {
        logger.error({ error, bucket, path }, '❌ [STORAGE] Upload failed')
        return {
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: error.message
          }
        }
      }

      logger.info({ bucket, path: data.path }, '✅ [STORAGE] Upload successful')

      return {
        success: true,
        data: {
          path: data.path,
          fullPath: `${bucket}/${data.path}`
        }
      }
    } catch (error) {
      logger.error({ error }, '❌ [STORAGE] Unexpected upload error')
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Télécharger un fichier (obtenir un signed URL)
   */
  async downloadFile(options: DownloadFileOptions): Promise<DownloadFileResult> {
    try {
      const { bucket, path, expiresIn = 3600 } = options // Défaut: 1 heure

      logger.info({ bucket, path, expiresIn }, '📥 [STORAGE] Generating signed URL')

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (error) {
        logger.error({ error, bucket, path }, '❌ [STORAGE] Failed to generate signed URL')
        return {
          success: false,
          error: {
            code: 'DOWNLOAD_ERROR',
            message: error.message
          }
        }
      }

      const expiresAt = new Date(Date.now() + expiresIn * 1000)

      logger.info({ bucket, path, expiresAt }, '✅ [STORAGE] Signed URL generated')

      return {
        success: true,
        data: {
          signedUrl: data.signedUrl,
          expiresAt
        }
      }
    } catch (error) {
      logger.error({ error }, '❌ [STORAGE] Unexpected download error')
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Supprimer un ou plusieurs fichiers
   */
  async deleteFiles(options: DeleteFileOptions): Promise<DeleteFileResult> {
    try {
      const { bucket, paths } = options

      logger.info({ bucket, count: paths.length }, '🗑️ [STORAGE] Deleting files')

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .remove(paths)

      if (error) {
        logger.error({ error, bucket, paths }, '❌ [STORAGE] Delete failed')
        return {
          success: false,
          error: {
            code: 'DELETE_ERROR',
            message: error.message
          }
        }
      }

      logger.info({ bucket, deletedCount: data?.length || 0 }, '✅ [STORAGE] Files deleted')

      return { success: true }
    } catch (error) {
      logger.error({ error }, '❌ [STORAGE] Unexpected delete error')
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Obtenir l'URL publique d'un fichier (pour buckets publics uniquement)
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * Lister les fichiers d'un dossier
   */
  async listFiles(bucket: string, path: string = '') {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(path)

      if (error) {
        logger.error({ error, bucket, path }, '❌ [STORAGE] List failed')
        return {
          success: false as const,
          error: {
            code: 'LIST_ERROR',
            message: error.message
          }
        }
      }

      return {
        success: true as const,
        data: data || []
      }
    } catch (error) {
      logger.error({ error }, '❌ [STORAGE] Unexpected list error')
      return {
        success: false as const,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }
}

/**
 * Factory function pour créer une instance de StorageService
 */
export function createStorageService(supabase: SupabaseClient<Database>): StorageService {
  return new StorageService(supabase)
}
