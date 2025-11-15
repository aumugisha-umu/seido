/**
 * Page Profil Prestataire - Mode Démo
 */

'use client'

import ProfilePage from "@/components/profile-page"
import { useDemoContext } from '@/lib/demo/demo-context'
import type { AuthUser } from '@/lib/auth-service'

export default function PrestataireProfilePageDemo() {
  const { getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  if (!user) {
    return (
      <div className="container py-8">
        <p className="text-gray-500">Chargement du profil...</p>
      </div>
    )
  }

  // Convertir l'utilisateur démo en AuthUser
  const initialUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    first_name: user.first_name || undefined,
    last_name: user.last_name || undefined,
    role: user.role,
    team_id: user.team_id || undefined,
    phone: user.phone || undefined,
    avatar_url: user.avatar_url || undefined,
    created_at: user.created_at || undefined,
    updated_at: user.updated_at || undefined,
  }

  return (
    <ProfilePage
      role="prestataire"
      dashboardPath="/demo/prestataire/dashboard"
      initialUser={initialUser}
    />
  )
}
