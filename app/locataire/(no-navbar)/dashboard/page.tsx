import { requireRole } from "@/lib/auth-dal"
import LocataireDashboard from "@/components/dashboards/locataire-dashboard"

export default async function LocataireDashboardPage() {
  // Fetch user and team data server-side
  const { user, profile } = await requireRole(['locataire'])

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()
  const teamId = profile.team_id

  return (
    <LocataireDashboard
      userName={userName}
      userInitial={userInitial}
      teamId={teamId}
    />
  )
}
