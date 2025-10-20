import { logger } from './logger'

/**
 * 🎭 Console Override Global - Redirection vers Pino Logger
 *
 * Intercepte tous les appels console.* et les redirige vers Pino
 * pour un logging unifié et structuré.
 *
 * Avantages :
 * - Zéro refactoring : tout le code existant continue de fonctionner
 * - Format unifié : tous les logs passent par Pino
 * - Production-ready : logs JSON structurés en prod
 * - Performance : batching et async logging
 *
 * Usage : Importer une seule fois dans app/layout.tsx ou middleware
 */

// Sauvegarder les fonctions console originales
const originalConsole = {
  log: console.log,
  info: console.info,
  debug: console.debug,
  warn: console.warn,
  error: console.error
}

/**
 * Active l'override global de console vers Pino
 */
export const setupConsoleOverride = () => {
  // Ne pas override en environnement de test (pour éviter les interférences)
  if (process.env.NODE_ENV === 'test') {
    return
  }

  // Override console.log → logger.info
  console.log = (...args: unknown[]) => {
    const message = formatConsoleArgs(args)
    logger.info({ source: 'console.log' }, message)
  }

  // Override console.info → logger.info
  console.info = (...args: unknown[]) => {
    const message = formatConsoleArgs(args)
    logger.info({ source: 'console.info' }, message)
  }

  // Override console.debug → logger.debug
  console.debug = (...args: unknown[]) => {
    const message = formatConsoleArgs(args)
    logger.debug({ source: 'console.debug' }, message)
  }

  // Override console.warn → logger.warn
  console.warn = (...args: unknown[]) => {
    const message = formatConsoleArgs(args)
    logger.warn({ source: 'console.warn' }, message)
  }

  // Override console.error → logger.error
  console.error = (...args: unknown[]) => {
    const message = formatConsoleArgs(args)
    // Si le premier arg est une Error, extraire le stack
    const firstArg = args[0]
    if (firstArg instanceof Error) {
      logger.error({
        source: 'console.error',
        error: {
          name: firstArg.name,
          message: firstArg.message,
          stack: firstArg.stack
        }
      }, message)
    } else {
      logger.error({ source: 'console.error' }, message)
    }
  }

  // Log confirmation du setup (une seule fois)
  logger.info({ module: 'console-override' }, '✅ Console override activé - Tous les logs passent par Pino')
}

/**
 * Désactive l'override et restaure console original
 * (utile pour tests ou debugging)
 */
export const restoreConsole = () => {
  console.log = originalConsole.log
  console.info = originalConsole.info
  console.debug = originalConsole.debug
  console.warn = originalConsole.warn
  console.error = originalConsole.error
}

/**
 * Formatte les arguments console en string lisible
 */
const formatConsoleArgs = (args: unknown[]): string => {
  return args
    .map(arg => {
      if (typeof arg === 'string') {
        return arg
      }
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}`
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2)
        } catch {
          return String(arg)
        }
      }
      return String(arg)
    })
    .join(' ')
}

/**
 * Accès aux fonctions console originales si nécessaire
 * (pour debugging ou tests)
 */
export const originalConsoleFunctions = originalConsole

export default setupConsoleOverride
