import pino from 'pino'

// Configuration du logger pour différents environnements
const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isTest = process.env.NODE_ENV === 'test'
  
  // Configuration de base
  const baseConfig = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => {
        return { level: label }
      }
    }
  }

  // Configuration pour le développement (avec pino-pretty)
  if (isDevelopment) {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '[{level}] {msg}',
          customPrettifiers: {
            time: (timestamp: string) => `🕐 ${timestamp}`,
            level: (level: string) => {
              const levelEmojis: Record<string, string> = {
                '10': '🔍', // trace
                '20': '🐛', // debug
                '30': 'ℹ️',  // info
                '40': '⚠️',  // warn
                '50': '❌',  // error
                '60': '💀'   // fatal
              }
              return levelEmojis[level] || '📝'
            }
          }
        }
      }
    })
  }

  // Configuration pour les tests (logs minimaux)
  if (isTest) {
    return pino({
      ...baseConfig,
      level: 'warn',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: false,
          translateTime: false,
          ignore: 'pid,hostname,time'
        }
      }
    })
  }

  // Configuration pour la production (JSON structuré)
  return pino(baseConfig)
}

// Logger principal
export const logger = createLogger()

// Loggers spécialisés pour différents contextes
export const createContextLogger = (context: string) => {
  return logger.child({ context })
}

// Loggers spécialisés pour les différents domaines de l'application
export const authLogger = createContextLogger('auth')
export const supabaseLogger = createContextLogger('supabase')
export const interventionLogger = createContextLogger('intervention')
export const dashboardLogger = createContextLogger('dashboard')
export const testLogger = createContextLogger('test')

// Fonctions utilitaires pour les logs courants
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logUserAction = (action: string, userId?: string, metadata?: Record<string, any>) => {
  logger.info({
    type: 'user_action',
    action,
    userId,
    metadata
  }, `👤 User action: ${action}`)
}

export const logApiCall = (method: string, endpoint: string, statusCode?: number, duration?: number) => {
  logger.info({
    type: 'api_call',
    method,
    endpoint,
    statusCode,
    duration
  }, `🌐 API ${method} ${endpoint} ${statusCode ? `(${statusCode})` : ''}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logError = (error: Error, context?: string, metadata?: Record<string, any>) => {
  logger.error({
    type: 'error',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context,
    metadata
  }, `❌ Error${context ? ` in ${context}` : ''}: ${error.message}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logSupabaseOperation = (operation: string, table: string, success: boolean, metadata?: Record<string, any>) => {
  const level = success ? 'info' : 'error'
  const emoji = success ? '✅' : '❌'
  
  logger[level]({
    type: 'supabase_operation',
    operation,
    table,
    success,
    metadata
  }, `${emoji} Supabase ${operation} on ${table}`)
}

// Hook pour capturer les erreurs non gérées
export const setupGlobalErrorHandling = () => {
  if (typeof window !== 'undefined') {
    // Erreurs JavaScript non capturées
    window.addEventListener('error', (event) => {
      logError(new Error(event.message), 'global_error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })

    // Promesses rejetées non capturées
    window.addEventListener('unhandledrejection', (event) => {
      logError(new Error(event.reason), 'unhandled_promise_rejection', {
        reason: event.reason
      })
    })
  }
}

// Types pour TypeScript
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type LogContext = 'auth' | 'supabase' | 'intervention' | 'dashboard' | 'test' | 'api' | 'ui'

export default logger

