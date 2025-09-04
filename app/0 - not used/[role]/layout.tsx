"use client"

import type React from "react"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Building2, Home, Users, Wrench, Settings, Bell, Calendar, FileText, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"


const roleConfigs = {
  admin: {
    label: "Admin",
    navigation: [
      { href: "/dashboard/admin", label: "Dashboard", icon: Home },
      { href: "/dashboard/admin/utilisateurs", label: "Utilisateurs", icon: Users },
      { href: "/dashboard/admin/systeme", label: "Système", icon: Settings },
      { href: "/dashboard/admin/rapports", label: "Rapports", icon: FileText },
    ],
  },
  gestionnaire: {
    label: "Gestionnaire",
    navigation: [
      { href: "/dashboard/gestionnaire", label: "Dashboard", icon: Home },
      { href: "/dashboard/gestionnaire/biens", label: "Biens", icon: Building2 },
      { href: "/dashboard/gestionnaire/interventions", label: "Interventions", icon: Wrench },
      { href: "/dashboard/gestionnaire/contacts", label: "Contacts", icon: Users },
    ],
  },
  prestataire: {
    label: "Prestataire",
    navigation: [
      { href: "/dashboard/prestataire", label: "Dashboard", icon: Home },
      { href: "/dashboard/prestataire/interventions", label: "Interventions", icon: Wrench },
      { href: "/dashboard/prestataire/planning", label: "Planning", icon: Calendar },
      { href: "/dashboard/prestataire/clients", label: "Clients", icon: Users },
    ],
  },
  locataire: {
    label: "Tenant",
    subtitle: "Espace locataire",
    navigation: [
      { href: "/dashboard/locataire", label: "Dashboard", icon: Home },
      { href: "/dashboard/locataire/interventions", label: "Mes Interventions", icon: Wrench },
      { href: "/dashboard/locataire/contact", label: "Contact Propriétaire", icon: MessageSquare },
    ],
  },
}

export default function RoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const role = params.role as string
  const config = roleConfigs[role as keyof typeof roleConfigs]

  if (!config) {
    return <div>Rôle non reconnu</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo et badge rôle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl">SEIDO {config.label}</span>
                {config.subtitle && <span className="text-sm text-gray-500">{config.subtitle}</span>}
              </div>
            </div>
          </div>

          {/* Navigation centrale */}
          <nav className="flex items-center gap-6">
            {config.navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {role !== "locataire" && (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">J</span>
                </div>
                <span className="text-sm font-medium">John</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Contenu principal */}
      <main className="p-6">{children}</main>
    </div>
  )
}
