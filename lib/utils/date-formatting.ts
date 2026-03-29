/**
 * Shared date formatting utilities.
 */

/** Format a date string as DD/MM/YYYY (French short format). */
export function formatDateFR(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/** Format a date string as "15 mars 2026" (French long format). Returns "—" for null. */
export function formatDateLongFR(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
