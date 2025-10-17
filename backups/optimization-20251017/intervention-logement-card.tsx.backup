import { AlertTriangle, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface InterventionLogementCardProps {
  intervention: {
    type: string
    urgency: string
    location?: string
    description: string
  }
  logement: {
    name: string
    address: string
    floor: string
    tenant: string
  }
  getUrgencyColor: (_urgency: string) => string
}

export function InterventionLogementCard({ intervention, logement, getUrgencyColor }: InterventionLogementCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span>Détails de l'intervention</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Type:</span>
              <p className="text-foreground">{intervention.type}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Priorité:</span>
              <Badge className={getUrgencyColor(intervention.urgency)}>{intervention.urgency}</Badge>
            </div>
          </div>

          {intervention.location && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Localisation:</span>
              <p className="text-foreground">{intervention.location}</p>
            </div>
          )}

          <div>
            <span className="text-sm font-medium text-muted-foreground">Description:</span>
            <p className="text-foreground mt-1">{intervention.description}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center space-x-2 mb-3">
            <Building2 className="h-4 w-4 text-green-600" />
            <span className="font-medium text-foreground">Logement concerné</span>
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-foreground">{logement.name}</h3>
              <p className="text-muted-foreground">{logement.address}</p>
              <p className="text-sm text-muted-foreground">{logement.floor}</p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground">Locataire:</p>
              <p className="text-foreground">{logement.tenant}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
