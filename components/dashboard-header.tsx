"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Building2, Users, Bell, Wrench, MessageSquare, Menu, X, User, Settings, LogOut, Loader2 } from "lucide-react"
import Image from "next/image"
import UserMenu from "./user-menu"
import { useAuth } from "@/hooks/use-auth"
import { useGlobalNotifications } from "@/hooks/use-global-notifications"
import { useNotificationPopover } from "@/hooks/use-notification-popover"
import { useTeamStatus } from "@/hooks/use-team-status"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import NotificationPopover from "@/components/notification-popover"
import { InstallPWAHeaderButton } from "@/components/install-pwa-header-button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { logger, logError } from '@/lib/logger'
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
}

const roleConfigs: Record<string, HeaderConfig> = {
  admin: {
    title: "SEIDO Admin",
    subtitle: "Administration",
    navigation: [
      { href: "/admin/dashboard", label: "Dashboard", icon: Home },
      { href: "/admin/users", label: "Utilisateurs", icon: Users },
      { href: "/admin/settings", label: "Paramètres", icon: Building2 },
    ],
    showUserElements: true,
  },
  gestionnaire: {
    title: "SEIDO",
    subtitle: "Gestionnaire",
    navigation: [
      { href: "/gestionnaire/dashboard", label: "Dashboard", icon: Home },
      { href: "/gestionnaire/biens", label: "Patrimoine", icon: Building2 },
      { href: "/gestionnaire/interventions", label: "Interventions", icon: Wrench },
      { href: "/gestionnaire/contacts", label: "Contacts", icon: Users },
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
  teamId: serverTeamId
}: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const config = roleConfigs[role] || roleConfigs.gestionnaire
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { unreadCount: globalUnreadCount, refetch: refetchGlobalNotifications } = useGlobalNotifications({
    teamId: serverTeamId
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
      await signOut()
      logger.info('👤 [DASHBOARD-HEADER] Sign out completed, redirecting to login')
      window.location.href = "/auth/login"
    } catch (error) {
      logger.error('❌ [DASHBOARD-HEADER] Error during logout:', error)
      window.location.href = "/auth/login"
    } finally {
      // Ne pas réinitialiser isLoggingOut car on redirige
    }
  }

  const handleProfile = () => {
    router.push(`/${role}/profile`)
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
      <header className="header">
        <div className="header__container">
          <nav className="header__nav">
            {/* Logo à gauche */}
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                {/* Logo SEIDO - Cliquable vers dashboard */}
                <div className="header__logo">
                  <Link href={`/${role}/dashboard`} className="block">
                    <Image
                      src="/images/Logo/Logo_Seido_Color.png"
                      alt="SEIDO"
                      width={140}
                      height={38}
                      className="header__logo-image"
                    />
                  </Link>
                </div>
              </div>

              {/* Bouton installation PWA - visible uniquement si non installé */}
              <InstallPWAHeaderButton />
            </div>

            {/* Navigation desktop - cachée sur mobile et tablet - affichée seulement si navigation existe */}
            {config.navigation.length > 0 && (
              <div className="hidden lg:flex items-center space-x-1">
                {config.navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = isActivePage(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium group border
                        ${isActive
                          ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
                          : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 hover:scale-[1.02] hover:shadow-sm'
                        }
                      `}
                    >
                      <Icon className={`h-5 w-5 transition-all duration-200 ${isActive ? 'text-primary' : 'group-hover:text-slate-900'}`} />
                      <span className="transition-all duration-200">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Éléments droite */}
            <div className="header__actions">
              {/* Theme Toggle */}
              <ThemeToggle className="header__button header__button--inactive" />

              {/* Notifications Popover - toujours visible */}
              {config.showUserElements && (
                <Popover open={isNotificationPopoverOpen} onOpenChange={setIsNotificationPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`header__button ${isNotificationPopoverOpen || pathname.includes('/notifications')
                          ? 'header__button--active'
                          : 'header__button--inactive'
                        }`}
                      aria-label="Notifications"
                    >
                      <Bell className="h-5 w-5" />
                      {globalUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-sm">
                          {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="end" sideOffset={8}>
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

              {/* Menu utilisateur - caché sur mobile, visible sur desktop */}
              {config.showUserElements && (
                <div className="hidden lg:block">
                  <UserMenu
                    userName={displayName}
                    userInitial={displayInitial}
                    role={role}
                  />
                </div>
              )}

              {/* Bouton hamburger - mobile et tablet uniquement */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden header__button header__button--inactive"
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
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed top-16 inset-x-0 bottom-0 bg-white border-b border-slate-200 shadow-lg">
            <div className="flex flex-col h-full content-max-width px-5 sm:px-6 lg:px-10 py-4">

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
                              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300'
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
                  <div className="border-t border-slate-200 mb-4"></div>
                </>
              )}

              {/* Section actions utilisateur */}
              {config.showUserElements && (
                <div className="space-y-2 mb-4">
                  <button
                    onClick={() => {
                      handleProfile()
                      setIsMobileMenuOpen(false)
                    }}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium w-full min-h-[48px] text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300"
                  >
                    <User className="h-6 w-6" />
                    <span className="text-base">Mon profil</span>
                  </button>

                  <button
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium w-full min-h-[48px] text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300"
                  >
                    <Settings className="h-6 w-6" />
                    <span className="text-base">Paramètres</span>
                  </button>
                </div>
              )}

              {/* Spacer pour pousser le profil utilisateur vers le bas */}
              <div className="flex-1"></div>

              {/* Profil utilisateur en bas avec logout sur la même ligne */}
              {config.showUserElements && (
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between px-4 py-3">
                    {/* Informations utilisateur */}
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-foreground font-medium text-base">{displayInitial}</span>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-slate-900 font-semibold text-base leading-tight truncate">{displayName}</span>
                        <span className="text-slate-600 text-sm leading-tight truncate">{getRoleDisplayName(role)}</span>
                      </div>
                    </div>

                    {/* Bouton logout */}
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="p-3 rounded-lg transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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

