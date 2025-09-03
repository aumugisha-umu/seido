"use client"

import { useState, useEffect } from "react"

/**
 * Hook to prevent hydration mismatch by ensuring component only renders on client
 * @returns boolean indicating if component is running on client side
 */
export function useClientOnly() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}
