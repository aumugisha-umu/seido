'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Ban } from 'lucide-react'
import { toast } from 'sonner'

type ActionType = 'soft_delete' | 'blacklist'

interface MarkAsIrrelevantDialogProps {
  email: {
    id: string
    sender_email: string
    sender_name: string
    subject: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSoftDelete: (emailId: string) => void
  onBlacklist: (emailId: string, senderEmail: string, reason?: string) => void
  onArchive?: () => void
}

export function MarkAsIrrelevantDialog({
  email,
  open,
  onOpenChange,
  onSoftDelete,
  onBlacklist,
  onArchive
}: MarkAsIrrelevantDialogProps) {
  const [action, setAction] = useState<ActionType>('soft_delete')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      if (action === 'soft_delete') {
        onSoftDelete(email.id)
        onArchive?.() // Auto-archive when marked as irrelevant
        toast.success('Email masqué et archivé')
      } else {
        onBlacklist(email.id, email.sender_email, reason)
        onArchive?.() // Auto-archive when blacklisted
        toast.success(`🚫 ${email.sender_email} bloqué et archivé`)
      }
      onOpenChange(false)
      setReason('')
      setAction('soft_delete')
    } catch (error) {
      toast.error('Échec du traitement de l\'action')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Marquer cet email comme non pertinent ?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
            De: <span className="font-medium text-foreground">{email.sender_name}</span> ({email.sender_email})
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 my-4">
          <p className="text-sm font-semibold">Choisissez une action :</p>

          <RadioGroup value={action} onValueChange={(v) => setAction(v as ActionType)}>
            {/* Option 1: Soft Delete */}
            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="soft_delete" id="soft_delete" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="soft_delete" className="cursor-pointer font-medium">
                  Masquer uniquement cet email
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Cet email sera masqué de votre boîte de réception. Vous pourrez le restaurer plus tard depuis la corbeille.
                </p>
              </div>
            </div>

            {/* Option 2: Blacklist */}
            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="blacklist" id="blacklist" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="blacklist" className="cursor-pointer font-medium flex items-center gap-1">
                  <Ban className="w-4 h-4" />
                  Bloquer tous les futurs emails de cet expéditeur
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Cet email sera supprimé ET tous les futurs emails de <strong>{email.sender_email}</strong> seront automatiquement bloqués.
                </p>

                {action === 'blacklist' && (
                  <div className="mt-3">
                    <Label htmlFor="reason" className="text-xs">
                      Raison facultative (pour référence de l'équipe) :
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder="ex: Emails promotionnels, Spam, etc."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-1 h-20 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={loading} variant="destructive">
            {loading ? 'Traitement...' : 'Confirmer'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
