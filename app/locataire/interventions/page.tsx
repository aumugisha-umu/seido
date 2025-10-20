// Server Component - loads interventions server-side
import { notFound } from 'next/navigation'
import { createServerInterventionService } from '@/lib/services'
import { createServerSupabaseClient } from '@/lib/services'
import InterventionsClient from './interventions-client'
import { logger } from '@/lib/logger'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Wrench } from "lucide-react"

// Loading skeleton while data is fetched
function InterventionsLoading() {
  return (
    <div className="py-2">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="space-y-6">
        {/* Section header skeleton */}
        <div className="flex items-center space-x-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-64" />
        </div>

        {/* Search and filters skeleton */}
        <div className="flex items-center space-x-4 mb-6">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Interventions list skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full mb-3" />
                    <div className="flex items-center space-x-6 mb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function LocataireInterventionsPage() {
  const startTime = Date.now()

  logger.info('🏠 [TENANT-INTERVENTIONS-PAGE-SERVER] Loading tenant interventions', {
    timestamp: new Date().toISOString()
  })

  try {
    // Get current user from server session
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.error('❌ [TENANT-INTERVENTIONS-PAGE-SERVER] User not authenticated', {
        error: userError
      })
      notFound()
    }

    // Verify user is a tenant
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !userData || userData.role !== 'locataire') {
      logger.error('❌ [TENANT-INTERVENTIONS-PAGE-SERVER] User is not a tenant', {
        userId: user.id,
        role: userData?.role,
        error: roleError
      })
      notFound()
    }

    logger.info('✅ [TENANT-INTERVENTIONS-PAGE-SERVER] User authenticated as tenant', {
      userId: user.id,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Load tenant interventions
    logger.info('📍 [TENANT-INTERVENTIONS-PAGE-SERVER] Loading interventions...', { userId: user.id })
    const interventionService = await createServerInterventionService()
    const result = await interventionService.getByTenant(user.id)

    const interventions = result.success ? (result.data || []) : []

    logger.info('✅ [TENANT-INTERVENTIONS-PAGE-SERVER] Interventions loaded', {
      interventionCount: interventions.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    logger.info('🎉 [TENANT-INTERVENTIONS-PAGE-SERVER] All data loaded successfully', {
      userId: user.id,
      totalElapsed: `${Date.now() - startTime}ms`
    })

    // Pass data to Client Component
    return <InterventionsClient interventions={interventions} />
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('❌ [TENANT-INTERVENTIONS-PAGE-SERVER] Failed to load interventions', {
      error: errorMessage,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Show error state
    return (
      <div className="py-2">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Demandes</h1>
            <p className="text-gray-600">Suivez vos demandes d'intervention pour votre logement</p>
          </div>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="p-4 bg-red-100 rounded-full inline-block">
                <Wrench className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Erreur de chargement</h3>
                <p className="text-destructive mt-2">
                  Une erreur est survenue lors du chargement de vos interventions.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {errorMessage}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}

// Optional: Export loading component for Suspense boundary
export function Loading() {
  return <InterventionsLoading />
}
