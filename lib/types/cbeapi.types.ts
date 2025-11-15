/**
 * CBEAPI Types
 * Type definitions for CBEAPI.be (Belgian Company Database API)
 * API Documentation: https://cbeapi.be/en/docs
 */

/**
 * Response structure from CBEAPI search endpoint
 */
export interface CbeApiResponse {
  metadata: {
    current_page: number
    last_page: number
    per_page?: number
    total: number
  }
  data: CbeApiCompany[]
}

/**
 * Company data structure from CBEAPI
 */
export interface CbeApiCompany {
  // Identifiers
  cbe_number: string // 10-digit Belgian company number (without "BE" prefix)

  // Basic info
  denomination: string // Company name
  legal_form: string | null // Legal form (e.g., "Société Anonyme", "SPRL")
  status: 'active' | 'inactive' | string // Company status
  start_date: string | null // Registration date (ISO format)

  // Address
  address: {
    street: string | null
    street_number: string | null // ✅ Real field name from CBEAPI
    box?: string | null // Optional box/suite number
    post_code: string | null // ✅ Real field name from CBEAPI (not "zipcode")
    city: string | null
    country_code: string | null // ✅ Real field name from CBEAPI (e.g., "BE")
    full_address?: string | null // Complete address string
  }

  // NACE codes (activity codes)
  nace_codes?: Array<{
    code: string // e.g., "62.010"
    description: string // e.g., "Programmation informatique"
    type: 'main' | 'secondary' // Main or secondary activity
  }>

  // Contact information
  contact?: {
    phone: string | null
    email: string | null
    website: string | null
  }

  // Legal situation
  juridical_situation?: {
    status: string | null
    date: string | null
  }
}

/**
 * Normalized company data for SEIDO application
 * This is what we return from CompanyLookupService
 */
export interface CompanyLookupResult {
  // Required fields
  name: string
  vat_number: string // Full VAT number with "BE" prefix

  // Address (structured)
  street: string
  street_number: string
  postal_code: string
  city: string
  country: string // ISO 3166-1 alpha-2 (e.g., "BE")

  // Optional fields
  box?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  legal_form?: string | null
  status: 'active' | 'inactive'

  // Metadata
  source: 'cbeapi' // API source
  fetched_at: string // ISO timestamp
}

/**
 * Error response from CBEAPI
 */
export interface CbeApiError {
  error: string
  message: string
  success: 0
}

/**
 * Service response wrapper
 */
export type CompanyLookupServiceResponse =
  | { success: true; data: CompanyLookupResult }
  | { success: false; error: string; code?: 'NOT_FOUND' | 'INVALID_VAT' | 'API_ERROR' | 'TIMEOUT' }
