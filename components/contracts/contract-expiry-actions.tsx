"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw, XCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { setExpiryDecision } from '@/app/actions/contracts'
import { terminateContract } from '@/app/actions/contracts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ContractExpiryInfo } from '@/lib/types/contract.types'

interface ContractExpiryActionsProps {
  contractId: string
  expiryInfo: ContractExpiryInfo
  onRefresh?: () => void
  compact?: boolean
}

export function ContractExpiryActions({
  contractId,
  expiryInfo,
  onRefresh,
  compact = false
}: ContractExpiryActionsProps) {
  const router = useRouter()
  const [isTerminating, setIsTerminating] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false)
  const [taciteDialogOpen, setTaciteDialogOpen] = useState(false)

  if (!expiryInfo.alertTier) return null

  const handleRenew = () => {
    router.push(`/gestionnaire/contrats/nouveau?renew=${contractId}`)
  }

  const handleTerminate = async () => {
    setIsTerminating(true)
    try {
      const result = await terminateContract(contractId, 'Résiliation anticipée — préavis envoyé')
      if (result.success) {
        toast.success('Contrat marqué comme résilié')
        onRefresh?.()
      } else {
        toast.error(result.error || 'Erreur lors de la résiliation')
      }
    } catch {
      toast.error('Erreur lors de la résiliation')
    } finally {
      setIsTerminating(false)
      setTerminateDialogOpen(false)
    }
  }

  const handleTaciteAccepted = async () => {
    setIsAccepting(true)
    try {
      const result = await setExpiryDecision(contractId, 'tacite_accepted')
      if (result.success) {
        toast.success('Renouvellement tacite accepté — alerte retirée')
        onRefresh?.()
      } else {
        toast.error(result.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setIsAccepting(false)
      setTaciteDialogOpen(false)
    }
  }

  return (
    <>
      <div className={compact ? 'flex gap-2 flex-wrap' : 'flex gap-2 flex-wrap mt-2'}>
        <Button
          size="sm"
          variant="default"
          onClick={handleRenew}
          className="text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Renouveler
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setTerminateDialogOpen(true)}
          className="text-xs text-red-600 border-red-200 hover:bg-red-50"
        >
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Résilier
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setTaciteDialogOpen(true)}
          className="text-xs text-slate-600"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Tacite accepté
        </Button>
      </div>

      {/* Terminate confirmation */}
      <AlertDialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Résilier le contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le contrat sera marqué comme résilié. Assurez-vous d&apos;avoir envoyé
              la lettre recommandée de préavis au locataire avant de confirmer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTerminating}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminate}
              disabled={isTerminating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isTerminating ? 'Résiliation...' : 'Confirmer la résiliation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tacit renewal confirmation */}
      <AlertDialog open={taciteDialogOpen} onOpenChange={setTaciteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accepter le renouvellement tacite ?</AlertDialogTitle>
            <AlertDialogDescription>
              {expiryInfo.tacitRenewalRisk}.
              L&apos;alerte sera retirée et le contrat se renouvellera automatiquement
              à son échéance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAccepting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTaciteAccepted}
              disabled={isAccepting}
            >
              {isAccepting ? 'Enregistrement...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
