/**
 * Company Lookup Service
 * Handles company data lookup via external APIs (CBEAPI.be for Belgium)
 * Implements caching strategy to minimize API calls
 */

import Redis from 'ioredis'
import { validateVatNumber, normalizeVatNumber } from '@/lib/utils/vat-validator'
import type {
  CbeApiResponse,
  CbeApiCompany,
  CompanyLookupResult,
  CompanyLookupServiceResponse
} from '@/lib/types/cbeapi.types'
import { logger, logError } from '@/lib/logger'

/**
 * Configuration for CBEAPI
 * Optimized timeouts: 3s for direct lookup (fast), 6s for search (slower)
 * Reduced retries: 1 retry max (2 attempts total) for faster failure feedback
 */
const CBEAPI_CONFIG = {
  baseUrl: process.env.CBEAPI_URL || 'https://cbeapi.be/api/v1',
  apiKey: process.env.CBEAPI_KEY || '',
  timeouts: {
    directLookup: 3000,   // 3 seconds for /company/{id} (should be fast)
    search: 6000          // 6 seconds for /company/search (can be slower)
  },
  maxRetries: 1,          // 2 attempts total (1 initial + 1 retry) instead of 3
  retryDelay: 300         // 300ms between retries (reduced from 1000ms)
}

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  ttl: 30 * 24 * 60 * 60, // 30 days in seconds
  keyPrefix: 'company:vat:' // Redis key prefix
}

/**
 * CompanyLookupService
 * Orchestrates company data lookup from external APIs with intelligent caching
 */
export class CompanyLookupService {
  private redis: Redis | null = null

  constructor(redisClient?: Redis) {
    this.redis = redisClient || this.createRedisClient()
  }

  /**
   * Create Redis client (lazy initialization)
   */
  private createRedisClient(): Redis | null {
    try {
      if (!process.env.REDIS_URL) {
        logger.warn('[COMPANY-LOOKUP] Redis URL not configured, caching disabled')
        return null
      }
      return new Redis(process.env.REDIS_URL)
    } catch (error) {
      logError(error, '[COMPANY-LOOKUP] Failed to create Redis client')
      return null
    }
  }

  /**
   * Search companies by name
   * Returns multiple results (unlike lookupByVAT which returns single result)
   * 1. Check cache (optional for name search)
   * 2. Call CBEAPI with name parameter
   * 3. Return list of matching companies
   * @param name - Company name (partial match supported)
   * @param teamId - Team ID for multi-tenant support (future use)
   * @param limit - Maximum number of results (default: 10)
   * @returns List of companies or error
   */
  async searchByName(
    name: string,
    teamId?: string,
    limit: number = 10
  ): Promise<{ success: true; data: CompanyLookupResult[] } | { success: false; error: string; code?: string }> {
    try {
      // 1. Validate name
      if (!name.trim()) {
        return {
          success: false,
          error: 'Le nom de l\'entreprise est requis',
          code: 'INVALID_NAME'
        }
      }

      if (name.trim().length < 2) {
        return {
          success: false,
          error: 'Le nom doit contenir au moins 2 caractères',
          code: 'INVALID_NAME'
        }
      }

      logger.info({
        name: name.trim(),
        teamId,
        limit
      }, '[COMPANY-LOOKUP] Starting name search')

      // 2. Call CBEAPI (Belgian companies only for now)
      const url = `${CBEAPI_CONFIG.baseUrl}/company/search?name=${encodeURIComponent(name.trim())}&limit=${limit}`

      logger.info({
        url,
        timeout: CBEAPI_CONFIG.timeouts.search,
        maxRetries: CBEAPI_CONFIG.maxRetries
      }, '[COMPANY-LOOKUP] Calling CBEAPI (name search with standard timeout)')

      // Call API with retry logic using STANDARD timeout for search
      // Search can be slower than direct lookup, so we use 6s timeout
      const response = await this.fetchWithRetry(url, {
        headers: {
          'Authorization': `Bearer ${CBEAPI_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }) // No custom timeout = uses default search timeout (6s)

      if (!response.ok) {
        logger.error({
          status: response.status,
          statusText: response.statusText
        }, '[COMPANY-LOOKUP] CBEAPI error response')

        return {
          success: false,
          error: 'Erreur lors de la communication avec la base de données belge (KBO)',
          code: 'API_ERROR'
        }
      }

      const data: CbeApiResponse = await response.json()

      // Check if companies found
      if (!data.data || data.data.length === 0) {
        logger.warn({ name }, '[COMPANY-LOOKUP] No companies found')

        return {
          success: false,
          error: 'Aucune entreprise trouvée avec ce nom',
          code: 'NOT_FOUND'
        }
      }

      // Map all results to our format
      const results = data.data.map(company => {
        const fullVat = company.cbe_number ? `BE${company.cbe_number}` : ''
        return this.mapCbeApiToResult(company, fullVat)
      })

      logger.info({
        name,
        resultsCount: results.length
      }, '[COMPANY-LOOKUP] Companies found by name')

      return { success: true, data: results }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('[COMPANY-LOOKUP] Request timeout')
        return {
          success: false,
          error: 'La recherche a pris trop de temps. Veuillez réessayer.',
          code: 'TIMEOUT'
        }
      }

      logError(error, '[COMPANY-LOOKUP] Error in searchByName')
      return {
        success: false,
        error: 'Erreur lors de la récupération des données',
        code: 'API_ERROR'
      }
    }
  }

  /**
   * Lookup company by VAT number
   * 1. Validate VAT format
   * 2. Check cache
   * 3. Call CBEAPI if not cached
   * 4. Cache result
   * @param vatNumber - VAT number (e.g., "BE0123456789" or "0123456789")
   * @param teamId - Team ID for multi-tenant support (future use)
   * @returns Company data or error
   */
  async lookupByVAT(
    vatNumber: string,
    teamId?: string
  ): Promise<CompanyLookupServiceResponse> {
    try {
      // 1. Normalize and validate VAT number
      const normalizedVat = normalizeVatNumber(vatNumber)

      logger.info({
        vatNumber: normalizedVat,
        teamId
      }, '[COMPANY-LOOKUP] Starting VAT lookup')

      // Validate format (supports BE, FR, NL, DE, LU, CH)
      const validation = validateVatNumber(normalizedVat)
      if (!validation.isValid) {
        logger.warn({
          vatNumber: normalizedVat,
          error: validation.error
        }, '[COMPANY-LOOKUP] Invalid VAT format')

        return {
          success: false,
          error: validation.error || 'Format de numéro de TVA invalide',
          code: 'INVALID_VAT'
        }
      }

      // 2. Check cache
      const cacheKey = `${CACHE_CONFIG.keyPrefix}${normalizedVat}`
      const cached = await this.getFromCache(cacheKey)
      if (cached) {
        logger.info({
          vatNumber: normalizedVat
        }, '[COMPANY-LOOKUP] Cache hit')
        return { success: true, data: cached }
      }

      // 3. Determine API based on country code
      const countryCode = normalizedVat.substring(0, 2)

      if (countryCode === 'BE') {
        // Belgian VAT → CBEAPI
        return await this.lookupBelgianCompany(normalizedVat, cacheKey)
      } else {
        // Other countries not yet supported
        logger.warn({
          vatNumber: normalizedVat,
          countryCode
        }, '[COMPANY-LOOKUP] Country not yet supported')

        return {
          success: false,
          error: `Recherche automatique non disponible pour ${validation.country}. Veuillez saisir les données manuellement.`,
          code: 'NOT_FOUND'
        }
      }
    } catch (error) {
      logError(error, '[COMPANY-LOOKUP] Unexpected error in lookupByVAT')
      return {
        success: false,
        error: 'Une erreur inattendue s\'est produite lors de la recherche',
        code: 'API_ERROR'
      }
    }
  }

  /**
   * Lookup Belgian company via CBEAPI
   */
  private async lookupBelgianCompany(
    vatNumber: string,
    cacheKey: string
  ): Promise<CompanyLookupServiceResponse> {
    try {
      // CBEAPI direct lookup endpoint requires CBE number in path (not query param)
      // Strip "BE" prefix if present: BE0775691974 → 0775691974
      const cbeNumber = vatNumber.replace(/^BE/i, '')
      const url = `${CBEAPI_CONFIG.baseUrl}/company/${cbeNumber}`

      logger.info({
        url,
        vatNumber,
        cbeNumber,
        timeout: CBEAPI_CONFIG.timeouts.directLookup,
        maxRetries: CBEAPI_CONFIG.maxRetries
      }, '[COMPANY-LOOKUP] Calling CBEAPI (direct lookup with optimized timeout)')

      // Call API with retry logic using SHORT timeout for direct lookup
      // Direct lookup should be fast (<1s), so we use 3s timeout instead of 6s
      const response = await this.fetchWithRetry(url, {
        headers: {
          'Authorization': `Bearer ${CBEAPI_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }, 0, CBEAPI_CONFIG.timeouts.directLookup)

      if (!response.ok) {
        logger.error({
          status: response.status,
          statusText: response.statusText
        }, '[COMPANY-LOOKUP] CBEAPI error response')

        return {
          success: false,
          error: 'Erreur lors de la communication avec la base de données belge (KBO)',
          code: 'API_ERROR'
        }
      }

      const data: CbeApiResponse = await response.json()

      // Check if company found (direct lookup returns single object, not array)
      if (!data.data) {
        logger.warn({
          vatNumber
        }, '[COMPANY-LOOKUP] Company not found in CBEAPI')

        return {
          success: false,
          error: 'Aucune entreprise trouvée avec ce numéro de TVA',
          code: 'NOT_FOUND'
        }
      }

      // Map CBEAPI response to our format (direct lookup returns single object)
      const company = data.data
      const result = this.mapCbeApiToResult(company, vatNumber)

      // Cache the result
      await this.setInCache(cacheKey, result)

      logger.info({
        vatNumber,
        companyName: result.name
      }, '[COMPANY-LOOKUP] Company found and cached')

      return { success: true, data: result }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('[COMPANY-LOOKUP] Request timeout')
        return {
          success: false,
          error: 'La recherche a pris trop de temps. Veuillez réessayer.',
          code: 'TIMEOUT'
        }
      }

      logError(error, '[COMPANY-LOOKUP] Error calling CBEAPI')
      return {
        success: false,
        error: 'Erreur lors de la récupération des données',
        code: 'API_ERROR'
      }
    }
  }

  /**
   * Map CBEAPI company data to our normalized format
   */
  private mapCbeApiToResult(
    company: CbeApiCompany,
    vatNumber: string
  ): CompanyLookupResult {
    // Ensure VAT has "BE" prefix
    const fullVat = vatNumber.startsWith('BE') ? vatNumber : `BE${company.cbe_number}`

    // Debug: Log raw CBEAPI address data
    logger.debug({
      denomination: company.denomination,
      address: company.address
    }, '[COMPANY-LOOKUP] Raw CBEAPI address data')

    const result = {
      // Required fields
      name: company.denomination,
      vat_number: fullVat,

      // Address (with fallbacks and empty string coercion)
      street: company.address?.street || '',
      street_number: company.address?.street_number || '', // ✅ Fixed: use street_number
      postal_code: company.address?.post_code || '',        // ✅ Fixed: use post_code
      city: company.address?.city || '',
      country: company.address?.country_code || 'BE',       // ✅ Fixed: use country_code

      // Optional fields
      box: company.address?.box || null,
      phone: company.contact?.phone || null,
      email: company.contact?.email || null,
      website: company.contact?.website || null,
      legal_form: company.legal_form || null,
      status: company.status === 'active' ? 'active' : 'inactive',

      // Metadata
      source: 'cbeapi' as const,
      fetched_at: new Date().toISOString()
    }

    // Debug: Log mapped result
    logger.debug({
      name: result.name,
      street: result.street,
      street_number: result.street_number,
      postal_code: result.postal_code,
      city: result.city,
      country: result.country
    }, '[COMPANY-LOOKUP] Mapped address result')

    return result
  }

  /**
   * Fetch with retry logic and timeout
   * @param url - URL to fetch
   * @param options - Fetch options
   * @param retryCount - Current retry attempt (0 = first attempt)
   * @param timeoutMs - Custom timeout in milliseconds (defaults to search timeout)
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retryCount = 0,
    timeoutMs?: number
  ): Promise<Response> {
    try {
      const controller = new AbortController()

      // Use custom timeout if provided, otherwise use search timeout as default
      const timeout = timeoutMs || CBEAPI_CONFIG.timeouts.search
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      logger.debug({
        url,
        timeout,
        retryCount,
        attempt: retryCount + 1,
        maxRetries: CBEAPI_CONFIG.maxRetries + 1
      }, '[COMPANY-LOOKUP] Fetching with timeout')

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Retry on 5xx errors
      if (response.status >= 500 && retryCount < CBEAPI_CONFIG.maxRetries) {
        logger.warn({
          status: response.status,
          retryCount,
          timeout
        }, '[COMPANY-LOOKUP] Retrying after server error')

        await this.delay(CBEAPI_CONFIG.retryDelay * Math.pow(2, retryCount))
        return this.fetchWithRetry(url, options, retryCount + 1, timeoutMs)
      }

      return response

    } catch (error) {
      // Retry on network errors (except AbortError which is a timeout)
      if (retryCount < CBEAPI_CONFIG.maxRetries && !(error instanceof Error && error.name === 'AbortError')) {
        logger.warn({
          error: error instanceof Error ? error.message : 'Unknown error',
          retryCount,
          timeout: timeoutMs || CBEAPI_CONFIG.timeouts.search
        }, '[COMPANY-LOOKUP] Retrying after network error')

        await this.delay(CBEAPI_CONFIG.retryDelay * Math.pow(2, retryCount))
        return this.fetchWithRetry(url, options, retryCount + 1, timeoutMs)
      }

      throw error
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get data from cache
   */
  private async getFromCache(key: string): Promise<CompanyLookupResult | null> {
    if (!this.redis) return null

    try {
      const cached = await this.redis.get(key)
      if (cached) {
        return JSON.parse(cached) as CompanyLookupResult
      }
      return null
    } catch (error) {
      logError(error, '[COMPANY-LOOKUP] Cache read error')
      return null
    }
  }

  /**
   * Set data in cache
   */
  private async setInCache(key: string, data: CompanyLookupResult): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.setex(key, CACHE_CONFIG.ttl, JSON.stringify(data))
    } catch (error) {
      logError(error, '[COMPANY-LOOKUP] Cache write error')
      // Don't throw - caching is optional
    }
  }

  /**
   * Clear cache for a specific VAT number
   * Useful for testing or manual cache invalidation
   */
  async clearCache(vatNumber: string): Promise<void> {
    if (!this.redis) return

    const normalizedVat = normalizeVatNumber(vatNumber)
    const cacheKey = `${CACHE_CONFIG.keyPrefix}${normalizedVat}`

    try {
      await this.redis.del(cacheKey)
      logger.info({ vatNumber: normalizedVat }, '[COMPANY-LOOKUP] Cache cleared')
    } catch (error) {
      logError(error, '[COMPANY-LOOKUP] Cache clear error')
    }
  }

  /**
   * Close Redis connection (for cleanup)
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
}

/**
 * Factory function to create CompanyLookupService instance
 */
export function createCompanyLookupService(redis?: Redis): CompanyLookupService {
  return new CompanyLookupService(redis)
}
