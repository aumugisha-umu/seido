"use client"

import { useState } from "react"
import { Split, Loader2, AlertTriangle, CheckCircle, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createChildInterventionsAction } from "@/app/actions/intervention-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type ButtonVariant = 'desktop' | 'tablet' | 'mobile' | 'default'

interface FinalizeMultiProviderButtonProps {
  interventionId: string
  providerCount: number
  isDisabled?: boolean
  className?: string
  onSuccess?: () => void
  variant?: ButtonVariant
}

/**
 * FinalizeMultiProviderButton - Button to create child interventions from a parent
 *
 * Used when a multi-provider intervention in "separate" mode needs to be finalized.
 * This creates individual child interventions for each provider.
 *
 * Supports multiple variants for responsive layouts:
 * - desktop: Full button with tooltip
 * - tablet: Compact button
 * - mobile: DropdownMenuItem for mobile menu
 * - default: Standard button
 */
export function FinalizeMultiProviderButton({
  interventionId,
  providerCount,
  isDisabled = false,
  className,
  onSuccess,
  variant = 'default'
}: FinalizeMultiProviderButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleFinalize = async () => {
    setIsLoading(true)

    try {
      const result = await createChildInterventionsAction(interventionId)

      if (result.success) {
        toast.success(
          `${result.data.childCount} intervention(s) individuelle(s) créée(s)`,
          {
            description: "Les interventions ont été séparées par prestataire"
          }
        )
        setIsConfirmOpen(false)
        onSuccess?.()
        router.refresh()
      } else {
        toast.error("Erreur lors de la création", {
          description: result.error
        })
      }
    } catch (error) {
      toast.error("Une erreur est survenue", {
        description: error instanceof Error ? error.message : "Erreur inconnue"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Render trigger based on variant
  const renderTrigger = () => {
    switch (variant) {
      case 'desktop':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isDisabled}
                  variant="default"
                  size="sm"
                  className={`gap-2 min-h-[36px] bg-green-600 hover:bg-green-700 ${className || ''}`}
                >
                  <Split className="w-4 h-4" />
                  <span>Finaliser & Séparer</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Créer {providerCount} intervention(s) individuelle(s)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )

      case 'tablet':
        return (
          <Button
            onClick={() => setIsConfirmOpen(true)}
            disabled={isDisabled}
            variant="default"
            size="sm"
            className={`gap-1.5 min-h-[36px] bg-green-600 hover:bg-green-700 ${className || ''}`}
          >
            <Split className="w-4 h-4" />
            <span>Séparer</span>
          </Button>
        )

      case 'mobile':
        return (
          <DropdownMenuItem onSelect={() => setIsConfirmOpen(true)} disabled={isDisabled}>
            <Split className="w-4 h-4 mr-2 text-green-600" />
            Séparer en {providerCount} interventions
          </DropdownMenuItem>
        )

      default:
        return (
          <Button
            onClick={() => setIsConfirmOpen(true)}
            disabled={isDisabled}
            variant="default"
            className={className}
          >
            <Split className="h-4 w-4 mr-2" />
            Créer interventions individuelles
          </Button>
        )
    }
  }

  return (
    <>
      {renderTrigger()}

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Créer les interventions individuelles ?
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Cette action va créer <strong>{providerCount} intervention(s)</strong> individuelle(s),
                une pour chaque prestataire assigné.
              </p>
              <p className="text-sm text-slate-500">
                Chaque intervention enfant contiendra :
              </p>
              <ul className="text-sm text-slate-500 list-disc ml-4 space-y-1">
                <li>Les créneaux spécifiques à ce prestataire</li>
                <li>Les devis soumis par ce prestataire</li>
                <li>Les instructions qui lui ont été données</li>
              </ul>
              <p className="text-sm font-medium text-amber-600 mt-3">
                Cette action ne peut pas être annulée.
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmer la création
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
