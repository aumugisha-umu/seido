/**
 * Utilitaires pour analyser l'état des devis et déterminer les actions appropriées
 */

export interface Quote {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  providerId: string
  providerName: string
  [key: string]: unknown
}

export interface QuoteState {
  hasQuotes: boolean
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  totalCount: number
  hasActionableQuotes: boolean
  hasOnlyRejectedQuotes: boolean
  isEmpty: boolean
}

export interface QuoteActionConfig {
  key: string
  label: string
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
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
  const pendingQuotes = quotes.filter(q => q.status === 'pending')
  const approvedQuotes = quotes.filter(q => q.status === 'approved')
  const rejectedQuotes = quotes.filter(q => q.status === 'rejected')

  return {
    hasQuotes: quotes.length > 0,
    pendingCount: pendingQuotes.length,
    approvedCount: approvedQuotes.length,
    rejectedCount: rejectedQuotes.length,
    totalCount: quotes.length,
    hasActionableQuotes: pendingQuotes.length > 0 || approvedQuotes.length > 0,
    hasOnlyRejectedQuotes: quotes.length > 0 && rejectedQuotes.length === quotes.length,
    isEmpty: quotes.length === 0
  }
}

/**
 * Génère la configuration du bouton de gestion des devis pour les gestionnaires
 */
export function getQuoteManagementActionConfig(quotes: Quote[] = []): QuoteActionConfig {
  const state = analyzeQuoteState(quotes)

  // Aucun devis - permettre de demander des devis
  if (state.isEmpty) {
    return {
      key: 'request_quotes',
      label: 'Demander des devis',
      variant: 'default',
      isDisabled: false,
      shouldShow: true,
      tooltip: 'Solliciter des devis auprès de prestataires',
      description: 'Envoyer une demande de devis aux prestataires'
    }
  }

  // Uniquement des devis rejetés - permettre de nouvelles demandes
  if (state.hasOnlyRejectedQuotes) {
    return {
      key: 'request_quotes',
      label: 'Nouvelle demande de devis',
      variant: 'default',
      isDisabled: false,
      shouldShow: true,
      // Badge retiré - pas de compteur affiché
      badge: undefined,
      tooltip: `${state.rejectedCount} devis rejeté${state.rejectedCount > 1 ? 's' : ''}. Faire une nouvelle demande.`,
      description: 'Tous les devis ont été rejetés, faire une nouvelle demande'
    }
  }

  // A des devis à gérer (pending ou approved) - permettre de nouvelles demandes ET gérer les existants
  if (state.hasActionableQuotes) {
    const pendingText = state.pendingCount > 0 ? `${state.pendingCount} en attente` : ''
    const approvedText = state.approvedCount > 0 ? `${state.approvedCount} approuvé${state.approvedCount > 1 ? 's' : ''}` : ''
    const statusText = [pendingText, approvedText].filter(Boolean).join(', ')

    return {
      key: 'request_quotes',
      label: 'Nouvelle demande de devis',
      variant: 'outline',
      isDisabled: false,
      shouldShow: true,
      // Badge retiré - pas de compteur affiché
      badge: undefined,
      tooltip: `Faire une nouvelle demande (${state.totalCount} devis reçu${state.totalCount > 1 ? 's' : ''} : ${statusText})`,
      description: `Faire une nouvelle demande de devis (${statusText})`
    }
  }

  // État par défaut - permettre de demander des devis
  return {
    key: 'request_quotes',
    label: 'Demander des devis',
    variant: 'default',
    isDisabled: false,
    shouldShow: true,
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
  return state.hasActionableQuotes
}

/**
 * Génère un résumé textuel de l'état des devis pour l'affichage
 */
export function getQuoteStateSummary(quotes: Quote[] = []): string {
  const state = analyzeQuoteState(quotes)

  if (state.isEmpty) {
    return 'Aucun devis reçu'
  }

  if (state.hasOnlyRejectedQuotes) {
    return `${state.rejectedCount} devis rejeté${state.rejectedCount > 1 ? 's' : ''}`
  }

  const parts: string[] = []
  if (state.pendingCount > 0) {
    parts.push(`${state.pendingCount} en attente`)
  }
  if (state.approvedCount > 0) {
    parts.push(`${state.approvedCount} approuvé${state.approvedCount > 1 ? 's' : ''}`)
  }
  if (state.rejectedCount > 0) {
    parts.push(`${state.rejectedCount} rejeté${state.rejectedCount > 1 ? 's' : ''}`)
  }

  return parts.join(', ')
}
