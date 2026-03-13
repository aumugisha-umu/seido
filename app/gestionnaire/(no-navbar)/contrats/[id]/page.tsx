// Server Component - loads contract data server-side
import { notFound } from 'next/navigation'
import { createServerContractService } from '@/lib/services/domain/contract.service'
import { createServerInterventionService } from '@/lib/services'
import { getServerAuthContext } from '@/lib/server-context'
import ContractDetailsClient from './contract-details-client'
import { logger } from '@/lib/logger'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// Loading skeleton while data is fetched
function ContractDetailsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="content-max-width px-4 sm:px-6 lg:px-8 py-4">
          <Skeleton className="h-8 w-64" />
        </div>
      </header>

      <main className="content-max-width px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}

export default async function ContractDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const startTime = Date.now()

  // Phase 0: Auth + params in parallel
  const [{ id }, { team }] = await Promise.all([
    params,
    getServerAuthContext('gestionnaire')
  ])

  if (!team?.id) {
    notFound()
  }

  logger.info('📄 [CONTRACT-PAGE-SERVER] Loading contract details', {
    contractId: id,
    timestamp: new Date().toISOString()
  })

  try {
    // Phase 1: Create both services in parallel
    const [contractService, interventionService] = await Promise.all([
      createServerContractService(),
      createServerInterventionService()
    ])

    // Phase 2: Load contract (gate — must exist + team check before loading related data)
    logger.info('📍 [CONTRACT-PAGE-SERVER] Step 1: Loading contract...', { contractId: id })
    const contract = await contractService.getById(id)

    if (!contract) {
      logger.error('❌ [CONTRACT-PAGE-SERVER] Contract not found', { contractId: id })
      notFound()
    }

    logger.info('✅ [CONTRACT-PAGE-SERVER] Contract loaded', {
      contractId: contract.id,
      contractTitle: contract.title,
      elapsed: `${Date.now() - startTime}ms`
    })

    if (contract.team_id !== team.id) {
      logger.error('❌ [CONTRACT-PAGE-SERVER] Access denied - wrong team', {
        contractId: id,
        contractTeamId: contract.team_id,
        userTeamId: team.id
      })
      notFound()
    }

    // Phase 3: Parallelize documents + interventions (services already initialized)
    logger.info('📍 [CONTRACT-PAGE-SERVER] Step 2: Loading documents + interventions in parallel...', { contractId: id })

    const [documentsResult, interventionsResult] = await Promise.all([
      contractService.getDocuments(id),
      interventionService.getByContract(id)
    ])

    const documents = documentsResult.success ? documentsResult.data : []
    const interventions = interventionsResult.success ? interventionsResult.data || [] : []

    logger.info('✅ [CONTRACT-PAGE-SERVER] Documents loaded', {
      documentCount: documents.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    logger.info('✅ [CONTRACT-PAGE-SERVER] Interventions loaded', {
      interventionCount: interventions.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    logger.info('🎉 [CONTRACT-PAGE-SERVER] All data loaded successfully', {
      contractId: id,
      totalElapsed: `${Date.now() - startTime}ms`
    })

    // Pass data to Client Component
    return (
      <ContractDetailsClient
        contract={contract}
        documents={documents}
        interventions={interventions}
        teamId={team.id}
      />
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('❌ [CONTRACT-PAGE-SERVER] Failed to load contract data', {
      contractId: id,
      error: errorMessage,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Re-throw NEXT_REDIRECT errors
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    notFound()
  }
}

// Optional: Add loading.tsx for Suspense boundary
export function Loading() {
  return <ContractDetailsLoading />
}
