/**
 * Utilitaires pour analyser l'état des estimations et déterminer les actions appropriées
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
 * Analyse l'état des estimations d'une intervention
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
 * Génère la configuration du bouton de gestion des estimations pour les gestionnaires
 */
export function getQuoteManagementActionConfig(quotes: Quote[] = []): QuoteActionConfig {
  const state = analyzeQuoteState(quotes)

  // Cas 1: Aucune estimation - permettre de demander des estimations
  if (state.isEmpty) {
    return {
      key: 'request_quotes',
      label: 'Demander des estimations',
      variant: 'default',
      isDisabled: false,
      shouldShow: true,
      badge: undefined,
      tooltip: 'Solliciter des estimations auprès de prestataires',
      description: 'Envoyer une demande d\'estimation aux prestataires'
    }
  }

  // Cas 2: Estimations reçues à traiter (PRIORITÉ HAUTE)
  if (state.sentCount > 0) {
    return {
      key: 'process_quotes',
      label: 'Traiter l\'estimation',
      variant: 'default',
      isDisabled: false,
      shouldShow: true,
      badge: state.sentCount > 1 ? {
        show: true,
        value: state.sentCount,
        variant: 'warning'
      } : undefined,
      tooltip: state.sentCount > 1
        ? `${state.sentCount} estimations en attente de validation`
        : 'Estimation en attente de validation',
      description: 'Examiner et valider les estimations reçues'
    }
  }

  // Cas 3: Toutes rejetées ou annulées (aucune estimation active)
  if (state.hasOnlyInactiveQuotes) {
    return {
      key: 'request_quotes',
      label: 'Nouvelle demande d\'estimation',
      variant: 'default',
      isDisabled: false,
      shouldShow: true,
      badge: undefined,
      tooltip: 'Faire une nouvelle demande d\'estimation',
      description: 'Faire une nouvelle demande d\'estimation'
    }
  }

  // Cas 4: Uniquement des estimations acceptées (pas de pending ni sent)
  if (state.acceptedCount > 0 && state.pendingCount === 0 && state.sentCount === 0) {
    return {
      key: 'view_quotes',
      label: 'Voir les estimations',
      variant: 'secondary',
      isDisabled: false,
      shouldShow: true,
      badge: undefined,
      tooltip: 'Consulter les estimations acceptées',
      description: 'Consulter les estimations acceptées'
    }
  }

  // Fallback (ne devrait pas arriver)
  return {
    key: 'request_quotes',
    label: 'Demander des estimations',
    variant: 'default',
    isDisabled: false,
    shouldShow: true,
    badge: undefined,
    tooltip: 'Solliciter des estimations auprès de prestataires',
    description: 'Envoyer une demande d\'estimation aux prestataires'
  }
}

/**
 * Génère la configuration pour gérer les estimations existantes (action secondaire)
 * NOTE: Bouton désactivé - les utilisateurs accèdent aux estimations via l'onglet Estimations
 */
export function getExistingQuotesManagementConfig(quotes: Quote[] = []): QuoteActionConfig | null {
  // Bouton "Gérer les estimations" retiré - navigation via onglet Estimations uniquement
  return null
}

/**
 * Génère un message d'état vide contextuel pour la section des estimations
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
      title: 'En attente d\'estimation',
      description: 'Les prestataires contactés n\'ont pas encore soumis leurs propositions. Vous recevrez une notification dès qu\'une estimation sera disponible.',
      actionLabel: 'Relancer les prestataires',
      variant: 'info'
    }
  }

  if (state.hasOnlyRejectedQuotes) {
    return {
      title: 'Nouvelles estimations attendues',
      description: `${state.rejectedCount} estimation${state.rejectedCount > 1 ? 's ont été rejetées' : ' a été rejetée'}. Les prestataires ont été notifiés et vont soumettre de nouvelles propositions.`,
      actionLabel: 'Voir l\'historique',
      variant: 'warning'
    }
  }

  return {
    title: 'Aucune estimation disponible',
    description: 'Aucune estimation n\'est disponible pour cette intervention.',
    variant: 'default'
  }
}

/**
 * Détermine si on doit rediriger vers l'onglet estimations ou afficher un message
 */
export function shouldNavigateToQuotes(quotes: Quote[] = []): boolean {
  const state = analyzeQuoteState(quotes)
  return state.hasActiveQuotes
}

/**
 * Génère un résumé textuel de l'état des estimations pour l'affichage
 */
export function getQuoteStateSummary(quotes: Quote[] = []): string {
  const state = analyzeQuoteState(quotes)

  if (state.isEmpty) {
    return 'Aucune estimation reçue'
  }

  if (state.hasOnlyInactiveQuotes) {
    const inactiveParts: string[] = []
    if (state.rejectedCount > 0) {
      inactiveParts.push(`${state.rejectedCount} rejetée${state.rejectedCount > 1 ? 's' : ''}`)
    }
    if (state.cancelledCount > 0) {
      inactiveParts.push(`${state.cancelledCount} annulée${state.cancelledCount > 1 ? 's' : ''}`)
    }
    return inactiveParts.join(', ')
  }

  const parts: string[] = []
  if (state.sentCount > 0) {
    parts.push(`${state.sentCount} reçue${state.sentCount > 1 ? 's' : ''}`)
  }
  if (state.pendingCount > 0) {
    parts.push(`${state.pendingCount} en attente`)
  }
  if (state.acceptedCount > 0) {
    parts.push(`${state.acceptedCount} approuvée${state.acceptedCount > 1 ? 's' : ''}`)
  }
  if (state.rejectedCount > 0) {
    parts.push(`${state.rejectedCount} rejetée${state.rejectedCount > 1 ? 's' : ''}`)
  }
  if (state.cancelledCount > 0) {
    parts.push(`${state.cancelledCount} annulée${state.cancelledCount > 1 ? 's' : ''}`)
  }

  return parts.join(', ')
}
