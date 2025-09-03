import { Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LogementCardProps {
  logement: {
    name: string
    address: string
    floor: string
    tenant: string
  }
}

export function LogementCard({ logement }: LogementCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-green-600" />
          <span>Logement concerné</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-900">{logement.name}</h3>
            <p className="text-gray-600">{logement.address}</p>
            <p className="text-sm text-gray-500">{logement.floor}</p>
          </div>
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-gray-700">Locataire:</p>
            <p className="text-gray-900">{logement.tenant}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
