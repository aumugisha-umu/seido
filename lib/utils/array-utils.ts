/**
 * Splits an array into chunks of the specified size.
 * Used for batching parallel operations (e.g., Promise.allSettled with concurrency control).
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}
