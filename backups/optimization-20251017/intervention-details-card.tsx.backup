import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface InterventionDetailsCardProps {
  intervention: {
    type: string
    urgency: string
    location?: string
    description: string
  }
  getUrgencyColor: (_urgency: string) => string
}

export function InterventionDetailsCard({ intervention, getUrgencyColor }: InterventionDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span>Détails de l'intervention</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Type:</span>
            <p className="text-gray-900">{intervention.type}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Priorité:</span>
            <Badge className={getUrgencyColor(intervention.urgency)}>{intervention.urgency}</Badge>
          </div>
        </div>

        {intervention.location && (
          <div>
            <span className="text-sm font-medium text-gray-700">Localisation:</span>
            <p className="text-gray-900">{intervention.location}</p>
          </div>
        )}

        <div>
          <span className="text-sm font-medium text-gray-700">Description:</span>
          <p className="text-gray-900 mt-1">{intervention.description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
