import { requireRole } from "@/lib/auth-dal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, ClipboardList, Home } from "lucide-react"
import Link from "next/link"
import { createServerTeamService } from "@/lib/services"

export default async function ProprietaireDashboard() {
  const { profile } = await requireRole(['proprietaire'])

  // Get team info
  const teamService = await createServerTeamService()
  const teams = await teamService.getUserTeams(profile.id)
  const team = teams[0] // Get first team

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Tableau de bord propriétaire
        </h1>
        <p className="text-muted-foreground mt-2">
          Bienvenue {profile.first_name} - Gérez vos biens et suivez vos interventions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Mes Biens */}
        <Link href="/proprietaire/biens">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Mes Biens
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Immeubles et lots dont vous êtes propriétaire
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Mes Interventions */}
        <Link href="/proprietaire/interventions">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Mes Interventions
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Interventions qui vous concernent
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Mon Équipe */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Mon Équipe
            </CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.name}</div>
            <p className="text-xs text-muted-foreground">
              Équipe de gestion
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            En tant que propriétaire, vous avez un accès en lecture seule à vos biens.
          </p>
          <p className="text-sm text-muted-foreground">
            Vous pouvez consulter les informations sur vos immeubles et lots, ainsi que suivre les interventions qui vous concernent.
          </p>
          <p className="text-sm text-muted-foreground">
            Pour toute modification ou demande, contactez votre gestionnaire.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
