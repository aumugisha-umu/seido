import ProfilePage from "@/components/profile-page"
import { getServerAuthContext } from '@/lib/server-context'
import type { AuthUser } from '@/lib/auth-service'

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic'

export default async function GestionnaireProfilePage() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { user, profile } = await getServerAuthContext('gestionnaire')

  // Convertir le profil en AuthUser
  const initialUser: AuthUser = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    first_name: profile.first_name || undefined,
    last_name: profile.last_name || undefined,
    role: profile.role,
    team_id: (profile as any).team_id || undefined,
    phone: profile.phone || undefined,
    avatar_url: profile.avatar_url || undefined,
    created_at: profile.created_at || undefined,
    updated_at: profile.updated_at || undefined,
  }

  return (
    <ProfilePage
      role="gestionnaire"
      dashboardPath="/gestionnaire/dashboard"
      initialUser={initialUser}
    />
  )
}
