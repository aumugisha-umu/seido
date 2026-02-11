import type React from "react"
import { cookies } from "next/headers"
import { getServerAuthContext } from "@/lib/server-context"
import { GestionnaireLayoutClient } from "./layout-client"
import { FrillWidget } from "@/components/frill-widget"
import { RealtimeWrapper } from "@/components/realtime-wrapper"
import { PWABannerWrapper } from "@/components/pwa/pwa-banner-wrapper"
import { SidebarProvider } from "@/components/ui/sidebar"
import GestionnaireSidebar from "@/components/gestionnaire-sidebar"

/**
 * 🔐 GESTIONNAIRE LAYOUT - ROOT LAYOUT
 *
 * Architecture: Sidebar persistante + Route Groups pour le contenu
 * - Sidebar: Visible sur TOUTES les pages gestionnaire (listes ET detail)
 * - (with-navbar): Ajoute une topbar (titre + notifications + actions)
 * - (no-navbar): Pages gerent leur propre header (DetailPageHeader, etc.)
 *
 * La sidebar est au niveau racine pour persister pendant la navigation.
 * Les Route Groups ne gerent que la difference de topbar.
 */

export default async function GestionnaireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, team, sameRoleTeams } = await getServerAuthContext('gestionnaire')

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()

  // Read sidebar state from cookie to avoid layout flash
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get("sidebar_state")?.value
  const defaultOpen = sidebarCookie !== "false"

  return (
    <PWABannerWrapper>
      <div className="h-screen bg-background flex flex-col overflow-hidden relative">
        {/* Ambient Gradient Background - Dark mode only */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-0 dark:opacity-100 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
        </div>

        {/* Sidebar + Content area */}
        <SidebarProvider defaultOpen={defaultOpen} className="flex-1 !min-h-0 relative z-10">
          <GestionnaireSidebar
            userName={userName}
            userInitial={userInitial}
            avatarUrl={typeof profile.avatar_url === 'string' ? profile.avatar_url : undefined}
            teams={sameRoleTeams}
            teamId={team.id}
          />
          <div className="flex flex-col flex-1 min-w-0 h-full">
            <RealtimeWrapper userId={profile.id} teamId={team?.id}>
              {children}
            </RealtimeWrapper>
          </div>
        </SidebarProvider>

        <GestionnaireLayoutClient />
        <FrillWidget />
      </div>
    </PWABannerWrapper>
  )
}
