/**
 * Utilitaires pour analyser l'état des devis et déterminer les actions appropriées
 */

export interface Quote {
  id: string
  status: 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled'
  providerId: string
  providerName?: string
  amount?: number
  isCurrentUserQuote?: boolean
  [key: string]: unknown
}

export interface QuoteState {
  hasQuotes: boolean
  sentCount: number
  pendingCount: number
  acceptedCount: number
  rejectedCount: number
  cancelledCount: number
  totalCount: number
  hasActiveQuotes: boolean
  hasOnlyInactiveQuotes: boolean
  isEmpty: boolean
}

export interface QuoteActionConfig {
  key: string
  label: string
  variant: 'default' | 'destructive' | 'outline' | 'outlined-danger' | 'secondary' | 'ghost'
  isDisabled: boolean
  shouldShow: boolean
  badge?: {
    show: boolean
    value: number | string
    variant: 'default' | 'warning' | 'success' | 'destructive'
  }
  tooltip: string
  description: string
}

/**
 * Analyse l'état des devis d'une intervention
 */
export function analyzeQuoteState(quotes: Quote[] = []): QuoteState {
  const sentQuotes = quotes.filter(q => q.status === 'sent')
  const pendingQuotes = quotes.filter(q => q.status === 'pending')
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted')
  const rejectedQuotes = quotes.filter(q => q.status === 'rejected')
  const cancelledQuotes = quotes.filter(q => q.status === 'cancelled')

  const activeCount = sentQuotes.length + pendingQuotes.length + acceptedQuotes.length

  return {
    hasQuotes: quotes.length > 0,
    sentCount: sentQuotes.length,
    pendingCount: pendingQuotes.length,
    acceptedCount: acceptedQuotes.length,
    rejectedCount: rejectedQuotes.length,
    cancelledCount: cancelledQuotes.length,
    totalCount: quotes.length,
    hasActiveQuotes: activeCount > 0,
    hasOnlyInactiveQuotes: quotes.length > 0 && activeCount === 0,
    isEmpty: quotes.length === 0
  }
}

/**
 * Génère la configuration du bouton de gestion des devis pour les gestionnaires
 */
export function getQuoteManagementActionConfig(quotes: Quote[] = []): QuoteActionConfig {
  const state = analyzeQuoteState(quotes)

  // Cas 1: Aucun devis - permettre de demander des devis
  if (state.isEmpty) {
    return {
      key: 'request_quotes',
      label: 'Demander des devis',
      variant: 'default',
      isDisabled: false,
      shouldShow: true,
      badge: undefined,
      tooltip: 'Solliciter des devis auprès de prestataires',
      description: 'Envoyer une demande de devis aux prestataires'
    }
  }

  // Cas 2: Devis reçus à traiter (PRIORITÉ HAUTE)
  if (state.sentCount > 0) {
    return {
      key: 'process_quotes',
      label: 'Traiter le devis',
      variant: 'default',
      isDisabled: false,
      shouldShow: true,
      badge: state.sentCount > 1 ? {
        show: true,
        value: state.sentCount,
        variant: 'warning'
      } : undefined,
      tooltip: state.sentCount > 1
        ? `${state.sentCount} devis en attente de validation`
        : 'Devis en attente de validation',
      description: 'Examiner et valider les devis reçus'
    }
  }

  // Cas 3: Demandes en attente de réponse (pending)
  if (state.pendingCount > 0) {
    return {
      key: 'request_quotes',
      label: 'Modifier la demande',
      variant: 'outline',
      isDisabled: false,
      shouldShow: true,
      badge: undefined,
      tooltip: 'Modifier la demande de devis existante',
      description: 'Modifier la demande de devis existante'
    }
  }

  // Cas 4: Tous rejetés ou annulés (aucun devis actif)
  if (state.hasOnlyInactiveQuotes) {
    return {
      key: 'request_quotes',
      label: 'Nouvelle demande de devis',
      variant: 'default',
      isDisabled: false,
      shouldShow: true,
      badge: undefined,
      tooltip: 'Faire une nouvelle demande de devis',
      description: 'Faire une nouvelle demande de devis'
    }
  }

  // Cas 5: Uniquement des devis acceptés (pas de pending ni sent)
  if (state.acceptedCount > 0 && state.pendingCount === 0 && state.sentCount === 0) {
    return {
      key: 'view_quotes',
      label: 'Voir les devis',
      variant: 'secondary',
      isDisabled: false,
      shouldShow: true,
      badge: undefined,
      tooltip: 'Consulter les devis acceptés',
      description: 'Consulter les devis acceptés'
    }
  }

  // Fallback (ne devrait pas arriver)
  return {
    key: 'request_quotes',
    label: 'Demander des devis',
    variant: 'default',
    isDisabled: false,
    shouldShow: true,
    badge: undefined,
    tooltip: 'Solliciter des devis auprès de prestataires',
    description: 'Envoyer une demande de devis aux prestataires'
  }
}

/**
 * Génère la configuration pour gérer les devis existants (action secondaire)
 * NOTE: Bouton désactivé - les utilisateurs accèdent aux devis via l'onglet Devis
 */
export function getExistingQuotesManagementConfig(quotes: Quote[] = []): QuoteActionConfig | null {
  // Bouton "Gérer les devis" retiré - navigation via onglet Devis uniquement
  return null
}

/**
 * Génère un message d'état vide contextuel pour la section des devis
 */
export function getQuoteEmptyStateMessage(quotes: Quote[] = []): {
  title: string
  description: string
  actionLabel?: string
  variant: 'info' | 'warning' | 'default'
} {
  const state = analyzeQuoteState(quotes)

  if (state.isEmpty) {
    return {
      title: 'En attente de devis',
      description: 'Les prestataires contactés n\'ont pas encore soumis leurs propositions. Vous recevrez une notification dès qu\'un devis sera disponible.',
      actionLabel: 'Relancer les prestataires',
      variant: 'info'
    }
  }

  if (state.hasOnlyRejectedQuotes) {
    return {
      title: 'Nouveaux devis attendus',
      description: `${state.rejectedCount} devis ${state.rejectedCount > 1 ? 'ont été rejetés' : 'a été rejeté'}. Les prestataires ont été notifiés et vont soumettre de nouvelles propositions.`,
      actionLabel: 'Voir l\'historique',
      variant: 'warning'
    }
  }

  return {
    title: 'Aucun devis disponible',
    description: 'Aucun devis n\'est disponible pour cette intervention.',
    variant: 'default'
  }
}

/**
 * Détermine si on doit rediriger vers l'onglet devis ou afficher un message
 */
export function shouldNavigateToQuotes(quotes: Quote[] = []): boolean {
  const state = analyzeQuoteState(quotes)
  return state.hasActiveQuotes
}

/**
 * Génère un résumé textuel de l'état des devis pour l'affichage
 */
export function getQuoteStateSummary(quotes: Quote[] = []): string {
  const state = analyzeQuoteState(quotes)

  if (state.isEmpty) {
    return 'Aucun devis reçu'
  }

  if (state.hasOnlyInactiveQuotes) {
    const inactiveParts: string[] = []
    if (state.rejectedCount > 0) {
      inactiveParts.push(`${state.rejectedCount} rejeté${state.rejectedCount > 1 ? 's' : ''}`)
    }
    if (state.cancelledCount > 0) {
      inactiveParts.push(`${state.cancelledCount} annulé${state.cancelledCount > 1 ? 's' : ''}`)
    }
    return inactiveParts.join(', ')
  }

  const parts: string[] = []
  if (state.sentCount > 0) {
    parts.push(`${state.sentCount} reçu${state.sentCount > 1 ? 's' : ''}`)
  }
  if (state.pendingCount > 0) {
    parts.push(`${state.pendingCount} en attente`)
  }
  if (state.acceptedCount > 0) {
    parts.push(`${state.acceptedCount} approuvé${state.acceptedCount > 1 ? 's' : ''}`)
  }
  if (state.rejectedCount > 0) {
    parts.push(`${state.rejectedCount} rejeté${state.rejectedCount > 1 ? 's' : ''}`)
  }
  if (state.cancelledCount > 0) {
    parts.push(`${state.cancelledCount} annulé${state.cancelledCount > 1 ? 's' : ''}`)
  }

  return parts.join(', ')
}
