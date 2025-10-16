// Server Component - loads interventions server-side
import { notFound } from 'next/navigation'
import { createServerInterventionService } from '@/lib/services'
import { createServerSupabaseClient } from '@/lib/services'
import InterventionsClient from './interventions-client'
import { logger } from '@/lib/logger'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, AlertTriangle } from "lucide-react"

// Loading skeleton while data is fetched
function InterventionsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-slate-600">Chargement des interventions...</span>
        </div>
      </main>
    </div>
  )
}

export default async function PrestataireInterventionsPage() {
  const startTime = Date.now()

  logger.info('🔧 [PROVIDER-INTERVENTIONS-PAGE-SERVER] Loading provider interventions', {
    timestamp: new Date().toISOString()
  })

  try {
    // Get current user from server session
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.error('❌ [PROVIDER-INTERVENTIONS-PAGE-SERVER] User not authenticated', {
        error: userError
      })
      notFound()
    }

    // Verify user is a provider (prestataire)
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !userData || userData.role !== 'prestataire') {
      logger.error('❌ [PROVIDER-INTERVENTIONS-PAGE-SERVER] User is not a provider', {
        userId: user.id,
        role: userData?.role,
        error: roleError
      })
      notFound()
    }

    logger.info('✅ [PROVIDER-INTERVENTIONS-PAGE-SERVER] User authenticated as provider', {
      userId: user.id,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Load provider interventions
    logger.info('📍 [PROVIDER-INTERVENTIONS-PAGE-SERVER] Loading interventions...', { userId: user.id })
    const interventionService = await createServerInterventionService()
    const result = await interventionService.getByProvider(user.id)

    const interventions = result.success ? (result.data || []) : []

    logger.info('✅ [PROVIDER-INTERVENTIONS-PAGE-SERVER] Interventions loaded', {
      interventionCount: interventions.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    logger.info('🎉 [PROVIDER-INTERVENTIONS-PAGE-SERVER] All data loaded successfully', {
      userId: user.id,
      totalElapsed: `${Date.now() - startTime}ms`
    })

    // Pass data to Client Component
    return <InterventionsClient interventions={interventions} />
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('❌ [PROVIDER-INTERVENTIONS-PAGE-SERVER] Failed to load interventions', {
      error: errorMessage,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Show error state
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                  Mes Interventions
                </h1>
                <p className="text-slate-600">
                  Gérez les interventions qui vous sont assignées
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Erreur de chargement</h3>
                <p className="text-slate-500 mb-4">
                  Une erreur est survenue lors du chargement de vos interventions.
                </p>
                <p className="text-sm text-destructive">
                  {errorMessage}
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }
}

// Optional: Export loading component for Suspense boundary
export function Loading() {
  return <InterventionsLoading />
}
