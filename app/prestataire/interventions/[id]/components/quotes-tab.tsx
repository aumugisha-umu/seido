'use client'

/**
 * Quotes Tab Component for Prestataire
 * Manages provider's own quotes with create/edit/delete
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { QuoteForm } from '@/components/interventions/quote-form'
import { DollarSign, FileText, Plus, Edit, Trash2, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/services'
import type { Database } from '@/lib/database.types'

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

type User = Database['public']['Tables']['users']['Row']

interface QuotesTabProps {
  interventionId: string
  quotes: Quote[]
  currentUser: User
  onRefresh: () => void
}

// Quote status labels
const statusLabels: Record<string, { label: string; color: string }> = {
  'draft': { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
  'pending': { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  'accepted': { label: 'Accepté', color: 'bg-green-100 text-green-800' },
  'rejected': { label: 'Rejeté', color: 'bg-red-100 text-red-800' }
}

// Quote type labels
const typeLabels: Record<string, string> = {
  'estimation': 'Estimation',
  'final': 'Facture finale'
}

export function QuotesTab({
  interventionId,
  quotes,
  currentUser,
  onRefresh
}: QuotesTabProps) {
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Filtrer les quotes à afficher: exclure les demandes de devis (pending avec amount = 0)
  // Ces demandes sont créées par le gestionnaire et le prestataire ne les a pas encore remplies
  const displayedQuotes = quotes.filter(quote => {
    // Exclure les demandes pending avec montant = 0 (demandes non remplies)
    if (quote.status === 'pending' && (!quote.amount || quote.amount === 0)) {
      return false
    }
    return true
  })

  // Handle create new quote
  const handleCreateQuote = () => {
    setSelectedQuote(null)
    setQuoteDialogOpen(true)
  }

  // Handle edit quote
  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote)
    setQuoteDialogOpen(true)
  }

  // Handle delete quote
  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return

    setDeleting(quoteId)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase
        .from('intervention_quotes')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.id
        })
        .eq('id', quoteId)

      if (error) throw error

      toast.success('Devis supprimé avec succès')
      onRefresh()
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast.error('Erreur lors de la suppression du devis')
    } finally {
      setDeleting(null)
    }
  }

  // Calculate statistics (utilise displayedQuotes au lieu de quotes)
  const stats = {
    total: displayedQuotes.length,
    draft: displayedQuotes.filter(q => q.status === 'draft').length,
    pending: displayedQuotes.filter(q => q.status === 'pending').length,
    accepted: displayedQuotes.filter(q => q.status === 'accepted').length,
    rejected: displayedQuotes.filter(q => q.status === 'rejected').length
  }

  return (
    <>
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
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
                Brouillons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quotes list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Mes devis
              </CardTitle>
              <Button
                onClick={handleCreateQuote}
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau devis
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {displayedQuotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  Aucun devis
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Créez votre premier devis pour cette intervention
                </p>
                <Button
                  onClick={handleCreateQuote}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un devis
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedQuotes.map((quote) => {
                  const statusInfo = statusLabels[quote.status] || statusLabels['pending']
                  const canEdit = quote.status === 'draft' || quote.status === 'pending'
                  const canDelete = quote.status === 'draft'

                  return (
                    <div
                      key={quote.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {typeLabels[quote.quote_type] || quote.quote_type}
                            </h3>
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-2xl font-bold text-primary">
                            {quote.amount.toFixed(2)}€
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditQuote(quote)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteQuote(quote.id)}
                              disabled={deleting === quote.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {quote.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {quote.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Créé le {format(new Date(quote.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                        {quote.estimated_duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Durée estimée: {quote.estimated_duration}h
                          </span>
                        )}
                      </div>

                      {quote.status === 'rejected' && quote.rejection_reason && (
                        <div className="mt-3 p-3 rounded bg-red-50 border border-red-200">
                          <p className="text-sm text-red-900">
                            <strong>Raison du rejet:</strong> {quote.rejection_reason}
                          </p>
                        </div>
                      )}

                      {quote.status === 'accepted' && (
                        <div className="mt-3 p-3 rounded bg-green-50 border border-green-200">
                          <p className="text-sm text-green-900">
                            <strong>Devis accepté!</strong> Vous pouvez maintenant planifier l'intervention.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quote Form Dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedQuote ? 'Modifier le devis' : 'Nouveau devis'}
            </DialogTitle>
            <DialogDescription>
              {selectedQuote
                ? 'Modifiez les informations de votre devis'
                : 'Créez un nouveau devis pour cette intervention'}
            </DialogDescription>
          </DialogHeader>
          <QuoteForm
            interventionId={interventionId}
            existingQuote={selectedQuote || undefined}
            onSuccess={() => {
              setQuoteDialogOpen(false)
              setSelectedQuote(null)
              onRefresh()
            }}
            onCancel={() => {
              setQuoteDialogOpen(false)
              setSelectedQuote(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
