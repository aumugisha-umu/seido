/**
 * QA Bot constants shared across all test specs and utilities.
 */

/** Default timeouts */
export const TIMEOUTS = {
  /** Navigation timeout for page loads */
  navigation: 30_000,
  /** Timeout for individual actions (clicks, fills) */
  action: 10_000,
  /** Timeout for toast notifications */
  toast: 15_000,
  /** Timeout for content streaming (SSR) */
  content: 30_000,
  /** Short wait for animations/transitions */
  animation: 500,
} as const

/** QA team configuration (set via env in CI) */
export const QA_CONFIG = {
  teamId: process.env.QA_TEAM_ID || '',
  buildingName: 'QA Building',
  lotNameA: 'QA Lot A',
  lotNameB: 'QA Lot B',
} as const

/** Budget limits for autonomous exploration */
export const EXPLORATION_BUDGET = {
  maxDurationMs: 15 * 60 * 1000, // 15 minutes
  maxPages: 50,
  maxApiCalls: 100,
  dailySpendCapUsd: 5,
  /** Alias used by budget-limiter */
  maxCostUsd: 5,
} as const

/** Claude API pricing (Sonnet) */
export const API_PRICING = {
  inputPer1k: 0.003,
  outputPer1k: 0.015,
} as const

/** Navigation constants for autonomous exploration */
export const NAVIGATION = {
  navigationTimeoutMs: 30_000,
  postActionDelayMs: 1000,
  slowLoadThresholdMs: 5000,
  maxActionsPerPage: 10,
} as const

/** Report output paths */
export const REPORT_PATHS = {
  explorationResults: 'exploration-report/exploration-results.json',
  screenshots: 'exploration-report/screenshots',
  summary: 'reports/summary.json',
} as const

/** Actions the autonomous explorer must never execute */
export const FORBIDDEN_ACTIONS = [
  'déconnexion', 'deconnexion', 'logout', 'sign out',
  'supprimer le compte', 'delete account',
  'supprimer mon compte',
] as const

/** Anomaly severity levels */
export const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY]

/** Anomaly detection patterns */
export const ANOMALY_PATTERNS = {
  errorBoundary: ['Something went wrong', 'Erreur inattendue', 'Application error'],
  placeholderText: ['Lorem ipsum', 'TODO', 'undefined', 'NaN', '[object Object]'],
  /** Network requests to ignore (not bugs) */
  networkNoise: ['contentsquare.net', 'googleusercontent.com', 'HMR', 'ERR_ABORTED', '_next/webpack-hmr'],
  /** Console messages to ignore */
  consoleNoise: ['Download the React DevTools', 'webpack-hmr', 'Fast Refresh', '[HMR]', 'ReactDOM.preload'],
} as const

/** Anomaly type used by autonomous exploration */
export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low'

export interface Anomaly {
  type: string
  severity: AnomalySeverity
  message: string
  url: string
  timestamp: string
  screenshotPath?: string
  details?: string
}
