import ProfilePage from "@/components/profile-page"
import { getServerAuthContext } from '@/lib/server-context'
import type { AuthUser } from '@/lib/auth-service'

export default async function AdminProfilePage() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { user, profile } = await getServerAuthContext('admin')

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
      role="admin"
      dashboardPath="/admin/dashboard"
      initialUser={initialUser}
    />
  )
}
