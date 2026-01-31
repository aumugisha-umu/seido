"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Building2, Users, Bell, Wrench, MessageSquare, Menu, X, User, Settings, LogOut, Loader2, FileText, Mail, ListTree } from "lucide-react"
import Image from "next/image"
import UserMenu from "./user-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { useGlobalNotifications } from "@/hooks/use-global-notifications"
import { useNotificationPopover } from "@/hooks/use-notification-popover"
import { useTeamStatus } from "@/hooks/use-team-status"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import NotificationPopover from "@/components/notification-popover"
import { usePWABannerOptional, PWA_BANNER_HEIGHT } from "@/contexts/pwa-banner-context"
import { cn } from "@/lib/utils"
import { logger, logError } from '@/lib/logger'
import { TeamSelector, TeamSelectorCompact } from "@/components/team-selector"
import { useCurrentTeam, ALL_TEAMS_VALUE } from "@/hooks/use-current-team"
import type { Team } from "@/lib/services/core/service-types"
interface NavigationItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface HeaderConfig {
  title: string
  subtitle: string
  navigation: NavigationItem[]
  showUserElements: boolean
}

interface DashboardHeaderProps {
  role: string
  userName?: string
  userInitial?: string
  userEmail?: string
  teamId?: string // Team ID passed from server
  userId?: string // ✅ PERF: User ID passed from server to bypass client auth delay
  avatarUrl?: string // Avatar URL from user profile
  /** ✅ MULTI-ÉQUIPE: Équipes de l'utilisateur (même rôle) pour le sélecteur */
  teams?: Team[]
  /** ✅ MULTI-ÉQUIPE: Callback quand l'équipe change */
  onTeamChange?: (teamId: string | 'all') => void
}

const roleConfigs: Record<string, HeaderConfig> = {
  admin: {
    title: "SEIDO Admin",
    subtitle: "Administration",
    navigation: [
      { href: "/admin/dashboard", label: "Dashboard", icon: Home },
      { href: "/admin/users", label: "Utilisateurs", icon: Users },
      { href: "/admin/intervention-types", label: "Types intervention", icon: ListTree },
      { href: "/admin/parametres", label: "Paramètres", icon: Settings },
    ],
    showUserElements: true,
  },
  gestionnaire: {
    title: "SEIDO",
    subtitle: "Gestionnaire",
    navigation: [
      { href: "/gestionnaire/dashboard", label: "Dashboard", icon: Home },
      { href: "/gestionnaire/biens", label: "Patrimoine", icon: Building2 },
      { href: "/gestionnaire/contrats", label: "Contrats", icon: FileText },
      { href: "/gestionnaire/interventions", label: "Interventions", icon: Wrench },
      { href: "/gestionnaire/contacts", label: "Contacts", icon: Users },
      { href: "/gestionnaire/mail", label: "Emails", icon: Mail },
    ],
    showUserElements: true,
  },
  prestataire: {
    title: "SEIDO Pro",
    subtitle: "Prestataire",
    navigation: [], // Pas de navigation dans le header - accès via dashboard
    showUserElements: true,
  },
  locataire: {
    title: "SEIDO",
    subtitle: "Locataire",
    navigation: [], // Pas de navigation dans le header - accès via dashboard
    showUserElements: true,
  },
}

export default function DashboardHeader({
  role,
  userName: serverUserName,
  userInitial: serverUserInitial,
  userEmail: serverUserEmail,
  teamId: serverTeamId,
  userId: serverUserId,
  avatarUrl: serverAvatarUrl,
  teams: serverTeams = [],
  onTeamChange
}: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const config = roleConfigs[role] || roleConfigs.gestionnaire
  const { user, signOut } = useAuth()
  const { isBannerVisible } = usePWABannerOptional()
  const pathname = usePathname()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()

  // ✅ MULTI-ÉQUIPE: Hook pour gérer l'équipe courante
  const {
    currentTeamId,
    changeTeam,
    hasMultipleTeams
  } = useCurrentTeam({
    teams: serverTeams,
    currentRole: role,
    onTeamChange: (teamId) => {
      onTeamChange?.(teamId)
      // Rafraîchir la page pour récupérer les nouvelles données
      router.refresh()
    }
  })
  // ✅ PERF: Pass server userId to avoid waiting for client auth
  const { unreadCount: globalUnreadCount, refetch: refetchGlobalNotifications } = useGlobalNotifications({
    teamId: serverTeamId,
    userId: serverUserId
  })

  // Hook pour le popover de notifications
  const {
    notifications: popoverNotifications,
    loading: loadingPopoverNotifications,
    error: popoverNotificationsError,
    markAsRead,
    markAsUnread,
    archive,
    refetch: refetchPopoverNotifications
  } = useNotificationPopover({
    teamId: serverTeamId,
    limit: 10,
    autoRefresh: isNotificationPopoverOpen,
    refreshInterval: 30000
  })

  // Fonction pour marquer toutes les notifications comme lues
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = popoverNotifications.filter(n => !n.read)
    await Promise.all(unreadNotifications.map(n => markAsRead(n.id)))
    refetchGlobalNotifications() // Refresh le compteur global
  }

  // Removed: Client-side team fetching (now passed from server)
  // Team ID is now provided via serverTeamId prop from server component

  // ✅ Utiliser les props du serveur en priorité pour éviter hydration mismatch
  // Fallback sur useAuth() seulement si props non fournies (backward compatibility)
  const displayName = serverUserName || user?.name || user?.email?.split('@')[0] || "Utilisateur"
  const displayInitial = serverUserInitial || displayName.charAt(0).toUpperCase()

  const isActivePage = (href: string) => {
    // Correspondance exacte pour toutes les pages
    if (pathname === href) return true

    // Pour les pages non-dashboard, vérifier si on est dans une sous-section
    // Ex: /gestionnaire/biens active aussi /gestionnaire/biens/nouveau
    if (!href.endsWith('/dashboard')) {
      return pathname.startsWith(href + '/')
    }

    // Pour les dashboards, seule la correspondance exacte compte
    return false
  }

  const getRoleDisplayName = (_role: string) => {
    const roleNames = {
      admin: "Administrateur",
      gestionnaire: "Gestionnaire",
      prestataire: "Prestataire",
      locataire: "Locataire"
    }
    return roleNames[_role as keyof typeof roleNames] || _role.charAt(0).toUpperCase() + _role.slice(1)
  }

  const handleLogout = async () => {
    // Éviter les clics multiples
    if (isLoggingOut) {
      logger.info('👤 [DASHBOARD-HEADER] Logout already in progress, ignoring click')
      return
    }

    try {
      setIsLoggingOut(true)
      setIsMobileMenuOpen(false) // Fermer le menu mobile immédiatement
      logger.info('👤 [DASHBOARD-HEADER] Logout button clicked')
      
      // Effectuer la déconnexion avec timeout pour éviter les hangs
      const signOutPromise = signOut()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SignOut timeout')), 3000)
      )
      
      await Promise.race([signOutPromise, timeoutPromise])
      logger.info('👤 [DASHBOARD-HEADER] Sign out completed, redirecting to login')
    } catch (error) {
      logger.error('❌ [DASHBOARD-HEADER] Error during logout:', error)
      // Continuer quand même avec la redirection
    } finally {
      // Utiliser window.location.href pour forcer une navigation complète
      // Cela évite les problèmes de router.push() qui peut ne pas fonctionner après signOut
      logger.info('🔄 [DASHBOARD-HEADER] Executing navigation with window.location.href...')
      window.location.href = "/auth/login"
    }
  }

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Empêcher le scroll quand le menu mobile est ouvert
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <header 
        className={cn(
          "header",
          "transition-[top] duration-300 ease-in-out"
        )}
        style={{ top: isBannerVisible ? PWA_BANNER_HEIGHT : 0 }}
      >
        <div className="header__container">
          <nav className="header__nav">
            {/* Logo à gauche + Sélecteur d'équipe */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="flex items-center">
                {/* Logo SEIDO - Cliquable vers dashboard */}
                <div className="header__logo">
                  <Link href={`/${role}/dashboard`} className="block">
                    <Image
                      src="/images/Logo/Logo_Seido_Color.png"
                      alt="SEIDO"
                      width={140}
                      height={38}
                      className="header__logo-image h-8 sm:h-10 w-auto"
                      priority
                    />
                  </Link>
                </div>
              </div>

              {/* ✅ MULTI-ÉQUIPE: Sélecteur d'équipe (desktop/tablet) */}
              {hasMultipleTeams && (
                <div className="hidden sm:block">
                  <TeamSelector
                    teams={serverTeams}
                    currentTeamId={currentTeamId}
                    onTeamChange={changeTeam}
                    currentRole={role}
                    size="compact"
                  />
                </div>
              )}
            </div>

            {/* Navigation desktop - cachée sur mobile et tablet - affichée seulement si navigation existe */}
            {config.navigation.length > 0 && (
              <div className="hidden lg:flex items-center space-x-1 flex-1 justify-center max-w-4xl mx-4">
                {config.navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = isActivePage(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center space-x-2 px-3 xl:px-4 py-2 rounded-lg transition-all duration-200 font-medium group border text-sm xl:text-base
                        ${isActive
                          ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
                          : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted hover:border-border hover:scale-[1.02] hover:shadow-sm'
                        }
                      `}
                    >
                      <Icon className={`h-4 w-4 xl:h-5 xl:w-5 transition-all duration-200 flex-shrink-0 ${isActive ? 'text-primary' : 'group-hover:text-foreground'}`} />
                      <span className="transition-all duration-200 whitespace-nowrap">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Éléments droite */}
            <div className="header__actions flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Notifications Popover - toujours visible */}
              {config.showUserElements && (
                <Popover open={isNotificationPopoverOpen} onOpenChange={setIsNotificationPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`flex items-center justify-center header__button ${isNotificationPopoverOpen || pathname.includes('/notifications')
                          ? 'header__button--active'
                          : 'header__button--inactive'
                        }`}
                      aria-label="Notifications"
                    >
                      <Bell className="h-5 w-5" />
                      {globalUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium shadow-sm px-1">
                          {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
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
              )}

              {/* Menu utilisateur - caché sur mobile, visible sur tablet et desktop */}
              {config.showUserElements && (
                <div className="hidden md:block">
                  <UserMenu
                    userName={displayName}
                    userInitial={displayInitial}
                    role={role}
                    avatarUrl={serverAvatarUrl}
                  />
                </div>
              )}

              {/* Bouton hamburger - mobile et tablet uniquement */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="header__button header__button--inactive lg:!hidden"
                aria-label="Menu de navigation"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Menu mobile/tablet overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-foreground/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu panel */}
          <div 
            className="fixed inset-x-0 bottom-0 bg-background border-t border-border shadow-lg overflow-y-auto"
            style={{ top: isBannerVisible ? `calc(4rem + ${PWA_BANNER_HEIGHT}px)` : '4rem' }}
          >
            <div className="flex flex-col h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

              {/* Navigation principale - affichée seulement si navigation existe */}
              {config.navigation.length > 0 && (
                <>
                  <nav className="space-y-2 mb-4">
                    {config.navigation.map((item) => {
                      const Icon = item.icon
                      const isActive = isActivePage(item.href)

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`
                            flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium w-full min-h-[48px]
                            ${isActive
                              ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                              : 'text-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border'
                            }
                          `}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : ''}`} />
                          <span className="text-base">{item.label}</span>
                        </Link>
                      )
                    })}
                  </nav>

                  {/* Séparation */}
                  <div className="border-t border-border mb-4"></div>
                </>
              )}

              {/* ✅ MULTI-ÉQUIPE: Sélecteur d'équipe (mobile) */}
              {hasMultipleTeams && (
                <>
                  <div className="px-2 mb-4">
                    <TeamSelectorCompact
                      teams={serverTeams}
                      currentTeamId={currentTeamId}
                      onTeamChange={(teamId) => {
                        changeTeam(teamId)
                        setIsMobileMenuOpen(false)
                      }}
                      currentRole={role}
                    />
                  </div>
                  <div className="border-t border-border mb-4"></div>
                </>
              )}

              {/* Section actions utilisateur */}
              {config.showUserElements && (
                <div className="space-y-2 mb-4">
                  <Link
                    href={`/${role}/profile`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium w-full min-h-[48px] text-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border"
                  >
                    <User className="h-6 w-6" />
                    <span className="text-base">Mon profil</span>
                  </Link>

                  <Link
                    href={`/${role}/parametres`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium w-full min-h-[48px] text-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border"
                  >
                    <Settings className="h-6 w-6" />
                    <span className="text-base">Paramètres</span>
                  </Link>
                </div>
              )}

              {/* Spacer pour pousser le profil utilisateur vers le bas */}
              <div className="flex-1"></div>

              {/* Profil utilisateur en bas avec logout sur la même ligne */}
              {config.showUserElements && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between px-4 py-3">
                    {/* Informations utilisateur */}
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        {serverAvatarUrl && <AvatarImage src={serverAvatarUrl} alt={displayName} />}
                        <AvatarFallback className="bg-primary text-primary-foreground font-medium text-base">
                          {displayInitial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-foreground font-semibold text-base leading-tight truncate">{displayName}</span>
                        <span className="text-muted-foreground text-sm leading-tight truncate">{getRoleDisplayName(role)}</span>
                      </div>
                    </div>

                    {/* Bouton logout */}
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="p-3 rounded-lg transition-all duration-200 text-destructive hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={isLoggingOut ? "Déconnexion en cours..." : "Se déconnecter"}
                    >
                      {isLoggingOut ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <LogOut className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}

