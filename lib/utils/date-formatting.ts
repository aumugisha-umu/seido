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
