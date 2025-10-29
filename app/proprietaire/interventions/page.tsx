import { requireRole } from "@/lib/auth-dal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function ProprietaireInterventions() {
  const { profile } = await requireRole(['proprietaire'])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          Mes Interventions
        </h1>
        <p className="text-muted-foreground mt-2">
          Suivez les interventions qui vous concernent
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Vous pouvez consulter et participer aux interventions pour lesquelles vous avez été assigné,
          de manière similaire aux prestataires.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Interventions en cours</CardTitle>
          <CardDescription>
            Interventions auxquelles vous êtes assigné
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune intervention pour le moment
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
