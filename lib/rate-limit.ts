/**
 * Rate Limiting Configuration
 *
 * Uses Upstash Redis in production (distributed, persistent)
 * Falls back to in-memory Map in development (simple, no external deps)
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// In-memory fallback for development
class MemoryRatelimit {
  private cache = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private config: {
      limiter: { tokens: number; window: string }
      prefix?: string
    }
  ) {}

  private getWindowMs(): number {
    const match = this.config.limiter.window.match(/(\d+)\s*(ms|s|m|h|d)/)
    if (!match) return 60000 // default 1 minute

    const value = parseInt(match[1])
    const unit = match[2]

    switch (unit) {
      case 'ms': return value
      case 's': return value * 1000
      case 'm': return value * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      default: return 60000
    }
  }

  async limit(identifier: string): Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
    pending: Promise<unknown>
  }> {
    const now = Date.now()
    const windowMs = this.getWindowMs()
    const key = `${this.config.prefix || ''}:${identifier}`

    // Clean up expired entries
    for (const [k, v] of this.cache.entries()) {
      if (v.resetAt < now) {
        this.cache.delete(k)
      }
    }

    const entry = this.cache.get(key)

    if (!entry || entry.resetAt < now) {
      // New window
      this.cache.set(key, {
        count: 1,
        resetAt: now + windowMs
      })

      return {
        success: true,
        limit: this.config.limiter.tokens,
        remaining: this.config.limiter.tokens - 1,
        reset: now + windowMs,
        pending: Promise.resolve()
      }
    }

    // Increment count
    entry.count++
    const remaining = Math.max(0, this.config.limiter.tokens - entry.count)

    return {
      success: entry.count <= this.config.limiter.tokens,
      limit: this.config.limiter.tokens,
      remaining,
      reset: entry.resetAt,
      pending: Promise.resolve()
    }
  }
}

// Check if Upstash credentials are available
const hasUpstashCredentials =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN

/**
 * Create rate limiter instance
 * Uses Upstash Redis if credentials available, otherwise in-memory fallback
 */
function createRateLimiter(tokens: number, window: string, prefix: string) {
  if (hasUpstashCredentials) {
    // Production: Upstash Redis (distributed, persistent)
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix,
      analytics: true, // Track usage in Upstash console
    })
  } else {
    // Development: In-memory fallback
    console.warn('[RATE-LIMIT] Warning: Upstash credentials not found, using in-memory fallback')
    return new MemoryRatelimit({
      limiter: { tokens, window },
      prefix
    }) as unknown as Ratelimit
  }
}

/**
 * Rate limit configurations for different route types
 */
export const rateLimiters = {
  // STRICT: Authentication endpoints (prevent brute force)
  auth: createRateLimiter(5, "10 s", "ratelimit:auth"),

  // MODERATE: Sensitive operations (password reset, email send)
  sensitive: createRateLimiter(3, "60 s", "ratelimit:sensitive"),

  // NORMAL: Standard API endpoints
  api: createRateLimiter(30, "10 s", "ratelimit:api"),

  // LENIENT: Public/read endpoints
  public: createRateLimiter(100, "60 s", "ratelimit:public"),
}

/**
 * Get rate limiter for a given route
 */
export function getRateLimiterForRoute(pathname: string): Ratelimit {
  // Auth endpoints (strictest)
  if (
    pathname.includes('/api/auth/') ||
    pathname === '/api/reset-password' ||
    pathname === '/api/change-password' ||
    pathname.includes('/api/accept-invitation')
  ) {
    return rateLimiters.auth
  }

  // Sensitive operations
  if (
    pathname.includes('/upload-') ||
    pathname.includes('/send-') ||
    pathname === '/api/invite-user' ||
    pathname.includes('/create-')
  ) {
    return rateLimiters.sensitive
  }

  // Default: Standard API rate limit
  return rateLimiters.api
}

/**
 * Get client identifier for rate limiting
 * Uses IP address + user agent for anonymous, user ID for authenticated
 */
export function getClientIdentifier(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`
  }

  // Anonymous: Use IP + user agent hash
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
              request.headers.get('x-real-ip') ||
              'unknown'

  const userAgent = request.headers.get('user-agent') || 'unknown'

  return `anon:${ip}:${userAgent.slice(0, 50)}`
}
