"use client"

import { Bell, Menu } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { TOPBAR_ACTIONS_SLOT_ID } from "@/components/page-actions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import NotificationPopover from "@/components/notification-popover"
import { useGlobalNotifications } from "@/hooks/use-global-notifications"
import { useNotificationPopover } from "@/hooks/use-notification-popover"
import { useSidebar } from "@/components/ui/sidebar"
import { TeamSelector } from "@/components/team-selector"
import { useCurrentTeam } from "@/hooks/use-current-team"
import { cn } from "@/lib/utils"
import type { Team } from "@/lib/services/core/service-types"

/**
 * Page title mapping from pathname to display title.
 * Falls back to capitalizing the last path segment.
 */
const pageTitles: Record<string, string> = {
  "/gestionnaire/dashboard": "Tableau de bord",
  "/gestionnaire/biens": "Patrimoine",
  "/gestionnaire/interventions": "Interventions",
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
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname]

  // Check if pathname starts with a known route
  for (const [route, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(route + "/")) return title
  }

  // Fallback: capitalize last segment
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1] || "Dashboard"
  return last.charAt(0).toUpperCase() + last.slice(1)
}

interface GestionnaireTopbarProps {
  teamId?: string
  userId?: string
  teams?: Team[]
  role?: string
}

export default function GestionnaireTopbar({
  teamId,
  userId,
  teams = [],
  role = "gestionnaire",
}: GestionnaireTopbarProps) {
  const pathname = usePathname()
  const { toggleSidebar, isMobile } = useSidebar()
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
    archive,
    refetch: refetchPopoverNotifications,
  } = useNotificationPopover({
    teamId,
    limit: 10,
    autoRefresh: isNotificationPopoverOpen,
    refreshInterval: 30000,
  })

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = popoverNotifications.filter((n) => !n.read)
    await Promise.all(unreadNotifications.map((n) => markAsRead(n.id)))
    refetchGlobalNotifications()
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center border-b bg-white dark:bg-background px-4 sm:px-6 gap-3",
        "h-14 sm:h-16"
      )}
    >
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Menu de navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Center: page-specific actions injected via PageActions portal */}
      <div
        id={TOPBAR_ACTIONS_SLOT_ID}
        className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0"
      />

      {/* Right: team selector + notifications */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
                "relative flex items-center justify-center h-10 w-10 rounded-lg border transition-all duration-200",
                isNotificationPopoverOpen || pathname.includes("/notifications")
                  ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted hover:border-border"
              )}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
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
              onArchive={archive}
              onMarkAllAsRead={handleMarkAllAsRead}
              role={role}
              onClose={() => setIsNotificationPopoverOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
