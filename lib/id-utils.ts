/**
 * Utility for generating consistent IDs that work with SSR
 */

let counter = 0

export const generateId = (prefix = 'id'): string => {
  // Use a counter-based approach for SSR consistency
  counter += 1
  return `${prefix}-${counter}-${Date.now().toString(36)}`
}

export const generateInterventionId = (): string => {
  counter += 1
  return `INT${counter.toString().padStart(4, '0')}`
}

export const generateClientId = (prefix = 'client'): string => {
  // For client-side only operations
  if (typeof window === 'undefined') {
    return `${prefix}-${counter++}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

