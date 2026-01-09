import ProfilePage from "@/components/profile-page"
import { getServerAuthContext } from '@/lib/server-context'
import type { AuthUser } from '@/lib/auth-service'

export default async function AdminProfilePage() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { user, profile } = await getServerAuthContext('admin')

  // ✅ Parser first_name et last_name depuis name si non renseignés
  let firstName = profile.first_name
  let lastName = profile.last_name

  if ((!firstName || !lastName) && profile.name) {
    const nameParts = profile.name.trim().split(/\s+/)
    if (nameParts.length >= 2) {
      firstName = firstName || nameParts[0]
      lastName = lastName || nameParts.slice(1).join(' ')
    } else if (nameParts.length === 1) {
      firstName = firstName || nameParts[0]
    }
  }

  // Convertir le profil en AuthUser
  const initialUser: AuthUser = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    role: profile.role,
    team_id: (profile as any).team_id || undefined,
    phone: profile.phone || undefined,
    avatar_url: profile.avatar_url || undefined,
    created_at: profile.created_at || undefined,
    updated_at: profile.updated_at || undefined,
  }

  return (
    <ProfilePage
      role="admin"
      dashboardPath="/admin/dashboard"
      initialUser={initialUser}
    />
  )
}
