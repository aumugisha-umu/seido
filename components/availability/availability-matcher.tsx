"use client"

import { useState } from "react"
import { Calendar, Clock, TrendingUp, AlertTriangle, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MatchingResult, MatchedSlot, PartialMatch } from "@/hooks/use-availability-management"

interface AvailabilityMatcherProps {
  matchingResult: MatchingResult
  isOpen: boolean
  onClose: () => void
  onSelectSlot: (slot: { date: string; startTime: string; endTime: string }, comment?: string) => Promise<boolean>
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
}

export function AvailabilityMatcher({
  matchingResult,
  isOpen,
  onClose,
  onSelectSlot,
  userRole
}: AvailabilityMatcherProps) {
  const [selectedSlot, setSelectedSlot] = useState<MatchedSlot | PartialMatch | null>(null)
  const [comment, setComment] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)

  const handleSelectSlot = async () => {
    if (!selectedSlot) return

    setIsSelecting(true)
    try {
      const success = await onSelectSlot({
        date: selectedSlot.date,
        startTime: selectedSlot.start_time,
        endTime: selectedSlot.end_time
      }, comment)

      if (success) {
        onClose()
        setSelectedSlot(null)
        setComment('')
      }
    } finally {
      setIsSelecting(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 100) return 'bg-green-100 text-green-800'
    if (score >= 80) return 'bg-blue-100 text-blue-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-orange-100 text-orange-800'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 100) return CheckCircle
    if (score >= 80) return TrendingUp
    return AlertTriangle
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`
    }
    return `${mins}min`
  }

  const SlotCard = ({ slot, type, onSelect }: {
    slot: MatchedSlot | PartialMatch
    type: 'perfect' | 'partial'
    onSelect: () => void
  }) => {
    const ScoreIcon = getScoreIcon(slot.match_score)
    const isPartial = 'missing_users' in slot

    return (
      <Card className={`cursor-pointer transition-all hover:shadow-md ${
        selectedSlot === slot ? 'ring-2 ring-blue-500' : ''
      }`} onClick={onSelect}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-medium">
                {new Date(slot.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </span>
            </div>
            <Badge className={getScoreColor(slot.match_score)}>
              <ScoreIcon className="h-3 w-3 mr-1" />
              {slot.match_score}%
            </Badge>
          </div>

          <div className="flex items-center space-x-4 mb-3">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{slot.start_time} - {slot.end_time}</span>
            </div>
            {'overlap_duration' in slot && (
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{formatDuration(slot.overlap_duration)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {isPartial ? (
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-green-700">Disponibles:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {slot.available_users.map((user, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {user.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-orange-700">Manquants:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {slot.missing_users.map((user, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-orange-50">
                        {user.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-sm font-medium text-green-700">Participants:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {slot.participant_names.map((name, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {type === 'perfect' && (
            <div className="mt-3 text-center">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Match Parfait
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span>Résultats du Matching</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Statistiques globales */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {matchingResult.statistics.users_with_availabilities}
                  </div>
                  <div className="text-sm text-gray-600">Participants</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {matchingResult.perfectMatches.length}
                  </div>
                  <div className="text-sm text-gray-600">Matches parfaits</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {matchingResult.partialMatches.length}
                  </div>
                  <div className="text-sm text-gray-600">Matches partiels</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {matchingResult.statistics.best_match_score}%
                  </div>
                  <div className="text-sm text-gray-600">Meilleur score</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onglets des résultats */}
          <Tabs defaultValue="perfect" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="perfect" className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4" />
                <span>Parfaits ({matchingResult.perfectMatches.length})</span>
              </TabsTrigger>
              <TabsTrigger value="partial" className="flex items-center space-x-1">
                <AlertTriangle className="h-4 w-4" />
                <span>Partiels ({matchingResult.partialMatches.length})</span>
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>Suggestions ({matchingResult.suggestions.length})</span>
              </TabsTrigger>
              <TabsTrigger value="conflicts" className="flex items-center space-x-1">
                <X className="h-4 w-4" />
                <span>Conflits ({matchingResult.conflicts.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="perfect" className="space-y-3">
              {matchingResult.perfectMatches.length > 0 ? (
                <div className="grid gap-3">
                  {matchingResult.perfectMatches.map((slot, index) => (
                    <SlotCard
                      key={index}
                      slot={slot}
                      type="perfect"
                      onSelect={() => setSelectedSlot(slot)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun créneau parfait trouvé</p>
                  <p className="text-sm">Consultez les matches partiels ou les suggestions</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="partial" className="space-y-3">
              {matchingResult.partialMatches.length > 0 ? (
                <div className="grid gap-3">
                  {matchingResult.partialMatches.map((slot, index) => (
                    <SlotCard
                      key={index}
                      slot={slot}
                      type="partial"
                      onSelect={() => setSelectedSlot(slot)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun match partiel trouvé</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-3">
              {matchingResult.suggestions.length > 0 ? (
                <div className="space-y-4">
                  {matchingResult.suggestions.map((suggestion, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg">{suggestion.date}</CardTitle>
                        <p className="text-sm text-gray-600">{suggestion.reason}</p>
                      </CardHeader>
                      <CardContent>
                        {suggestion.alternatives.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium">Alternatives suggérées:</h4>
                            <div className="grid gap-2">
                              {suggestion.alternatives.map((alt, altIndex) => (
                                <SlotCard
                                  key={altIndex}
                                  slot={alt}
                                  type="perfect"
                                  onSelect={() => setSelectedSlot(alt)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune suggestion disponible</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="conflicts" className="space-y-3">
              {matchingResult.conflicts.length > 0 ? (
                <div className="space-y-3">
                  {matchingResult.conflicts.map((conflict, index) => (
                    <Alert key={index} variant="destructive">
                      <X className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{conflict.user_name}</strong> a des créneaux en conflit:
                        {conflict.conflicting_slots.map((slotGroup, groupIndex) => (
                          <div key={groupIndex} className="mt-2">
                            <span className="font-medium">{slotGroup.date}:</span>
                            <ul className="list-disc list-inside ml-4">
                              {slotGroup.slots.map((slot, slotIndex) => (
                                <li key={slotIndex} className="text-sm">
                                  {slot.start_time} - {slot.end_time}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                  <p>Aucun conflit détecté</p>
                  <p className="text-sm">Toutes les disponibilités sont cohérentes</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Sélection du créneau */}
          {selectedSlot && userRole === 'gestionnaire' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Confirmer la sélection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-white rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {new Date(selectedSlot.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </span>
                    <Badge className={getScoreColor(selectedSlot.match_score)}>
                      {selectedSlot.match_score}%
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedSlot.start_time} - {selectedSlot.end_time}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ajoutez un commentaire sur cette planification..."
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleSelectSlot}
                    disabled={isSelecting}
                    className="flex-1"
                  >
                    {isSelecting ? 'Planification...' : 'Confirmer et Planifier'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSlot(null)}
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
