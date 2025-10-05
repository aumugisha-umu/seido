import { NextRequest, NextResponse } from 'next/server'
import { logger, logError } from '@/lib/logger'
import { logger, logApiCall, logError } from './logger'

// Types pour les handlers API
type ApiHandler = (req: NextRequest, ...args: unknown[]) => Promise<NextResponse> | NextResponse

// Middleware pour logger les requêtes API (version améliorée)
export const withApiLogger = (handler: ApiHandler) => {
  return async (req: NextRequest, ...args: unknown[]) => {
    const startTime = Date.now()
    const method = req.method
    const url = req.url
    const endpoint = new URL(url).pathname

    try {
      // Logger la requête entrante (niveau debug pour éviter le spam)
      logger.debug({
        type: 'api_request_start',
        method,
        endpoint,
        url,
        headers: {
          'user-agent': req.headers.get('user-agent'),
          'content-type': req.headers.get('content-type')
        },
        timestamp: new Date().toISOString()
      }, `🌐 ${method} ${endpoint}`)

      // Exécuter le handler
      const response = await handler(req, ...args)
      const duration = Date.now() - startTime

      // Logger la réponse
      if (response instanceof NextResponse) {
        logApiCall(method, endpoint, response.status, duration)
      } else {
        logApiCall(method, endpoint, 200, duration)
      }

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      logError(error as Error, 'api_handler', {
        method,
        endpoint,
        url,
        duration
      })

      // Retourner une réponse d'erreur
      return NextResponse.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }
  }
}

// Hook pour logger les appels API côté client
export const logClientApiCall = async (
  url: string,
  options: RequestInit = {}
) => {
  const startTime = Date.now()
  const method = options.method || 'GET'

  try {
    logger.info({
      type: 'client_api_call',
      method,
      url,
      options: {
        headers: options.headers,
        body: options.body ? 'present' : 'none'
      }
    }, `🌐 Client API Call: ${method} ${url}`)

    const response = await fetch(url, options)
    const duration = Date.now() - startTime

    logApiCall(method, url, response.status, duration)

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error as Error, 'client_api_call', {
      method,
      url,
      duration
    })

    throw error
  }
}

// Wrapper pour les fonctions API avec logging automatique
export const createApiHandler = (handler: ApiHandler) => {
  return withApiLogger(handler)
}

const apiLogger = {
  withApiLogger,
  logClientApiCall,
  createApiHandler
}

export default apiLogger

