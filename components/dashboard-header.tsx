"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Building2, Users, Bell, Wrench, MessageSquare, Menu, X, User, Settings, LogOut } from "lucide-react"
import Image from "next/image"
import UserMenu from "./user-menu"
import { useAuth } from "@/hooks/use-auth"
import { useGlobalNotifications } from "@/hooks/use-global-notifications"

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
      { href: "/gestionnaire/biens", label: "Biens", icon: Building2 },
      { href: "/gestionnaire/interventions", label: "Interventions", icon: Wrench },
      { href: "/gestionnaire/contacts", label: "Contacts", icon: Users },
    ],
    showUserElements: true,
  },
  prestataire: {
    title: "SEIDO Pro",
    subtitle: "Prestataire",
    navigation: [
      { href: "/prestataire/dashboard", label: "Dashboard", icon: Home },
      { href: "/prestataire/interventions", label: "Mes Interventions", icon: Wrench },
    ],
    showUserElements: true,
  },
  locataire: {
    title: "SEIDO Tenant",
    subtitle: "Espace locataire",
    navigation: [
      { href: "/locataire/dashboard", label: "Dashboard", icon: Home },
      { href: "/locataire/interventions", label: "Mes Interventions", icon: Wrench },
      { href: "/locataire/interventions/nouvelle-demande", label: "Nouvelle Demande", icon: MessageSquare },
    ],
    showUserElements: true,
  },
}

export default function DashboardHeader({ role }: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const config = roleConfigs[role] || roleConfigs.gestionnaire
  const { user, loading, signOut } = useAuth()
  const pathname = usePathname()
  const _router = useRouter()
  const { unreadCount: globalUnreadCount } = useGlobalNotifications()

  // Construction robuste du nom utilisateur avec multiples fallbacks
  const userName = user?.display_name ||
    user?.name ||
    (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` :
      user?.first_name ||
      user?.last_name ||
      user?.email?.split('@')[0] ||
      "Utilisateur"
    )
  const userInitial = userName.charAt(0).toUpperCase()

  // ✅ 2025: Protection contre affichage avant chargement complet
  // Si loading ou pas de user, utiliser des valeurs de fallback pour éviter UI vide
  const displayName = loading || !user ? "Chargement..." : userName
  const displayInitial = loading || !user ? "..." : userInitial

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
    return roleNames[role as keyof typeof roleNames] || role.charAt(0).toUpperCase() + role.slice(1)
  }

  const handleLogout = async () => {
    try {
      console.log('👤 [DASHBOARD-HEADER] Logout button clicked')
      await signOut()
      console.log('👤 [DASHBOARD-HEADER] Sign out completed, redirecting to login')
      window.location.href = "/auth/login"
    } catch (error) {
      console.error('❌ [DASHBOARD-HEADER] Error during logout:', error)
      window.location.href = "/auth/login"
    }
  }

  const handleProfile = () => {
    _router.push(`/${role}/profile`)
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
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16">
            {/* Logo à gauche */}
            <div className="flex items-center">
              <div className="flex items-center">
                {/* Logo SEIDO - Cliquable vers dashboard */}
                <div className="flex-shrink-0">
                  <Link href={`/${role}/dashboard`} className="block">
                    <Image 
                      src="/images/Seido_Main_Side_last.png"
                      alt="SEIDO"
                      width={140}
                      height={38}
                      className="h-10 w-auto hover:opacity-80 transition-opacity duration-200"
                    />
                  </Link>
                </div>
              </div>
            </div>

            {/* Navigation desktop - cachée sur mobile et tablet */}
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

            {/* Éléments droite */}
            <div className="flex items-center space-x-2">
              {/* Notifications - toujours visible */}
              {config.showUserElements && (
                <Link
                  href={`/${role}/notifications`}
                  className={`
                    relative p-2 rounded-lg transition-all duration-200 border min-w-[44px] min-h-[44px] flex items-center justify-center
                    ${pathname.includes('/notifications') 
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-sm' 
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300'
                    }
                  `}
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {globalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-sm">
                      {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                    </span>
                  )}
                </Link>
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
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed top-16 inset-x-0 bottom-0 bg-white border-b border-slate-200 shadow-lg">
            <div className="flex flex-col h-full max-w-7xl mx-auto px-4 sm:px-6 py-4">
              
              {/* Navigation principale */}
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
                      onClick={() => {
                        handleLogout()
                        setIsMobileMenuOpen(false)
                      }}
                      className="p-3 rounded-lg transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 flex-shrink-0"
                      aria-label="Se déconnecter"
                    >
                      <LogOut className="h-6 w-6" />
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
