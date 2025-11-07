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
import { createContactInvitationService } from '@/lib/services'
import { logger } from '@/lib/logger'
import { PWADashboardPrompt } from '@/components/pwa/pwa-dashboard-prompt'
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

  // ✅ Instancier le service côté CLIENT (exactement comme contacts/page.tsx)
  const contactInvitationService = createContactInvitationService()

  const handleContactSubmit = async (contactData: any) => {
    try {
      logger.info("📞 [DASHBOARD-CLIENT] Creating contact:", contactData)

      if (!teamId) {
        logger.error("❌ [DASHBOARD-CLIENT] No team found")
        throw new Error("Aucune équipe trouvée pour créer le contact")
      }

      const dataWithTeam = {
        ...contactData,
        teamId: teamId
      }

      logger.info("📞 [DASHBOARD-CLIENT] Calling service with:", dataWithTeam)

      // ✅ Utiliser le service d'invitation qui gère la création du contact + invitation optionnelle
      // Exactement comme contacts/page.tsx:442
      const result = await contactInvitationService.createContactWithOptionalInvite(dataWithTeam)

      logger.info("✅ [DASHBOARD-CLIENT] Service completed, result:", result)

      if (result.invitation) {
        if (result.invitation.success) {
          logger.info("✅ [DASHBOARD-CLIENT] Invitation sent successfully to:", contactData.email)
        } else {
          logger.warn("⚠️ [DASHBOARD-CLIENT] Contact created but invitation failed:", result.invitation.error)
        }
      }

      logger.info("🔄 [DASHBOARD-CLIENT] Closing modal and refreshing...")
      setIsContactModalOpen(false)

      // Recharger le dashboard pour afficher le nouveau contact
      router.refresh()
      logger.info("✅ [DASHBOARD-CLIENT] Dashboard refresh triggered")

    } catch (error) {
      logger.error("❌ [DASHBOARD-CLIENT] Error creating contact:", error)
      logger.error("❌ [DASHBOARD-CLIENT] Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        contactData: contactData,
        teamId: teamId
      })
      // Propager l'erreur pour affichage dans ContactFormModal
      throw error
    }
  }

  return (
    <>
      {/* 📱 PWA Installation Prompt - Triggered automatically on dashboard */}
      <PWADashboardPrompt />

      {/* Actions rapides - Material Design compact */}
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
            onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden lg:inline">Créer une intervention</span>
            <span className="lg:hidden">Intervention</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1.5 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
            onClick={() => router.push("/gestionnaire/biens/immeubles/nouveau")}
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden lg:inline">Ajouter un immeuble</span>
            <span className="lg:hidden">Immeuble</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1.5 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
            onClick={() => router.push("/gestionnaire/biens/lots/nouveau")}
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden lg:inline">Ajouter un lot</span>
            <span className="lg:hidden">Lot</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
            onClick={() => setIsContactModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden lg:inline">Ajouter un contact</span>
            <span className="lg:hidden">Contact</span>
          </Button>
        </div>
      </div>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleContactSubmit}
        defaultType="tenant"
        teamId={teamId}
      />
    </>
  )
}
