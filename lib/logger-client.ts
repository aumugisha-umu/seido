import type { BaseLogger } from './logger-types'

export const clientLogger: BaseLogger = {
  info: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.info(...args as [])
  },
  warn: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn(...args as [])
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(...args as [])
  },
  debug: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.debug(...args as [])
  },
  child: () => {
    return clientLogger
  }
}

export type { BaseLogger }


