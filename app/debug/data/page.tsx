import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { requireRole } from "@/lib/dal"
import { createServerTeamService } from "@/lib/services"
import { createSampleBuildingsForTeam, checkTeamDataStatus } from "@/lib/create-sample-data"
import { logger, logError } from '@/lib/logger'
// TODO: Initialize services for new architecture
// Example: const userService = await createServerUserService()
// Remember to make your function async if it isn't already


/**
 * 🐛 PAGE DE DEBUG DATA
 *
 * Page pour diagnostiquer et créer des données de test
 * Accessible uniquement aux gestionnaires en développement
 */

async function createSampleData(teamId: string) {
  logger.info('🔧 [DEBUG] Creating sample data for team:', teamId)
  const result = await createSampleBuildingsForTeam({ teamId, force: false })
  logger.info('🔧 [DEBUG] Sample data creation result:', result)
  return result
}

export default async function DebugDataPage() {
  const user = await requireRole('gestionnaire')

  // Initialize team service
  const teamService = await createServerTeamService()

  // Récupérer l'équipe de l'utilisateur
  const teamsResult = await teamService.getUserTeams(user.id)
  const teams = teamsResult.success ? teamsResult.data : []
  const userTeamId = teams && teams.length > 0 ? teams[0].id : ''

  if (!userTeamId) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">❌ Aucune équipe trouvée</CardTitle>
          </CardHeader>
          <CardContent>
            <p>L'utilisateur n'est associé à aucune équipe.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Diagnostic complet des données
  let dataStatus = { buildings: 0, users: 0, interventions: 0, hasError: true }
  let diagnosticDetails: Record<string, unknown> = {}

  try {
    dataStatus = await checkTeamDataStatus(userTeamId)

    // Diagnostic détaillé
    const [buildings, users, interventions] = await Promise.all([
      buildingService.getTeamBuildings(userTeamId),
      userService.getTeamUsers(userTeamId),
      interventionService.getTeamInterventions(userTeamId)
    ])

    diagnosticDetails = {
      team: {
        id: userTeamId,
        name: teams[0]?.name || 'Unknown'
      },
      user: {
        id: user.id,
        name: user.display_name || user.name,
        role: user.role
      },
      data: {
        buildings: buildings?.length || 0,
        users: users?.length || 0,
        interventions: interventions?.length || 0
      },
      sampleBuildings: buildings?.slice(0, 3).map(b => ({
        id: b.id,
        name: b.name,
        address: b.address,
        lots: b.lots?.length || 0
      })) || []
    }
  } catch (error) {
    logger.error('❌ [DEBUG] Error during diagnostic:', error)
    diagnosticDetails.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🐛 Debug Data Dashboard
              <Badge variant="outline">Development Only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Diagnostic et gestion des données de test pour l'équipe <strong>{teams[0]?.name}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Buildings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataStatus.buildings}</div>
              <Badge variant={dataStatus.buildings > 0 ? "default" : "destructive"}>
                {dataStatus.buildings > 0 ? "✅ Données présentes" : "❌ Aucune donnée"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataStatus.users}</div>
              <Badge variant={dataStatus.users > 0 ? "default" : "destructive"}>
                {dataStatus.users > 0 ? "✅ Données présentes" : "❌ Aucune donnée"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Interventions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataStatus.interventions}</div>
              <Badge variant={dataStatus.interventions > 0 ? "default" : "destructive"}>
                {dataStatus.interventions > 0 ? "✅ Données présentes" : "❌ Aucune donnée"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Diagnostic */}
        <Card>
          <CardHeader>
            <CardTitle>🔍 Diagnostic Détaillé</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
              {JSON.stringify(diagnosticDetails, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Actions */}
        {dataStatus.buildings === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">⚠️ Aucun Building Détecté</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Aucun immeuble n'a été trouvé pour cette équipe. Cela explique pourquoi
                le dashboard affiche "0 Immeubles" et "0 Lots".
              </p>

              <div className="flex gap-4">
                <form action={async () => {
                  'use server'
                  await createSampleData(userTeamId)
                }}>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    🏗️ Créer des Données d'Exemple
                  </Button>
                </form>

                <Button variant="outline" asChild>
                  <Link href="/gestionnaire/biens/immeubles/nouveau">
                    ➕ Créer un Immeuble Manuellement
                  </Link>
                </Button>
              </div>

              <div className="text-sm text-gray-600">
                <p><strong>Option 1:</strong> Créer automatiquement 2 immeubles et 4 lots d'exemple</p>
                <p><strong>Option 2:</strong> Créer manuellement via l'interface utilisateur</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SQL Script Alternative */}
        <Card>
          <CardHeader>
            <CardTitle>📜 Alternative SQL</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Vous pouvez aussi exécuter le script SQL directement dans Supabase :
            </p>
            <code className="bg-gray-100 p-2 rounded text-xs block">
              scripts/create-sample-buildings.sql
            </code>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
