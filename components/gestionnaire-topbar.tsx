"use client"

import { Bell } from "lucide-react"
import { GlobalSearchPalette } from "@/components/search/global-search-palette"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { TOPBAR_ACTIONS_SLOT_ID } from "@/components/page-actions"
import { HeaderPortal } from "@/components/header-portal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import NotificationPopover from "@/components/notification-popover"
import { useGlobalNotifications } from "@/hooks/use-global-notifications"
import { useNotificationPopover } from "@/hooks/use-notification-popover"
import { TeamSelector } from "@/components/team-selector"
import { useCurrentTeam } from "@/hooks/use-current-team"
import { cn } from "@/lib/utils"
import { OnboardingChecklist } from "@/components/billing/onboarding-checklist"
import type { Team } from "@/lib/services/core/service-types"
import type { OnboardingProgress } from "@/app/actions/subscription-actions"

/**
 * Page title mapping from pathname to display title.
 * Falls back to capitalizing the last path segment.
 */
const pageTitles: Record<string, string> = {
  "/gestionnaire/dashboard": "Tableau de bord",
  "/gestionnaire/biens": "Patrimoine",
  "/gestionnaire/operations": "Operations",
  "/gestionnaire/contacts": "Contacts",
  "/gestionnaire/contrats": "Contrats",
  "/gestionnaire/mail": "Emails",
  "/gestionnaire/notifications": "Notifications",
  "/gestionnaire/parametres": "Param\u00e8tres",
  "/gestionnaire/settings": "Abonnement",
  "/gestionnaire/profile": "Mon profil",
  "/gestionnaire/aide": "Aides",
}

const getPageTitle = (pathname: string): string => {
  if (pageTitles[pathname]) return pageTitles[pathname]
  for (const [route, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(route + "/")) return title
  }
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1] || "Dashboard"
  return last.charAt(0).toUpperCase() + last.slice(1)
}

interface GestionnaireTopbarProps {
  teamId?: string
  userId?: string
  teams?: Team[]
  role?: string
  onboardingProgress?: OnboardingProgress | null
  isTrialing?: boolean
}

export default function GestionnaireTopbar({
  teamId,
  userId,
  teams = [],
  role = "gestionnaire",
  onboardingProgress,
  isTrialing,
}: GestionnaireTopbarProps) {
  const pathname = usePathname()
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false)
  const pageTitle = getPageTitle(pathname)

  const {
    currentTeamId,
    changeTeam,
    hasMultipleTeams,
  } = useCurrentTeam({
    teams,
    currentRole: role,
  })

  const { unreadCount: globalUnreadCount, refetch: refetchGlobalNotifications } = useGlobalNotifications({
    teamId,
    userId,
  })

  const {
    notifications: popoverNotifications,
    loading: loadingPopoverNotifications,
    error: popoverNotificationsError,
    markAsRead,
    markAsUnread,
    markAllAsRead,
  } = useNotificationPopover({
    teamId,
    limit: 10,
    autoRefresh: isNotificationPopoverOpen,
    refreshInterval: 30000,
  })

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    refetchGlobalNotifications()
  }

  return (
    <HeaderPortal>
      <div className="flex items-center gap-2 sm:gap-3 w-full h-full">
        {/* Left: page title */}
        <h1 className="text-base sm:text-lg font-bold text-foreground truncate min-w-0 max-w-[50%] sm:max-w-none">
          {pageTitle}
        </h1>

        {/* Onboarding checklist — SSR data eliminates client-side fetch delay */}
        <OnboardingChecklist progress={onboardingProgress} isTrialing={isTrialing} />

        {/* Spacer — pushes right section to edge (hidden when PageActions slot is visible at lg) */}
        <div className="flex-1 lg:hidden" />

        {/* Desktop: page-specific actions injected via PageActions portal */}
        <div
          id={TOPBAR_ACTIONS_SLOT_ID}
          className="hidden lg:flex lg:flex-1 items-center justify-end gap-2 lg:gap-3 min-w-0"
        />

        {/* Right: search + team selector + notifications */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <GlobalSearchPalette />

          {hasMultipleTeams && (
            <div className="hidden sm:block">
              <TeamSelector
                teams={teams}
                currentTeamId={currentTeamId}
                onTeamChange={changeTeam}
                currentRole={role}
                size="compact"
              />
            </div>
          )}

          <Popover open={isNotificationPopoverOpen} onOpenChange={setIsNotificationPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "relative flex items-center justify-center h-9 w-9 rounded-lg border transition-all duration-200",
                  isNotificationPopoverOpen || pathname.includes("/notifications")
                    ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted hover:border-border"
                )}
                aria-label="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {globalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium shadow-sm px-1">
                    {globalUnreadCount > 99 ? "99+" : globalUnreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[90vw] sm:w-[400px] max-w-[400px] p-0" align="end" sideOffset={8}>
              <NotificationPopover
                notifications={popoverNotifications}
                loading={loadingPopoverNotifications}
                error={popoverNotificationsError}
                onMarkAsRead={markAsRead}
                onMarkAsUnread={markAsUnread}
                onMarkAllAsRead={handleMarkAllAsRead}
                role={role}
                onClose={() => setIsNotificationPopoverOpen(false)}
                unreadCount={globalUnreadCount}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </HeaderPortal>
  )
}
