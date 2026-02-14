import type { BaseLogger } from './logger-types'

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const
type LogLevel = keyof typeof LOG_LEVELS

const getLogLevel = (): LogLevel => {
  if (typeof process !== 'undefined') {
    const env = process.env?.NEXT_PUBLIC_LOG_LEVEL as string | undefined
    if (env && env in LOG_LEVELS) return env as LogLevel
  }
  return 'warn'
}

const currentLevel = getLogLevel()
const isEnabled = (level: LogLevel) => LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

export const clientLogger: BaseLogger = {
  info: isEnabled('info') ? (...args: unknown[]) => { console.info(...(args as [])) } : noop,
  warn: isEnabled('warn') ? (...args: unknown[]) => { console.warn(...(args as [])) } : noop,
  error: isEnabled('error') ? (...args: unknown[]) => { console.error(...(args as [])) } : noop,
  debug: isEnabled('debug') ? (...args: unknown[]) => { console.debug(...(args as [])) } : noop,
  child: () => clientLogger
}

export type { BaseLogger }
