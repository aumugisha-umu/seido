/**
 * Demo Dashboard Client - Boutons d'actions rapides pour le mode démo
 *
 * ✅ Réutilise l'UI du DashboardClient mais avec les routes démo
 * - Même design que production
 * - Routes adaptées au mode démo (/demo/gestionnaire/...)
 * - Pas de PWA prompt en mode démo
 */

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, Home, UserPlus, Plus, ChevronDown, Wrench } from 'lucide-react'

interface DemoDashboardClientProps {
  teamId: string
}

export function DemoDashboardClient({ teamId }: DemoDashboardClientProps) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-1.5">
      {/* Menu mobile compact */}
      <div className="sm:hidden w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center gap-1.5 bg-transparent h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px]">
            <DropdownMenuItem onClick={() => router.push("/demo/gestionnaire/biens/immeubles/nouveau")} className="flex items-center">
              <Building2 className="h-4 w-4 mr-3" />
              Ajouter un immeuble
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/demo/gestionnaire/biens/lots/nouveau")} className="flex items-center">
              <Home className="h-4 w-4 mr-3" />
              Ajouter un lot
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/demo/gestionnaire/contacts/nouveau")} className="flex items-center">
              <UserPlus className="h-4 w-4 mr-3" />
              Ajouter un contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/demo/gestionnaire/interventions/nouvelle")} className="flex items-center">
              <Wrench className="h-4 w-4 mr-3" />
              Créer une intervention
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Boutons séparés desktop - Material Design compact */}
      <div className="hidden sm:flex items-center gap-1.5">
        <Button
          size="sm"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
          onClick={() => router.push("/demo/gestionnaire/interventions/nouvelle")}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden lg:inline">Créer une intervention</span>
          <span className="lg:hidden">Intervention</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1.5 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
          onClick={() => router.push("/demo/gestionnaire/biens/immeubles/nouveau")}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden lg:inline">Ajouter un immeuble</span>
          <span className="lg:hidden">Immeuble</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1.5 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
          onClick={() => router.push("/demo/gestionnaire/biens/lots/nouveau")}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden lg:inline">Ajouter un lot</span>
          <span className="lg:hidden">Lot</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
          onClick={() => router.push("/demo/gestionnaire/contacts/nouveau")}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden lg:inline">Ajouter un contact</span>
          <span className="lg:hidden">Contact</span>
        </Button>
      </div>
    </div>
  )
}
