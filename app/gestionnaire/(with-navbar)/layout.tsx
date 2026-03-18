import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import { getCachedSubscriptionInfo } from "@/lib/subscription-cache"
import GestionnaireTopbar from "@/components/gestionnaire-topbar"
import { FABActionsProvider } from "@/components/ui/fab"
import { GestionnaireFABWrapper } from "@/components/gestionnaire-fab-wrapper"
import type { OnboardingProgress } from "@/app/actions/subscription-actions"

/**
 * 🧭 WITH-NAVBAR LAYOUT - Topbar for list/dashboard pages
 *
 * Adds a slim topbar with page title + notifications + page actions.
 * The sidebar is provided by the parent gestionnaire/layout.tsx (persistent across all pages).
 *
 * Pages concernees:
 * - /gestionnaire/dashboard
 * - /gestionnaire/biens (liste)
 * - /gestionnaire/interventions (liste)
 * - /gestionnaire/contacts (liste)
 * - /gestionnaire/notifications
 * - /gestionnaire/parametres
 * - /gestionnaire/profile
 * - /gestionnaire/mail
 */

export default async function WithNavbarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, team, sameRoleTeams, supabase } = await getServerAuthContext('gestionnaire')

  // Fetch subscription status + onboarding progress in parallel (SSR)
  // Eliminates 2 client-side round-trips in OnboardingChecklist
  let onboardingProgress: OnboardingProgress | null = null
  let isTrialing = false

  try {
    const [subInfo, lots, contacts, contracts, interventions, emails] = await Promise.all([
      getCachedSubscriptionInfo(team.id),
      supabase.from('lots').select('id', { count: 'exact', head: true }).eq('team_id', team.id),
      supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', team.id),
      supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('team_id', team.id),
      supabase.from('interventions').select('id', { count: 'exact', head: true }).eq('team_id', team.id).eq('creation_source', 'manual'),
      supabase.from('team_email_connections').select('id', { count: 'exact', head: true }).eq('team_id', team.id).eq('is_active', true),
    ])

    isTrialing = subInfo?.status === 'trialing'

    if (isTrialing) {
      onboardingProgress = {
        hasLot: (lots.count ?? 0) > 0,
        hasContact: (contacts.count ?? 0) > 1,
        hasContract: (contracts.count ?? 0) > 0,
        hasIntervention: (interventions.count ?? 0) > 0,
        hasClosedIntervention: false, // Not needed for checklist display
        hasEmail: (emails.count ?? 0) > 0,
        hasImportedData: false, // Tracked via localStorage
      }
    }
  } catch {
    // Silently fail — checklist falls back to client-side fetch
  }

  return (
    <>
      <GestionnaireTopbar
        teamId={team.id}
        userId={profile.id}
        teams={sameRoleTeams}
        onboardingProgress={onboardingProgress}
        isTrialing={isTrialing}
      />
      <FABActionsProvider>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <GestionnaireFABWrapper />
      </FABActionsProvider>
    </>
  )
}
