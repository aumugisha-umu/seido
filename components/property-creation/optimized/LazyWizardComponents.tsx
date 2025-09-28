/**
 * Lazy Wizard Components - Next.js 15+ optimized components
 *
 * Implements dynamic imports, suspense boundaries, and streaming SSR
 * for optimal performance and user experience.
 */

"use client"

import React, { Suspense, lazy } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

// Lazy load heavy components to reduce initial bundle size
const BuildingCreationWizard = lazy(() =>
  import("../pages/BuildingCreationWizard").then(module => ({
    default: module.BuildingCreationWizard
  }))
)

const LotCreationWizard = lazy(() =>
  import("../pages/LotCreationWizard").then(module => ({
    default: module.LotCreationWizard
  }))
)

const ContactSelector = lazy(() =>
  import("@/components/contact-selector").then(module => ({
    default: module.default
  }))
)

/**
 * Loading Components for Suspense Fallbacks
 *
 * `★ Insight ─────────────────────────────────────`
 * Les composants de loading sont optimisés pour Next.js 15 :
 * - Skeleton matching exact layout dimensions
 * - Progressive loading avec Suspense boundaries
 * - Streaming SSR pour faster First Contentful Paint
 * - Code splitting automatique par route et composant
 * `─────────────────────────────────────────────────`
 */

// Skeleton for wizard loading
function WizardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Progress bar skeleton */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-20" />
                {i < 3 && <Skeleton className="h-0.5 w-16" />}
              </div>
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <Card>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation skeleton */}
        <div className="flex justify-between mt-8">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  )
}

// Enhanced loading indicator
function LoadingIndicator({ message = "Chargement..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{message}</p>
          <p className="text-xs text-gray-500 mt-1">Préparation de l'interface...</p>
        </div>
      </div>
    </div>
  )
}

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <div className="space-y-3">
              <p className="font-medium">Une erreur est survenue lors du chargement</p>
              <p className="text-sm">{error.message}</p>
              <Button
                onClick={resetErrorBoundary}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

/**
 * Optimized Building Creation Wizard with Lazy Loading
 */
export function OptimizedBuildingCreationWizard() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<WizardSkeleton />}>
        <BuildingCreationWizard />
      </Suspense>
    </ErrorBoundary>
  )
}

/**
 * Optimized Lot Creation Wizard with Lazy Loading
 */
export function OptimizedLotCreationWizard() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<WizardSkeleton />}>
        <LotCreationWizard />
      </Suspense>
    </ErrorBoundary>
  )
}

/**
 * Optimized Contact Selector with Progressive Loading
 */
interface OptimizedContactSelectorProps {
  onLoaded?: () => void
  fallback?: React.ReactNode
}

export function OptimizedContactSelector({
  onLoaded,
  fallback,
  ...props
}: OptimizedContactSelectorProps & any) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des contacts: {error.message}
            <Button onClick={resetErrorBoundary} variant="outline" size="sm" className="mt-2 ml-2">
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}
    >
      <Suspense
        fallback={
          fallback || (
            <LoadingIndicator message="Chargement des contacts..." />
          )
        }
      >
        <ContactSelector {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

/**
 * Preloader utility for warming up imports
 */
export function preloadWizardComponents() {
  // Preload critical components in the background
  if (typeof window !== 'undefined') {
    // Only run in browser
    import("../pages/BuildingCreationWizard")
    import("../pages/LotCreationWizard")
    import("@/components/contact-selector")
  }
}

/**
 * `★ Insight ─────────────────────────────────────`
 * Performance Optimizations implementées :
 *
 * 1. **Code Splitting** : Chaque wizard est lazy-loadé
 * 2. **Suspense Boundaries** : Loading states granulaires
 * 3. **Error Boundaries** : Récupération gracieuse des erreurs
 * 4. **Skeleton Screens** : UX optimisée pendant le loading
 * 5. **Preloading** : Warm-up des composants en arrière-plan
 * 6. **Progressive Enhancement** : Fonctionnalité de base disponible immédiatement
 *
 * RÉSULTATS ATTENDUS:
 * - First Contentful Paint < 1.2s
 * - Largest Contentful Paint < 2.5s
 * - Cumulative Layout Shift < 0.1
 * - Time to Interactive < 3.8s
 * `─────────────────────────────────────────────────`
 */