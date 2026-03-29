/**
 * Get the application base URL from environment variables.
 * Checks NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL, VERCEL_URL, then falls back to localhost.
 */
export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:3000'
  return url.replace(/\/+$/, '')
}
