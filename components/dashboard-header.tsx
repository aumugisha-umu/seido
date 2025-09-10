import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Building2, Users, Bell, Wrench, MessageSquare, Menu, X } from "lucide-react"
import Image from "next/image"
import UserMenu from "./user-menu"
import { useAuth } from "@/hooks/use-auth"

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
  const { user } = useAuth()
  const pathname = usePathname()
  
  const userName = user?.display_name || user?.name || "Utilisateur"
  const userInitial = userName.charAt(0).toUpperCase()

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
                  <span className="absolute top-1 right-1 w-3 h-3 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </Link>
              )}

              {/* Menu utilisateur - toujours visible */}
              {config.showUserElements && (
                <UserMenu 
                  userName={userName} 
                  userInitial={userInitial} 
                  role={role} 
                />
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
          <div className="fixed top-16 inset-x-0 bg-white border-b border-slate-200 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
              <nav className="space-y-2">
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

            </div>
          </div>
        </div>
      )}
    </>
  )
}
