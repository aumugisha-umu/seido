'use client'

import { useEffect } from 'react'

/**
 * Client-side logger initializer
 * This component runs only on the client to avoid Next.js serialization issues
 */
export default function LoggerInitializer() {
  useEffect(() => {
    // Console override is handled automatically via logger imports
    // No explicit initialization needed since we use Pino's browser mode
  }, [])

  return null
}
