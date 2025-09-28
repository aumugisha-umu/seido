/**
 * Utility functions to map quote status between French (UI) and English (Database)
 * This ensures we always send valid enum values to PostgreSQL while keeping French display
 */

// Database enum values (English)
export type DbQuoteStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled'

// UI display values (French)
export type UiQuoteStatus = 'En attente' | 'Accepté' | 'Refusé' | 'Expiré' | 'Annulé'

/**
 * Convert French UI status to English database status
 */
export function mapStatusToDb(uiStatus: string): DbQuoteStatus {
  const mapping: Record<string, DbQuoteStatus> = {
    'En attente': 'pending',
    'Accepté': 'approved',
    'Approuvé': 'approved',
    'Refusé': 'rejected',
    'Rejeté': 'rejected',
    'Expiré': 'expired',
    'Annulé': 'cancelled',
    // Handle if already in English (backward compatibility)
    'pending': 'pending',
    'approved': 'approved',
    'rejected': 'rejected',
    'expired': 'expired',
    'cancelled': 'cancelled'
  }

  const dbStatus = mapping[uiStatus]
  if (!dbStatus) {
    console.warn(`⚠️ Unknown quote status: ${uiStatus}, defaulting to 'pending'`)
    return 'pending'
  }

  return dbStatus
}

/**
 * Convert English database status to French UI status
 */
export function mapStatusFromDb(dbStatus: DbQuoteStatus): UiQuoteStatus {
  const mapping: Record<DbQuoteStatus, UiQuoteStatus> = {
    'pending': 'En attente',
    'approved': 'Accepté',
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
  return ['pending', 'approved', 'rejected', 'expired', 'cancelled'].includes(status as DbQuoteStatus)
}

/**
 * Normalize status - convert any format to valid database format
 */
export function normalizeStatus(status: string): DbQuoteStatus {
  return mapStatusToDb(status)
}
