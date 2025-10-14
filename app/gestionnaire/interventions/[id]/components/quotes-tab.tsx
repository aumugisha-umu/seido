'use client'

/**
 * Quotes Tab Component
 * Manages intervention quotes with approval/rejection
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InterventionQuoteList } from '@/components/interventions/intervention-quote-list'
import { DollarSign, FileText, Plus, CheckCircle, XCircle, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/services'
import type { Database } from '@/lib/database.types'

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

interface QuotesTabProps {
  interventionId: string
  quotes: Quote[]
  canManage?: boolean
}

export function QuotesTab({
  interventionId,
  quotes,
  canManage = false
}: QuotesTabProps) {
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'accept' | 'reject'>('accept')
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  // Handle quote acceptance
  const handleAcceptQuote = async (quote: Quote) => {
    setSelectedQuote(quote)
    setActionType('accept')
    setActionDialogOpen(true)
  }

  // Handle quote rejection
  const handleRejectQuote = async (quote: Quote) => {
    setSelectedQuote(quote)
    setActionType('reject')
    setActionDialogOpen(true)
  }

  // Process quote action
  const processQuoteAction = async () => {
    if (!selectedQuote) return

    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast.error('Veuillez indiquer une raison de rejet')
      return
    }

    setProcessing(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: userData } = await supabase.auth.getUser()

      const updateData: any = {
        status: actionType === 'accept' ? 'accepted' : 'rejected',
        validated_at: new Date().toISOString(),
        validated_by: userData.user?.id
      }

      if (actionType === 'reject') {
        updateData.rejection_reason = rejectionReason
      }

      const { error } = await supabase
        .from('intervention_quotes')
        .update(updateData)
        .eq('id', selectedQuote.id)

      if (error) throw error

      toast.success(
        actionType === 'accept'
          ? 'Devis accepté avec succès'
          : 'Devis rejeté'
      )

      setActionDialogOpen(false)
      setRejectionReason('')
      window.location.reload() // Refresh to update the list
    } catch (error) {
      console.error('Error processing quote action:', error)
      toast.error('Erreur lors du traitement du devis')
    } finally {
      setProcessing(false)
    }
  }

  // Calculate statistics
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
    totalAmount: quotes
      .filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + q.amount, 0)
  }

  return (
    <>
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total des devis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Acceptés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Montant accepté
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalAmount.toFixed(2)}€</p>
            </CardContent>
          </Card>
        </div>

        {/* Quotes list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Devis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  Aucun devis
                </p>
                <p className="text-sm text-muted-foreground">
                  Les devis soumis par les prestataires apparaîtront ici
                </p>
              </div>
            ) : (
              <InterventionQuoteList
                quotes={quotes}
                canManage={canManage}
                onAccept={handleAcceptQuote}
                onReject={handleRejectQuote}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'accept' ? 'Accepter le devis' : 'Rejeter le devis'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept'
                ? 'Êtes-vous sûr de vouloir accepter ce devis ?'
                : 'Veuillez indiquer la raison du rejet de ce devis.'}
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-4 py-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prestataire</span>
                  <span className="font-medium">
                    {selectedQuote.provider?.name || 'Inconnu'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-medium">{selectedQuote.amount}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">
                    {selectedQuote.quote_type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {actionType === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="reason">Raison du rejet *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Expliquez pourquoi ce devis est rejeté..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={processing}
            >
              Annuler
            </Button>
            <Button
              onClick={processQuoteAction}
              disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
              variant={actionType === 'accept' ? 'default' : 'destructive'}
            >
              {processing
                ? 'Traitement...'
                : actionType === 'accept'
                  ? 'Accepter le devis'
                  : 'Rejeter le devis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}