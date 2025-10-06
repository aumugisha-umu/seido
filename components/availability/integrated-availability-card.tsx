"use client"

import { Calendar, Clock, TrendingUp, Users, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AvailabilityManager } from "./availability-manager"
import { AvailabilityMatcher } from "./availability-matcher"
import { useAvailabilityManagement } from "@/hooks/use-availability-management"

interface IntegratedAvailabilityCardProps {
  interventionId: string
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  planning?: {
    type: string
    scheduledDate?: string
    scheduledTime?: string
  }
}

export function IntegratedAvailabilityCard({
  interventionId,
  userRole,
  // planning
}: IntegratedAvailabilityCardProps) {
  const {
    data,
    matchingResult,
    userAvailabilities,
    isLoading,
    isMatching,
    showMatchingResults,
    runMatching,
    selectSlot,
    openAvailabilityEditor,
    closeMatchingResults,
    canRunMatching,
    isScheduled
  } = useAvailabilityManagement(interventionId)

  // Si l'intervention est déjà planifiée, afficher les infos de planification
  if (isScheduled && data?.intervention.scheduled_date) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-green-500" />
            <span>Intervention Planifiée</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">
                {new Date(data.intervention.scheduled_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="text-sm text-green-700">
              de {new Date(data.intervention.scheduled_date).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          {/* Afficher un résumé des participants */}
          {data?.statistics && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {data.statistics.participants_with_availabilities}
                </div>
                <div className="text-sm text-gray-600">Participants confirmés</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {data.statistics.total_availability_slots}
                </div>
                <div className="text-sm text-gray-600">Créneaux coordonnés</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Si chargement
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span>Planification & Disponibilités</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Si pas de données
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span>Planification & Disponibilités</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Impossible de charger les données de planification</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (_status: string) => {
    switch (_status) {
      case 'demande': return 'bg-yellow-100 text-yellow-800'
      case 'approuvee': return 'bg-green-100 text-green-800'
      case 'planification': return 'bg-blue-100 text-blue-800'
      case 'planifiee': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span>Planification & Disponibilités</span>
            </CardTitle>
            <Badge className={getStatusColor(data.intervention.status)}>
              {data.intervention.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistiques rapides */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {data.statistics.participants_with_availabilities}
              </div>
              <div className="text-xs text-gray-600">Participants</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {data.statistics.total_availability_slots}
              </div>
              <div className="text-xs text-gray-600">Créneaux</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">
                {data.statistics.best_match_score}%
              </div>
              <div className="text-xs text-gray-600">Meilleur match</div>
            </div>
          </div>

          {/* Vos disponibilités */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Vos disponibilités</h4>
              {userAvailabilities.length > 0 && (
                <Button variant="outline" size="sm" onClick={openAvailabilityEditor}>
                  <Settings className="h-3 w-3 mr-1" />
                  Modifier
                </Button>
              )}
            </div>

            {userAvailabilities.length > 0 ? (
              <div className="space-y-1">
                {userAvailabilities.slice(0, 2).map((avail, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm p-2 bg-blue-50 rounded">
                    <Clock className="h-3 w-3 text-blue-600" />
                    <span>
                      {new Date(avail.date).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                      {' '}de {avail.startTime} à {avail.endTime}
                    </span>
                  </div>
                ))}
                {userAvailabilities.length > 2 && (
                  <div className="text-xs text-gray-500 text-center">
                    ... et {userAvailabilities.length - 2} autres créneaux
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Button onClick={openAvailabilityEditor} variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Ajouter vos disponibilités
                </Button>
              </div>
            )}
          </div>

          {/* Actions gestionnaire */}
          {userRole === 'gestionnaire' && (
            <div className="space-y-2">
              {canRunMatching && (
                <Button
                  onClick={runMatching}
                  disabled={isMatching}
                  className="w-full"
                  size="sm"
                >
                  {isMatching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Calcul en cours...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Lancer le Matching
                    </>
                  )}
                </Button>
              )}

              {data.statistics.total_matches > 0 && (
                <div className="text-center text-sm text-green-600">
                  {data.statistics.total_matches} créneaux compatibles trouvés
                </div>
              )}
            </div>
          )}

          {/* Résumé des autres participants */}
          {data.allParticipantAvailabilities.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Autres participants ({data.allParticipantAvailabilities.length})
              </h4>
              <div className="space-y-1">
                {data.allParticipantAvailabilities.slice(0, 3).map((participant, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <span className="font-medium">{participant.user.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {participant.user.role} • {participant.user.total_slots} créneaux
                    </Badge>
                  </div>
                ))}
                {data.allParticipantAvailabilities.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    ... et {data.allParticipantAvailabilities.length - 3} autres
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prochaine action recommandée */}
          {data.recommendations.nextAction !== 'intervention_scheduled' && (
            <div className="text-center text-sm text-gray-600">
              {data.recommendations.nextAction === 'run_matching' && 'Prêt pour le matching automatique'}
              {data.recommendations.nextAction === 'need_more_availabilities' && 'En attente de plus de disponibilités'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Composant complet de gestion (caché par défaut) */}
      <div className="hidden">
        <AvailabilityManager
          interventionId={interventionId}
          userRole={userRole}
        />
      </div>

      {/* Modal de résultats de matching */}
      {matchingResult && (
        <AvailabilityMatcher
          matchingResult={matchingResult}
          isOpen={showMatchingResults}
          onClose={closeMatchingResults}
          onSelectSlot={selectSlot}
          userRole={userRole}
        />
      )}
    </>
  )
}
