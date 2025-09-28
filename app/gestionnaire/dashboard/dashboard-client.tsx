'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, Home, UserPlus, Plus, ChevronDown, Wrench } from 'lucide-react'
import { ContactFormModal } from '@/components/contact-form-modal'
import type { CreateContactData } from './actions'

interface DashboardClientProps {
  teamId: string
}

/**
 * 🔐 DASHBOARD CLIENT COMPONENT (Bonnes Pratiques 2025)
 *
 * ✅ LAYER 3: UI Level Security - Composant client minimal
 * - Interactions utilisateur uniquement
 * - Server Actions pour mutations
 * - Pas de logique métier côté client
 */
export function DashboardClient({ teamId }: DashboardClientProps) {
  const router = useRouter()
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  const handleContactSubmit = async (contactData: CreateContactData) => {
    try {
      console.log('[DASHBOARD-CLIENT] Contact creation:', contactData)

      // ✅ BONNE PRATIQUE 2025: Utiliser Server Action au lieu de fetch client
      const { createContactAction } = await import('./actions')
      const result = await createContactAction({
        ...contactData,
        teamId
      })

      if (result.success) {
        setIsContactModalOpen(false)
        // Recharger la page pour refléter les changements
        router.refresh()
      } else {
        console.error('[DASHBOARD-CLIENT] Contact creation failed:', result.error)
      }
    } catch (error) {
      console.error('[DASHBOARD-CLIENT] Error creating contact:', error)
    }
  }

  return (
    <>
      {/* Actions rapides */}
      <div className="flex items-center gap-2">
        {/* Menu mobile compact */}
        <div className="sm:hidden w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2 bg-transparent min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px]">
              <DropdownMenuItem onClick={() => router.push("/gestionnaire/biens/immeubles/nouveau")} className="flex items-center">
                <Building2 className="h-4 w-4 mr-3" />
                Ajouter un immeuble
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/gestionnaire/biens/lots/nouveau")} className="flex items-center">
                <Home className="h-4 w-4 mr-3" />
                Ajouter un lot
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsContactModalOpen(true)} className="flex items-center">
                <UserPlus className="h-4 w-4 mr-3" />
                Ajouter un contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")} className="flex items-center">
                <Wrench className="h-4 w-4 mr-3" />
                Ajouter une intervention
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Boutons séparés desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
            onClick={() => router.push("/gestionnaire/biens/immeubles/nouveau")}
          >
            <Building2 className="h-4 w-4" />
            <span>Ajouter un immeuble</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
            onClick={() => router.push("/gestionnaire/biens/lots/nouveau")}
          >
            <Home className="h-4 w-4" />
            <span>Ajouter un lot</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-transparent"
            onClick={() => setIsContactModalOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            <span>Ajouter un contact</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-transparent"
            onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}
          >
            <Wrench className="h-4 w-4" />
            <span>Ajouter une intervention</span>
          </Button>
        </div>
      </div>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleContactSubmit}
        defaultType="locataire"
      />
    </>
  )
}
