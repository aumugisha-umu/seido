import { NextRequest, NextResponse } from 'next/server'
import { logger, logApiCall, logError } from './logger'

// Types pour les handlers API
type ApiHandler = (req: NextRequest, ...args: unknown[]) => Promise<NextResponse> | NextResponse

// Middleware pour logger les requêtes API
export const withApiLogger = (handler: ApiHandler) => {
  return async (req: NextRequest, ...args: unknown[]) => {
    const startTime = Date.now()
    const method = req.method
    const url = req.url
    const endpoint = new URL(url).pathname

    try {
      // Logger la requête entrante
      logger.info({
        type: 'api_request',
        method,
        endpoint,
        url,
        headers: Object.fromEntries(req.headers.entries()),
        timestamp: new Date().toISOString()
      }, `🌐 API Request: ${method} ${endpoint}`)

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
        { error: 'Internal Server Error' },
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

