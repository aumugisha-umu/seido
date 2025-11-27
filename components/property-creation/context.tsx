"use client"

/**
 * PropertyCreationContext - Context provider for property creation state
 *
 * Provides centralized state management and actions for property creation
 * components through React Context, enabling clean component composition.
 */


import React, { createContext, useContext, ReactNode, useMemo, useCallback } from "react"
import { usePropertyCreation } from "@/hooks/use-property-creation"
import type {
  PropertyCreationContextValue,
  PropertyCreationConfig,
  ValidationState,
  PropertyFormData
} from "./types"

// Create the context
const PropertyCreationContext = createContext<PropertyCreationContextValue | null>(null)

// Props for the provider
interface PropertyCreationProviderProps {
  children: ReactNode
  config: PropertyCreationConfig
}

/**
 * Provider component that wraps the property creation flow
 * and provides state management to all child components
 */
export function PropertyCreationProvider({ children, config }: PropertyCreationProviderProps) {
  const hookReturn = usePropertyCreation(config)

  // Additional context-specific utilities - mémoïsés pour éviter les re-renders
  const registerStepValidation = useCallback((step: number, validation: ValidationState) => {
    // This could be used by individual step components to register their validation
    // Currently handled by the main hook, but available for future extension
  }, [])

  const updateFormData = useCallback((updates: Partial<PropertyFormData>) => {
    // Utility to partially update form data from child components
    // Implementation would depend on specific use cases
  }, [])

  // ✅ OPTIMISATION: Mémoïser le contextValue pour éviter les re-renders des consommateurs
  const contextValue = useMemo<PropertyCreationContextValue>(() => ({
    ...hookReturn,
    registerStepValidation,
    updateFormData,
  }), [hookReturn, registerStepValidation, updateFormData])

  return (
    <PropertyCreationContext.Provider value={contextValue}>
      {children}
    </PropertyCreationContext.Provider>
  )
}

/**
 * Hook to consume the PropertyCreationContext
 * Throws an error if used outside of PropertyCreationProvider
 */
export function usePropertyCreationContext(): PropertyCreationContextValue {
  const context = useContext(PropertyCreationContext)

  if (!context) {
    throw new Error(
      'usePropertyCreationContext must be used within a PropertyCreationProvider. ' +
      'Make sure to wrap your component with PropertyCreationProvider.'
    )
  }

  return context
}

/**
 * HOC to automatically provide PropertyCreationContext to a component
 * Useful for page-level components that need to initialize the context
 */
export function withPropertyCreation<P extends object>(
  Component: React.ComponentType<P>,
  config: PropertyCreationConfig
) {
  const WrappedComponent = (props: P) => (
    <PropertyCreationProvider config={config}>
      <Component {...props} />
    </PropertyCreationProvider>
  )

  WrappedComponent.displayName = `withPropertyCreation(${Component.displayName || Component.name})`

  return WrappedComponent
}

/**
 * Utility hook to check if we're inside a PropertyCreationProvider
 * without throwing an error (useful for conditional rendering)
 */
export function usePropertyCreationContextOptional(): PropertyCreationContextValue | null {
  return useContext(PropertyCreationContext)
}

// Export the context for advanced use cases
export { PropertyCreationContext }