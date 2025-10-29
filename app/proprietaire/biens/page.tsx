import { requireRole } from "@/lib/auth-dal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Home, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function ProprietaireBiens() {
  const { profile } = await requireRole(['proprietaire'])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Mes Biens
        </h1>
        <p className="text-muted-foreground mt-2">
          Consultez les biens dont vous êtes propriétaire
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Accès en lecture seule</strong> - Vous pouvez consulter les informations de vos biens.
          Pour toute modification, veuillez contacter votre gestionnaire.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Immeubles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Mes Immeubles
            </CardTitle>
            <CardDescription>
              Immeubles dont vous êtes propriétaire
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aucun immeuble pour le moment
            </p>
          </CardContent>
        </Card>

        {/* Lots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Mes Lots
            </CardTitle>
            <CardDescription>
              Lots dont vous êtes propriétaire
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aucun lot pour le moment
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
