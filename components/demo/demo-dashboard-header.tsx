"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Building2, Users, Wrench, Menu, X, User, Settings, LogOut } from "lucide-react"
import { useDemoContext } from "@/lib/demo/demo-context"

interface NavigationItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface HeaderConfig {
  title: string
  subtitle: string
  navigation: NavigationItem[]
}

interface DemoDashboardHeaderProps {
  role: string
}

const roleConfigs: Record<string, HeaderConfig> = {
  admin: {
    title: "SEIDO Admin",
    subtitle: "Administration",
    navigation: [
      { href: "/demo/admin/dashboard", label: "Dashboard", icon: Home },
    ],
  },
  gestionnaire: {
    title: "SEIDO",
    subtitle: "Gestionnaire",
    navigation: [
      { href: "/demo/gestionnaire/dashboard", label: "Dashboard", icon: Home },
      { href: "/demo/gestionnaire/biens", label: "Patrimoine", icon: Building2 },
      { href: "/demo/gestionnaire/interventions", label: "Interventions", icon: Wrench },
      { href: "/demo/gestionnaire/contacts", label: "Contacts", icon: Users },
    ],
  },
  prestataire: {
    title: "SEIDO Pro",
    subtitle: "Prestataire",
    navigation: [],
  },
  locataire: {
    title: "SEIDO",
    subtitle: "Locataire",
    navigation: [],
  },
}

export function DemoDashboardHeader({ role }: DemoDashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { getCurrentUser } = useDemoContext()
  const user = getCurrentUser()
  const pathname = usePathname()

  const config = roleConfigs[role] || roleConfigs.gestionnaire
  const userName = user?.name || "Demo User"
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
                <p className="text-xs text-gray-500">{config.subtitle}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            {config.navigation.length > 0 && (
              <nav className="hidden md:flex md:space-x-1 ml-8">
                {config.navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname?.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-sky-50 text-sky-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            )}
          </div>

          {/* Right Side - User Menu */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            {config.navigation.length > 0 && (
              <button
                type="button"
                className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            )}

            {/* User Avatar & Name */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{user?.email || ''}</p>
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sky-600 text-white font-semibold">
                {userInitial}
              </div>
            </div>

            {/* Quick Links */}
            <div className="hidden lg:flex items-center space-x-2">
              <Link
                href={`/demo/${role}/profile`}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                title="Profil"
              >
                <User className="h-5 w-5" />
              </Link>
              <Link
                href={`/demo/${role}/parametres`}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                title="Paramètres"
              >
                <Settings className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && config.navigation.length > 0 && (
          <nav className="md:hidden py-4 space-y-1">
            {config.navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sky-50 text-sky-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </header>
  )
}
