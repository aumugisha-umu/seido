import ProfilePage from "@/components/profile-page"
import { getUserProfile } from '@/lib/auth-dal'
import { redirect } from 'next/navigation'
import type { AuthUser } from '@/lib/auth-service'

export default async function GestionnaireProfilePage() {
  // ✅ Charger les données côté serveur (évite les problèmes de RLS client-side)
  const userContext = await getUserProfile()

  if (!userContext || !userContext.profile) {
    redirect('/auth/login')
  }

  // Convertir le profil en AuthUser
  const profile = userContext.profile
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
