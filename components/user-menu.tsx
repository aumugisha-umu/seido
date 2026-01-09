"use client"

import { useState } from "react"
import { User, Settings, LogOut, ChevronDown, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { logger, logError } from '@/lib/logger'
interface UserMenuProps {
  userName: string
  userInitial: string
  role: string
}

export default function UserMenu({ userName, userInitial, role }: UserMenuProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    // Éviter les clics multiples
    if (isLoggingOut) {
      logger.info('👤 [USER-MENU] Logout already in progress, ignoring click')
      return
    }

    try {
      setIsLoggingOut(true)
      logger.info('👤 [USER-MENU] Logout button clicked')

      // ✅ OPTIMISÉ: Rediriger vers /auth/logout qui gère la déconnexion côté serveur
      // Plus rapide que: await signOut() + router.push()
      // Car évite les re-renders React et la réconciliation d'état
      window.location.href = "/auth/logout"

    } catch (error) {
      logger.error('❌ [USER-MENU] Error during logout:', error)

      // Même en cas d'erreur, rediriger vers logout
      window.location.href = "/auth/logout"
    }
  }

  const handleProfile = () => {
    router.push(`/${role}/profile`)
  }

  const handleSettings = () => {
    router.push(`/${role}/parametres`)
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center space-x-3 h-auto px-3 py-2 border border-transparent hover:bg-gray-100 hover:border-gray-300 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
        >
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-medium text-sm">{userInitial}</span>
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-gray-700 font-medium text-sm leading-tight">{userName}</span>
            <span className="text-gray-500 text-xs leading-tight">{getRoleDisplayName(role)}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56 mt-2">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {getRoleDisplayName(role)}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Mon profil</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Paramètres</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onSelect={(e) => {
            // Ne pas empêcher la fermeture du menu, laisser Radix UI gérer ça
            handleLogout()
          }}
          disabled={isLoggingOut}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>{isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
