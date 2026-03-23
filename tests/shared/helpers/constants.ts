/**
 * Shared test constants for E2E and QA Bot tests.
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
