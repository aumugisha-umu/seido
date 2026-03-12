/**
 * Sanitizes user search input for use in PostgREST .or() filters.
 * Removes characters that could inject filter operators: , ( ) .
 * Pattern from contact.repository.ts
 */
export function sanitizeSearch(query: string): string {
  return query.replace(/[%,().]/g, '').trim()
}
