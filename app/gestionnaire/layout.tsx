import type React from "react"
import { cookies } from "next/headers"
import { getServerAuthContext } from "@/lib/server-context"
import { GestionnaireLayoutClient } from "./layout-client"
import { FrillWidget } from "@/components/frill-widget"
import { RealtimeWrapper } from "@/components/realtime-wrapper"
import { PWABannerWrapper } from "@/components/pwa/pwa-banner-wrapper"
import { SidebarProvider } from "@/components/ui/sidebar"
import GestionnaireSidebar from "@/components/gestionnaire-sidebar"
import { GestionnaireHeader } from "@/components/gestionnaire-header"
import { SubscriptionBanners } from "@/components/billing/subscription-banners"
import { getCachedSubscriptionInfo } from "@/lib/subscription-cache"
import { ComposeEmailProvider } from "@/contexts/compose-email-context"
import { unstable_cache } from "next/cache"
import { createServiceRoleSupabaseClient } from "@/lib/services"

// Cached intervention count per team (for trial banner messaging)
const getCachedInterventionCount = (teamId: string) =>
  unstable_cache(
    async () => {
      try {
        const adminClient = createServiceRoleSupabaseClient()
        const { count } = await adminClient
          .from('interventions')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', teamId)
        return count ?? 0
      } catch {
        return 0
      }
    },
    ['intervention-count', teamId],
    { revalidate: 900 } // 15 min cache
  )()

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
  const { user, profile, team, sameRoleTeams, supabase } = await getServerAuthContext('gestionnaire')

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()

  // Read sidebar state from cookie to avoid layout flash
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get("sidebar_state")?.value
  const defaultOpen = sidebarCookie !== "false"

  // Fetch subscription info + intervention count + email connections in parallel
  let subscriptionInfo = null
  let interventionCount = 0
  let emailConnections: Array<{ id: string; email_address: string; provider: string; is_active: boolean; unread_count: number; email_count: number }> = []
  try {
    const [subInfo, intCount, emailConnsResult] = await Promise.all([
      getCachedSubscriptionInfo(team.id),
      getCachedInterventionCount(team.id),
      supabase.from('team_email_connections').select('id, email_address, provider, is_active').eq('team_id', team.id).eq('is_active', true).order('created_at', { ascending: false }),
    ])
    subscriptionInfo = subInfo
    interventionCount = intCount
    emailConnections = (emailConnsResult.data ?? []).map(c => ({
      id: c.id,
      email_address: c.email_address,
      provider: c.provider,
      is_active: c.is_active,
      unread_count: 0,
      email_count: 0,
    }))
  } catch {
    // Silently fail — banners just won't show, compose button hidden
  }

  return (
    <PWABannerWrapper>
      <div className="h-screen bg-background flex flex-col overflow-hidden relative">
        {/* Ambient Gradient Background - Dark mode only */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-0 dark:opacity-100 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
        </div>

        {/* Full-width header + Sidebar + Content area */}
        <SidebarProvider defaultOpen={defaultOpen} className="sidebar-with-header flex-1 !min-h-0 relative z-10">
          <ComposeEmailProvider emailConnections={emailConnections}>
          {/* Full-width header — fixed, spans above sidebar and content */}
          <GestionnaireHeader />

          {/* Sidebar — CSS offset to start below header (see globals.css) */}
          <GestionnaireSidebar
            userName={userName}
            userInitial={userInitial}
            avatarUrl={typeof profile.avatar_url === 'string' ? profile.avatar_url : undefined}
            teams={sameRoleTeams}
            teamName={team.name}
          />

          {/* Content area — pushed down by header height */}
          <div className="flex flex-col flex-1 min-w-0 h-full relative pt-14">
            <div className="absolute top-14 left-0 right-0 z-50 pointer-events-none">
              <div className="pointer-events-auto">
                <SubscriptionBanners subscriptionInfo={subscriptionInfo} role="gestionnaire" interventionCount={interventionCount} />
              </div>
            </div>
            <RealtimeWrapper userId={profile.id} teamId={team?.id}>
              {children}
            </RealtimeWrapper>
          </div>
          </ComposeEmailProvider>
        </SidebarProvider>

        <GestionnaireLayoutClient />
        <FrillWidget />
      </div>
    </PWABannerWrapper>
  )
}
