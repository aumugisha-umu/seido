import { NextRequest, NextResponse } from 'next/server'
import { logger, logError } from '@/lib/logger'
import { logger, logApiCall, logError } from '../logger'

/**
 * 🌐 Middleware de Logging API Automatique
 *
 * Logs automatiques pour toutes les requêtes API :
 * - Requêtes entrantes (méthode, URL, headers)
 * - Réponses sortantes (status, durée)
 * - Erreurs capturées
 *
 * Utilisation : Importer dans middleware.ts principal
 */

interface ApiLogMetadata {
  method: string
  path: string
  url: string
  status?: number
  duration?: number
  userId?: string
  error?: string
}

/**
 * Middleware fonction pour logger les requêtes API
 */
export const withApiLogging = async (
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> => {
  const startTime = Date.now()
  const method = request.method
  const url = request.url
  const path = new URL(url).pathname

  // Metadata de base
  const metadata: ApiLogMetadata = {
    method,
    path,
    url
  }

  try {
    // Log requête entrante (niveau debug pour ne pas polluer)
    logger.debug({
      type: 'api_request_start',
      ...metadata,
      headers: {
        'user-agent': request.headers.get('user-agent'),
        'content-type': request.headers.get('content-type')
      }
    }, `🌐 ${method} ${path}`)

    // Exécuter le handler
    const response = await handler()
    const duration = Date.now() - startTime

    // Log réponse réussie
    metadata.status = response.status
    metadata.duration = duration

    logApiCall(method, path, response.status, duration)

    return response

  } catch (error) {
    const duration = Date.now() - startTime
    metadata.duration = duration
    metadata.error = error instanceof Error ? error.message : String(error)

    // Log erreur
    logError(
      error instanceof Error ? error : new Error(String(error)),
      `api_handler:${path}`,
      metadata
    )

    // Retourner erreur 500
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

/**
 * Helper pour déterminer si une route est une API route
 */
export const isApiRoute = (pathname: string): boolean => {
  return pathname.startsWith('/api/')
}

/**
 * Helper pour logger les erreurs non capturées dans les API routes
 */
export const logUncaughtApiError = (error: Error, path: string) => {
  logError(error, `uncaught_api_error:${path}`, {
    path,
    timestamp: new Date().toISOString()
  })
}

export default withApiLogging
