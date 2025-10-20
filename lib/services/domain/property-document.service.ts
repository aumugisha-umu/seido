/**
 * PropertyDocument Service - Phase 2
 * Business logic layer for property document management with visibility controls
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  PropertyDocumentRepository,
  createPropertyDocumentRepository,
  createServerPropertyDocumentRepository
} from '../repositories/property-document.repository'
import type {
  PropertyDocument,
  PropertyDocumentInsert,
  PropertyDocumentUpdate,
  PropertyDocumentType,
  DocumentVisibilityLevel,
  CreatePropertyDocumentDTO,
  UpdatePropertyDocumentDTO,
  ServiceOptions
} from '../core/service-types'
import {
  ValidationError,
  PermissionError,
  NotFoundException,
  handleError
} from '../core/error-handler'
import { logger } from '@/lib/logger'

/**
 * PropertyDocumentService
 * Handles business logic for property document operations with RLS-compliant visibility controls
 */
export class PropertyDocumentService {
  constructor(private repository: PropertyDocumentRepository) {}

  /**
   * Upload a new property document
   * Gestionnaires and admins can upload; visibility controlled by RLS
   */
  async uploadDocument(
    data: CreatePropertyDocumentDTO,
    options?: ServiceOptions
  ): Promise<{ success: boolean; data?: PropertyDocument; error?: unknown }> {
    try {
      // Permission check: only gestionnaires and admins can upload
      if (options?.userRole && !['gestionnaire', 'admin'].includes(options.userRole)) {
        throw new PermissionError('Only managers and admins can upload documents')
      }

      // Validate mutually exclusive building_id / lot_id
      if (!data.building_id && !data.lot_id) {
        throw new ValidationError('Either building_id or lot_id must be provided')
      }
      if (data.building_id && data.lot_id) {
        throw new ValidationError('Cannot provide both building_id and lot_id')
      }

      // Prepare insert data
      const insertData: PropertyDocumentInsert = {
        building_id: data.building_id,
        lot_id: data.lot_id,
        team_id: data.team_id,
        document_type: data.document_type,
        visibility_level: data.visibility_level || 'equipe', // Default: team visibility
        title: data.title,
        description: data.description,
        filename: data.filename,
        original_filename: data.original_filename,
        file_size: data.file_size,
        mime_type: data.mime_type,
        storage_path: data.storage_path,
        storage_bucket: data.storage_bucket || 'property-documents',
        uploaded_by: options?.userId || data.uploaded_by
      }

      // Create document record
      const result = await this.repository.create(insertData)

      if (!result.success || !result.data) {
        throw new Error('Failed to create document record')
      }

      logger.info(
        `✅ [PROPERTY-DOC-SERVICE] Document uploaded: ${result.data.id} (${result.data.filename})`
      )

      return {
        success: true,
        data: result.data as PropertyDocument
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] uploadDocument error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:upload')
      }
    }
  }

  /**
   * Get document by ID (RLS-protected)
   */
  async getDocument(
    id: string,
    options?: ServiceOptions
  ): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
    try {
      const result = await this.repository.findByIdWithRelations(id)

      if (!result.success) {
        throw new NotFoundException('property_documents', id)
      }

      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] getDocument error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:get')
      }
    }
  }

  /**
   * Get documents for a team (RLS-protected)
   */
  async getDocumentsByTeam(
    teamId: string,
    options?: { includeArchived?: boolean }
  ): Promise<{ success: boolean; data?: PropertyDocument[]; error?: unknown }> {
    try {
      const result = await this.repository.findByTeam(teamId, options)

      if (!result.success) {
        throw new Error('Failed to fetch team documents')
      }

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] getDocumentsByTeam error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:listByTeam')
      }
    }
  }

  /**
   * Get documents for a building
   */
  async getDocumentsByBuilding(
    buildingId: string,
    options?: { includeArchived?: boolean }
  ): Promise<{ success: boolean; data?: PropertyDocument[]; error?: unknown }> {
    try {
      const result = await this.repository.findByBuilding(buildingId, options)

      if (!result.success) {
        throw new Error('Failed to fetch building documents')
      }

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] getDocumentsByBuilding error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:listByBuilding')
      }
    }
  }

  /**
   * Get documents for a lot
   */
  async getDocumentsByLot(
    lotId: string,
    options?: { includeArchived?: boolean }
  ): Promise<{ success: boolean; data?: PropertyDocument[]; error?: unknown }> {
    try {
      const result = await this.repository.findByLot(lotId, options)

      if (!result.success) {
        throw new Error('Failed to fetch lot documents')
      }

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] getDocumentsByLot error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:listByLot')
      }
    }
  }

  /**
   * Update document metadata
   * Only gestionnaires/admins or uploader can update
   */
  async updateDocument(
    id: string,
    data: UpdatePropertyDocumentDTO,
    options?: ServiceOptions
  ): Promise<{ success: boolean; data?: PropertyDocument; error?: unknown }> {
    try {
      // Permission check
      if (options?.userRole && !['gestionnaire', 'admin'].includes(options.userRole)) {
        // Check if user is the uploader
        const docResult = await this.repository.findById(id)
        if (
          !docResult.success ||
          !docResult.data ||
          docResult.data.uploaded_by !== options.userId
        ) {
          throw new PermissionError('Only managers, admins, or uploader can update documents')
        }
      }

      // Check if document exists
      const existingResult = await this.repository.findById(id)
      if (!existingResult.success || !existingResult.data) {
        throw new NotFoundException('property_documents', id)
      }

      // Prepare update data
      const updateData: PropertyDocumentUpdate = {
        ...data,
        updated_at: new Date().toISOString()
      }

      // Update document
      const result = await this.repository.update(id, updateData)

      if (!result.success || !result.data) {
        throw new Error('Failed to update document')
      }

      logger.info(`✅ [PROPERTY-DOC-SERVICE] Document updated: ${id}`)

      return {
        success: true,
        data: result.data as PropertyDocument
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] updateDocument error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:update')
      }
    }
  }

  /**
   * Delete document (soft delete)
   * Only gestionnaires/admins can delete
   */
  async deleteDocument(
    id: string,
    options?: ServiceOptions
  ): Promise<{ success: boolean; error?: unknown }> {
    try {
      // Permission check
      if (options?.userRole && !['gestionnaire', 'admin'].includes(options.userRole)) {
        throw new PermissionError('Only managers and admins can delete documents')
      }

      // Check if document exists
      const existingResult = await this.repository.findById(id)
      if (!existingResult.success || !existingResult.data) {
        throw new NotFoundException('property_documents', id)
      }

      // Soft delete (sets deleted_at)
      const result = await this.repository.softDelete(id, options?.userId)

      if (!result.success) {
        throw new Error('Failed to delete document')
      }

      logger.info(`✅ [PROPERTY-DOC-SERVICE] Document deleted: ${id}`)

      // TODO: Also delete file from Supabase Storage
      // await this.deleteFileFromStorage(existingResult.data.storage_path)

      return { success: true }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] deleteDocument error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:delete')
      }
    }
  }

  /**
   * Archive document (soft operation)
   */
  async archiveDocument(
    id: string,
    options?: ServiceOptions
  ): Promise<{ success: boolean; data?: PropertyDocument; error?: unknown }> {
    try {
      // Permission check
      if (options?.userRole && !['gestionnaire', 'admin'].includes(options.userRole)) {
        throw new PermissionError('Only managers and admins can archive documents')
      }

      const result = await this.repository.archive(id)

      if (!result.success || !result.data) {
        throw new Error('Failed to archive document')
      }

      logger.info(`✅ [PROPERTY-DOC-SERVICE] Document archived: ${id}`)

      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] archiveDocument error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:archive')
      }
    }
  }

  /**
   * Unarchive document
   */
  async unarchiveDocument(
    id: string,
    options?: ServiceOptions
  ): Promise<{ success: boolean; data?: PropertyDocument; error?: unknown }> {
    try {
      // Permission check
      if (options?.userRole && !['gestionnaire', 'admin'].includes(options.userRole)) {
        throw new PermissionError('Only managers and admins can unarchive documents')
      }

      const result = await this.repository.unarchive(id)

      if (!result.success || !result.data) {
        throw new Error('Failed to unarchive document')
      }

      logger.info(`✅ [PROPERTY-DOC-SERVICE] Document unarchived: ${id}`)

      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] unarchiveDocument error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:unarchive')
      }
    }
  }

  /**
   * Update document visibility
   * Only gestionnaires/admins can change visibility
   */
  async updateVisibility(
    id: string,
    visibilityLevel: DocumentVisibilityLevel,
    options?: ServiceOptions
  ): Promise<{ success: boolean; data?: PropertyDocument; error?: unknown }> {
    try {
      // Permission check
      if (options?.userRole && !['gestionnaire', 'admin'].includes(options.userRole)) {
        throw new PermissionError('Only managers and admins can change document visibility')
      }

      const result = await this.repository.updateVisibility(id, visibilityLevel)

      if (!result.success || !result.data) {
        throw new Error('Failed to update visibility')
      }

      logger.info(`✅ [PROPERTY-DOC-SERVICE] Visibility updated for document ${id}: ${visibilityLevel}`)

      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] updateVisibility error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:updateVisibility')
      }
    }
  }

  /**
   * Search documents by filename or title
   */
  async searchDocuments(
    query: string,
    options?: { teamId?: string; buildingId?: string; lotId?: string }
  ): Promise<{ success: boolean; data?: PropertyDocument[]; error?: unknown }> {
    try {
      const result = await this.repository.search(query, options)

      if (!result.success) {
        throw new Error('Search failed')
      }

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] searchDocuments error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:search')
      }
    }
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(
    documentType: PropertyDocumentType,
    options?: { teamId?: string; buildingId?: string; lotId?: string }
  ): Promise<{ success: boolean; data?: PropertyDocument[]; error?: unknown }> {
    try {
      const result = await this.repository.findByType(documentType, options)

      if (!result.success) {
        throw new Error('Failed to fetch documents by type')
      }

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] getDocumentsByType error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:listByType')
      }
    }
  }

  /**
   * Get documents expiring soon (for alerts)
   */
  async getExpiringSoonDocuments(
    teamId: string,
    daysThreshold = 30
  ): Promise<{ success: boolean; data?: PropertyDocument[]; error?: unknown }> {
    try {
      const result = await this.repository.findExpiringSoon(teamId, daysThreshold)

      if (!result.success) {
        throw new Error('Failed to fetch expiring documents')
      }

      logger.info(
        `📅 [PROPERTY-DOC-SERVICE] Found ${result.data?.length || 0} documents expiring in ${daysThreshold} days`
      )

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] getExpiringSoonDocuments error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:expiringSoon')
      }
    }
  }

  /**
   * Get expired documents
   */
  async getExpiredDocuments(
    teamId: string
  ): Promise<{ success: boolean; data?: PropertyDocument[]; error?: unknown }> {
    try {
      const result = await this.repository.findExpired(teamId)

      if (!result.success) {
        throw new Error('Failed to fetch expired documents')
      }

      logger.warn(
        `⚠️ [PROPERTY-DOC-SERVICE] Found ${result.data?.length || 0} expired documents for team ${teamId}`
      )

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] getExpiredDocuments error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:expired')
      }
    }
  }

  /**
   * Get document count statistics by type
   */
  async getDocumentStatsByType(
    teamId: string
  ): Promise<{ success: boolean; data?: Record<string, number>; error?: unknown }> {
    try {
      const result = await this.repository.getCountByType(teamId)

      if (!result.success) {
        throw new Error('Failed to calculate document statistics')
      }

      return {
        success: true,
        data: result.data || {}
      }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-SERVICE] getDocumentStatsByType error:', error)
      return {
        success: false,
        error: handleError(error as Error, 'property_document:stats')
      }
    }
  }

  // Private helper methods

  /**
   * Delete file from Supabase Storage
   * TODO: Implement when file service is available
   */
  private async deleteFileFromStorage(storagePath: string): Promise<void> {
    logger.warn(`⚠️ [PROPERTY-DOC-SERVICE] Storage deletion not implemented: ${storagePath}`)
    // Implementation will use Supabase Storage API
  }
}

// Factory functions for creating service instances
export const createPropertyDocumentService = (supabase: SupabaseClient) => {
  const repository = createPropertyDocumentRepository(supabase)
  return new PropertyDocumentService(repository)
}

export const createServerPropertyDocumentService = async () => {
  const repository = await createServerPropertyDocumentRepository()
  return new PropertyDocumentService(repository)
}
