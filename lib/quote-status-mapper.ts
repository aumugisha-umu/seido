import { logger } from '@/lib/logger'

/**
 * Utility functions to map quote status between French (UI) and English (Database)
 * This ensures we always send valid enum values to PostgreSQL while keeping French display
 */

// Database enum values (English) — matches DB constraint:
// ('draft', 'pending', 'sent', 'accepted', 'rejected', 'expired', 'cancelled')
export type DbQuoteStatus = 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled'

// UI display values (French)
export type UiQuoteStatus = 'Brouillon' | 'En attente' | 'Envoyé' | 'Accepté' | 'Refusé' | 'Expiré' | 'Annulé'

/**
 * Convert French UI status to English database status
 */
export function mapStatusToDb(uiStatus: string): DbQuoteStatus {
  const mapping: Record<string, DbQuoteStatus> = {
    'Brouillon': 'draft',
    'En attente': 'pending',
    'Envoyé': 'sent',
    'Accepté': 'accepted',
    'Approuvé': 'accepted',
    'Refusé': 'rejected',
    'Rejeté': 'rejected',
    'Expiré': 'expired',
    'Annulé': 'cancelled',
    // Handle if already in English (backward compatibility)
    'draft': 'draft',
    'pending': 'pending',
    'sent': 'sent',
    'accepted': 'accepted',
    'approved': 'accepted', // Legacy mapping
    'rejected': 'rejected',
    'expired': 'expired',
    'cancelled': 'cancelled'
  }

  const dbStatus = mapping[uiStatus]
  if (!dbStatus) {
    logger.warn(`⚠️ Unknown quote status: ${uiStatus}, defaulting to 'pending'`)
    return 'pending'
  }

  return dbStatus
}

/**
 * Convert English database status to French UI status
 */
export function mapStatusFromDb(dbStatus: DbQuoteStatus): UiQuoteStatus {
  const mapping: Record<DbQuoteStatus, UiQuoteStatus> = {
    'draft': 'Brouillon',
    'pending': 'En attente',
    'sent': 'Envoyé',
    'accepted': 'Accepté',
    'rejected': 'Refusé',
    'expired': 'Expiré',
    'cancelled': 'Annulé'
  }

  return mapping[dbStatus] || 'En attente'
}

/**
 * Check if a status is valid for database storage
 */
export function isValidDbStatus(status: string): status is DbQuoteStatus {
  return ['draft', 'pending', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'].includes(status as DbQuoteStatus)
}

/**
 * Normalize status - convert any format to valid database format
 */
export function normalizeStatus(status: string): DbQuoteStatus {
  return mapStatusToDb(status)
}
