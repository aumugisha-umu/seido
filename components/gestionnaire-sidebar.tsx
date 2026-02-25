"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Image from "next/image"
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Wrench,
  Mail,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { TeamSelector, TeamSelectorCompact } from "@/components/team-selector"
import { useCurrentTeam } from "@/hooks/use-current-team"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import type { Team } from "@/lib/services/core/service-types"

interface NavigationItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNavItems: NavigationItem[] = [
  { href: "/gestionnaire/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gestionnaire/biens", label: "Patrimoine", icon: Building2 },
  { href: "/gestionnaire/contacts", label: "Contacts", icon: Users },
  { href: "/gestionnaire/contrats", label: "Contrats", icon: FileText },
  { href: "/gestionnaire/interventions", label: "Interventions", icon: Wrench },
  { href: "/gestionnaire/mail", label: "Emails", icon: Mail },
]

const secondaryNavItems: NavigationItem[] = [
  { href: "/gestionnaire/parametres", label: "Parametres", icon: Settings },
  { href: "/gestionnaire/aide", label: "Aides", icon: HelpCircle },
]

interface GestionnaireSidebarProps {
  userName: string
  userInitial: string
  avatarUrl?: string
  teams?: Team[]
  teamId?: string
}

export default function GestionnaireSidebar({
  userName,
  userInitial,
  avatarUrl,
  teams = [],
  teamId,
}: GestionnaireSidebarProps) {
  const pathname = usePathname()
  const { state, open, setOpen, toggleSidebar, isMobile, setOpenMobile } = useSidebar()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const isCollapsed = state === "collapsed"

  // Tablet (768-1023px): auto-collapse sidebar for more content space
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width >= 768 && width < 1024 && open) {
        setOpen(false)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
    // Only run on mount and resize, not when open changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const {
    currentTeamId,
    changeTeam,
    hasMultipleTeams,
  } = useCurrentTeam({
    teams,
    currentRole: "gestionnaire",
  })

  // Auto-close mobile sheet on route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  const isActivePage = (href: string) => {
    if (pathname === href) return true
    if (!href.endsWith("/dashboard")) {
      return pathname.startsWith(href + "/")
    }
    return false
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    try {
      setIsLoggingOut(true)
      logger.info("👤 [SIDEBAR] Logout clicked")
      window.location.href = "/auth/logout"
    } catch (error) {
      logger.error("❌ [SIDEBAR] Logout error:", error)
      window.location.href = "/auth/logout"
    }
  }

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const renderNavItem = (item: NavigationItem) => {
    const Icon = item.icon
    const isActive = isActivePage(item.href)

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.label}
          size="lg"
          className={cn(
            "transition-all duration-200",
            isActive && "bg-primary/10 text-primary font-medium border-l-[3px] border-l-primary rounded-l-none"
          )}
        >
          <Link href={item.href} onClick={handleNavClick} data-testid={`sidebar-nav-${item.href.split('/').pop()}`}>
            <Icon className={cn("size-5", isActive && "text-primary")} />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      {/* Header: Logo + Toggle + Team selector */}
      <SidebarHeader className={cn("pb-2", isCollapsed ? "p-2" : "p-4")}>
        <div className={cn(
          "flex items-center",
          isCollapsed ? "flex-col gap-1" : "gap-3 justify-between"
        )}>
          {/* Logo + Text */}
          <Link
            href="/gestionnaire/dashboard"
            className="flex items-center gap-3 flex-shrink-0 min-w-0"
            onClick={handleNavClick}
          >
            <Image
              src="/images/Logo/Picto_Seido_Color.png"
              alt="SEIDO"
              width={36}
              height={36}
              className={cn(
                "transition-all duration-200 flex-shrink-0",
                isCollapsed ? "h-7 w-7" : "h-9 w-9"
              )}
              priority
            />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-foreground leading-tight">Seido</span>
                <span className="text-xs text-muted-foreground leading-tight">Gestion Immobiliere</span>
              </div>
            )}
          </Link>

          {/* Toggle button — integrated in header */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "hidden md:flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-200 flex-shrink-0",
              isCollapsed ? "h-7 w-7" : "h-8 w-8"
            )}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
        </div>

        {/* Team selector - only in expanded mode for multi-team users */}
        {hasMultipleTeams && !isCollapsed && (
          <div className="mt-3">
            <TeamSelectorCompact
              teams={teams}
              currentTeamId={currentTeamId}
              onTeamChange={changeTeam}
              currentRole="gestionnaire"
            />
          </div>
        )}
      </SidebarHeader>

      {/* Main navigation */}
      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Spacer to push secondary nav to bottom */}
        <div className="flex-1" />

        {/* Secondary navigation */}
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: User profile */}
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <div className={cn(
          "flex items-center gap-2",
          isCollapsed && "flex-col"
        )}>
          <Link
            href="/gestionnaire/profile"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-3 flex-1 min-w-0 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent",
              isCollapsed && "justify-center p-2"
            )}
          >
            <Avatar className="h-9 w-9 flex-shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
              <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold leading-tight truncate">{userName}</span>
                <span className="text-xs text-muted-foreground leading-tight">Gestionnaire</span>
              </div>
            )}
          </Link>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "flex-shrink-0 rounded-lg p-2 transition-colors text-muted-foreground hover:text-red-600 hover:bg-red-50",
              isLoggingOut && "opacity-50 cursor-not-allowed"
            )}
            title="Se deconnecter"
          >
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
