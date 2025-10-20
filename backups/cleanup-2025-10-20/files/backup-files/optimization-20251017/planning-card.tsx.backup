"use client"

import { Calendar, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface PlanningCardProps {
  planning: {
    type: string
    scheduledDate?: string
    scheduledTime?: string
  }
  userAvailabilities?: Array<{
    date: string
    startTime: string
    endTime: string
  }>
  otherAvailabilities?: Array<{
    person: string
    slots: Array<{
      date: string
      startTime: string
      endTime: string
    }>
  }>
  userRole: "prestataire" | "locataire"
  onModifyAvailabilities?: () => void
}

export function PlanningCard({
  planning,
  userAvailabilities,
  otherAvailabilities,
  userRole,
  onModifyAvailabilities,
}: PlanningCardProps) {
  const userLabel = userRole === "prestataire" ? "Vos disponibilités" : "Vos disponibilités"
  const otherLabel = userRole === "prestataire" ? "Disponibilités du locataire" : "Disponibilités des prestataires"
  const userBgColor = userRole === "prestataire" ? "bg-primary/10" : "bg-green-50"
  const userIconColor = userRole === "prestataire" ? "text-primary" : "text-green-600"
  const otherBgColor = userRole === "prestataire" ? "bg-green-50" : "bg-primary/10"
  const otherIconColor = userRole === "prestataire" ? "text-green-600" : "text-primary"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span>Planification & Disponibilités</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {planning.type === "fixed" && planning.scheduledDate && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="font-medium text-primary">Intervention programmée</p>
            <p className="text-primary/80">
              {new Date(planning.scheduledDate).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              de {planning.scheduledTime}
            </p>
          </div>
        )}

        {userAvailabilities && userAvailabilities.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">{userLabel}</h4>
              {onModifyAvailabilities && (
                <Button variant="outline" size="sm" onClick={onModifyAvailabilities}>
                  Modifier
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {userAvailabilities.map((slot, index) => (
                <div key={index} className={`flex items-center space-x-3 p-2 ${userBgColor} rounded`}>
                  <Clock className={`h-4 w-4 ${userIconColor}`} />
                  <span className="text-sm text-foreground">
                    {new Date(slot.date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}{" "}
                    de {slot.startTime} à {slot.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {otherAvailabilities && otherAvailabilities.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-3">{otherLabel}</h4>
            {otherAvailabilities.map((availability, index) => (
              <div key={index} className="space-y-2">
                <p className="text-sm font-medium text-gray-700">{availability.person}</p>
                <div className="space-y-2">
                  {availability.slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className={`flex items-center space-x-3 p-2 ${otherBgColor} rounded`}>
                      <Clock className={`h-4 w-4 ${otherIconColor}`} />
                      <span className="text-sm text-foreground">
                        {new Date(slot.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        de {slot.startTime} à {slot.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
