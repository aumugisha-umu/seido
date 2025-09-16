"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, Bell, Menu, X, User, LogOut } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useGlobalNotifications } from "@/hooks/use-global-notifications"

interface TenantHeaderProps {
  className?: string
}

export default function TenantHeader({ className }: TenantHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const { unreadCount: globalUnreadCount } = useGlobalNotifications()
  
  const userName = user?.display_name || user?.name || "Marie Dupont"
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const handleLogout = async () => {
    try {
      console.log('👤 [TENANT-HEADER] Logout button clicked')
      await signOut()
      window.location.href = "/auth/login"
    } catch (error) {
      console.error('❌ [TENANT-HEADER] Error during logout:', error)
      window.location.href = "/auth/login"
    }
  }

  // Badge de notification pour les nouvelles demandes (exemple avec 2)
  const pendingRequestsCount = 2

  return (
    <>
      {/* Header principal */}
      <header className={`bg-white border-b border-slate-200 shadow-sm ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo à gauche */}
            <div className="flex-shrink-0">
              <Link href="/locataire/dashboard" className="block">
                <Image 
                  src="/images/Seido_Main_Side_last.png"
                  alt="SEIDO"
                  width={140}
                  height={38}
                  className="h-10 w-auto hover:opacity-80 transition-opacity duration-200"
                />
              </Link>
            </div>

            {/* Menu hamburger mobile */}
            <div className="flex items-center space-x-3 lg:hidden">
              {/* Notifications mobile */}
              <Link
                href="/locataire/notifications"
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {globalUnreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 min-w-[18px] h-[18px] p-0 bg-red-500 hover:bg-red-500 text-white text-xs flex items-center justify-center">
                    {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                  </Badge>
                )}
              </Link>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Menu de navigation"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Menu utilisateur desktop */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Notifications desktop */}
              <Link
                href="/locataire/notifications"
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {globalUnreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 min-w-[18px] h-[18px] p-0 bg-red-500 hover:bg-red-500 text-white text-xs flex items-center justify-center">
                    {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                  </Badge>
                )}
              </Link>

              {/* Menu utilisateur */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center space-x-3 h-auto px-3 py-2 hover:bg-slate-100 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{userInitials}</span>
                    </div>
                    <span className="text-slate-900 font-medium text-sm">{userName}</span>
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-56 mt-2">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-slate-900">{userName}</p>
                      <p className="text-xs leading-none text-slate-600">Locataire</p>
                    </div>
                  </DropdownMenuLabel>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem className="cursor-pointer text-slate-700 focus:text-slate-900">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Se déconnecter</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      
      {/* Menu mobile overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="fixed top-16 inset-x-0 bottom-0 bg-white shadow-lg">
            <div className="flex flex-col h-full max-w-7xl mx-auto px-4 py-6">
              
              {/* Navigation mobile */}
              <nav className="space-y-3 mb-6">
                <Link
                  href="/locataire/dashboard"
                  className="flex items-center px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/locataire/interventions"
                  className="flex items-center px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Mes Interventions
                </Link>
                <Link
                  href="/locataire/interventions/nouvelle-demande"
                  className="flex items-center px-4 py-3 rounded-lg bg-red-50 text-red-600 font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nouvelle Demande
                </Link>
              </nav>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Profil utilisateur en bas */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">{userInitials}</span>
                    </div>
                    <div>
                      <p className="text-slate-900 font-medium">{userName}</p>
                      <p className="text-slate-600 text-sm">Locataire</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMobileMenuOpen(false)
                    }}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Se déconnecter"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
