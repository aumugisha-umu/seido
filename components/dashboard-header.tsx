import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Building2, Users, Bell, Wrench, MessageSquare, FileText } from "lucide-react"
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

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16">
          {/* Logo à gauche */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{config.title}</span>
              {config.subtitle && (
                <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded font-medium">{config.subtitle}</span>
              )}
            </div>
          </div>

          {/* Navigation au centre */}
          <div className="flex items-center space-x-2">
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
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100 hover:border-gray-300 hover:scale-[1.02] hover:shadow-sm'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 transition-all duration-200 ${isActive ? 'text-primary' : 'group-hover:text-gray-900'}`} />
                  <span className="transition-all duration-200">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Éléments utilisateur à droite */}
          {config.showUserElements && (
            <div className="flex items-center space-x-4">
              {/* Icône notifications uniquement */}
              <Link
                href={`/${role}/notifications`}
                className={`
                  relative p-2 rounded-lg transition-all duration-200 border
                  ${pathname.includes('/notifications') 
                    ? 'bg-primary/10 text-primary border-primary/20 shadow-sm' 
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100 hover:border-gray-300 hover:scale-[1.02] hover:shadow-sm'
                  }
                `}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-3 h-3 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Link>

              {/* Menu utilisateur avec dropdown */}
              <UserMenu 
                userName={userName} 
                userInitial={userInitial} 
                role={role} 
              />
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
