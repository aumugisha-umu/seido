/**
 * Company Lookup API Route
 * POST /api/company/lookup
 * Lookup company data by VAT number via CBEAPI
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Redis from 'ioredis'
import { createCompanyLookupService } from '@/lib/services/domain/company-lookup.service'
import { validateVatNumber } from '@/lib/utils/vat-validator'
import { logger, logError } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * Request body schema validation
 */
const LookupByVATSchema = z.object({
  searchType: z.literal('vat'),
  vatNumber: z.string()
    .min(1, 'Le numéro de TVA est requis')
    .max(20, 'Le numéro de TVA est trop long'),
  teamId: z.string().uuid('ID d\'équipe invalide')
})

const SearchByNameSchema = z.object({
  searchType: z.literal('name'),
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long'),
  teamId: z.string().uuid('ID d\'équipe invalide'),
  limit: z.number().min(1).max(50).optional().default(10)
})

const LookupRequestSchema = z.discriminatedUnion('searchType', [
  LookupByVATSchema,
  SearchByNameSchema
])

/**
 * Rate limiting configuration
 * 10 requests per minute per user
 */
const RATE_LIMIT = {
  maxRequests: 10,
  windowSeconds: 60
}

/**
 * Singleton Redis instance with graceful degradation
 * Created once at module load, reused across requests
 */
let redisClient: Redis | null = null
let redisInitialized = false

const initializeRedis = () => {
  if (redisInitialized) return redisClient

  redisInitialized = true

  // Skip Redis during Next.js build phase to avoid connection errors
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null
  }

  if (!process.env.REDIS_URL) {
    logger.warn('[COMPANY-LOOKUP-API] Redis URL not configured - cache and rate limiting disabled')
    return null
  }

  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        if (times > 2) return null
        return Math.min(times * 100, 500)
      },
      connectTimeout: 3000,
      enableOfflineQueue: false,
      reconnectOnError: () => false
    })

    // Test connection in background (non-blocking)
    redisClient.ping()
      .then(() => logger.info('[COMPANY-LOOKUP-API] ✅ Redis connected'))
      .catch((err) => {
        logger.warn('[COMPANY-LOOKUP-API] ⚠️ Redis connection failed - continuing without cache', err)
        redisClient = null
      })

    return redisClient
  } catch (error) {
    logger.warn('[COMPANY-LOOKUP-API] ⚠️ Redis initialization failed - continuing without cache', error)
    return null
  }
}

// Initialize Redis once at module load
redisClient = initializeRedis()

/**
 * POST /api/company/lookup
 * Lookup company by VAT number
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await getApiAuthContext()
    if (!authResult.success) {
      return authResult.error
    }

    const { authUser, userProfile } = authResult.data

    if (!authUser || !userProfile) {
      logger.warn('[COMPANY-LOOKUP-API] Unauthorized access attempt')
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validation = LookupRequestSchema.safeParse(body)

    if (!validation.success) {
      logger.warn({
        errors: validation.error.errors,
        userId: userProfile.id
      }, '[COMPANY-LOOKUP-API] Invalid request')

      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message
        },
        { status: 400 }
      )
    }

    const requestData = validation.data
    const { teamId } = requestData

    logger.info({
      searchType: requestData.searchType,
      teamId,
      userId: userProfile.id
    }, '[COMPANY-LOOKUP-API] Lookup request received')

    // 3. Type-specific validation
    if (requestData.searchType === 'vat') {
      const vatValidation = validateVatNumber(requestData.vatNumber)
      if (!vatValidation.isValid) {
        logger.warn({
          vatNumber: requestData.vatNumber,
          error: vatValidation.error
        }, '[COMPANY-LOOKUP-API] Invalid VAT format')

        return NextResponse.json(
          {
            success: false,
            error: vatValidation.error || 'Format de numéro de TVA invalide'
          },
          { status: 400 }
        )
      }
    }

    // 4. Rate limiting (per user) - graceful degradation if Redis fails
    if (redisClient) {
      try {
        const rateLimitKey = `ratelimit:company-lookup:${userProfile.id}`

        const current = await redisClient.incr(rateLimitKey)
        if (current === 1) {
          await redisClient.expire(rateLimitKey, RATE_LIMIT.windowSeconds)
        }

        if (current > RATE_LIMIT.maxRequests) {
          logger.warn({
            userId: userProfile.id,
            requests: current
          }, '[COMPANY-LOOKUP-API] Rate limit exceeded')

          return NextResponse.json(
            {
              success: false,
              error: `Trop de requêtes. Veuillez attendre ${RATE_LIMIT.windowSeconds} secondes.`
            },
            { status: 429 }
          )
        }

        logger.info({
          userId: userProfile.id,
          requests: current
        }, '[COMPANY-LOOKUP-API] Rate limit check passed')

      } catch (rateLimitError) {
        // Log error but don't block the request if rate limiting fails
        logger.warn('[COMPANY-LOOKUP-API] ⚠️ Rate limiting failed - continuing without rate limit', rateLimitError)
        redisClient = null // Disable Redis for future requests if it's failing
      }
    } else {
      logger.debug('[COMPANY-LOOKUP-API] Rate limiting disabled (Redis not available)')
    }

    // 5. Call CompanyLookupService based on search type
    const lookupService = createCompanyLookupService(redisClient || undefined)

    if (requestData.searchType === 'vat') {
      // VAT lookup - returns single result
      const result = await lookupService.lookupByVAT(requestData.vatNumber, teamId)

      if (result.success) {
        logger.info({
          vatNumber: requestData.vatNumber,
          companyName: result.data.name,
          source: result.data.source
        }, '[COMPANY-LOOKUP-API] VAT lookup successful')

        return NextResponse.json({
          success: true,
          searchType: 'vat',
          data: result.data
        })
      } else {
        logger.warn({
          vatNumber: requestData.vatNumber,
          error: result.error,
          code: result.code
        }, '[COMPANY-LOOKUP-API] VAT lookup failed')

        const statusCode = result.code === 'NOT_FOUND' ? 404 :
                          result.code === 'INVALID_VAT' ? 400 :
                          result.code === 'TIMEOUT' ? 504 :
                          500

        return NextResponse.json(
          {
            success: false,
            error: result.error,
            code: result.code
          },
          { status: statusCode }
        )
      }
    } else {
      // Name search - returns multiple results
      const result = await lookupService.searchByName(requestData.name, teamId, requestData.limit)

      if (result.success) {
        logger.info({
          name: requestData.name,
          resultsCount: result.data.length
        }, '[COMPANY-LOOKUP-API] Name search successful')

        return NextResponse.json({
          success: true,
          searchType: 'name',
          data: result.data,
          count: result.data.length
        })
      } else {
        logger.warn({
          name: requestData.name,
          error: result.error,
          code: result.code
        }, '[COMPANY-LOOKUP-API] Name search failed')

        const statusCode = result.code === 'NOT_FOUND' ? 404 :
                          result.code === 'INVALID_NAME' ? 400 :
                          result.code === 'TIMEOUT' ? 504 :
                          500

        return NextResponse.json(
          {
            success: false,
            error: result.error,
            code: result.code
          },
          { status: statusCode }
        )
      }
    }

  } catch (error) {
    logError(error, '[COMPANY-LOOKUP-API] Unexpected error')

    return NextResponse.json(
      {
        success: false,
        error: 'Une erreur inattendue s\'est produite'
      },
      { status: 500 }
    )
  }
  // Note: Redis connection is a singleton and should NOT be closed after each request
}

/**
 * OPTIONS handler for CORS (if needed)
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
