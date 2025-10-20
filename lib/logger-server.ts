import pino from 'pino'

import type { BaseLogger } from './logger-types'

const adaptPinoToBaseLogger = (pinoLogger: pino.Logger): BaseLogger => {
  return {
    info: (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(pinoLogger.info as (...args: any[]) => void)(...args)
    },
    warn: (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(pinoLogger.warn as (...args: any[]) => void)(...args)
    },
    error: (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(pinoLogger.error as (...args: any[]) => void)(...args)
    },
    debug: (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(pinoLogger.debug as (...args: any[]) => void)(...args)
    },
    child: (bindings?: Record<string, unknown>) => {
      const child = pinoLogger.child(bindings || {})
      return adaptPinoToBaseLogger(child)
    }
  }
}

export const createServerLogger = (): BaseLogger => {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined

  const base = pino({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    timestamp: pino.stdTimeFunctions.isoTime
  })

  return adaptPinoToBaseLogger(base)
}

export type { BaseLogger }


