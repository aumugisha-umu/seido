import { logger, logError } from '@/lib/logger'

/**
 * Utilitaires pour filtrer les disponibilités selon les états des devis
 * Permet d'afficher uniquement les disponibilités pertinentes dans l'onglet exécution
 */

interface Quote {
  id: string
  providerId: string
  status: 'pending' | 'approved' | 'rejected'
  [key: string]: unknown
}

interface UserAvailability {
  person: string
  role: string
  date: string
  startTime: string
  endTime: string
  userId?: string
  [key: string]: unknown
}

interface AvailabilityFilterState {
  totalAvailabilities: number
  includedAvailabilities: number
  excludedAvailabilities: number
  excludedProviders: string[]
  hasValidProviderAvailabilities: boolean
  hasLocataireTenantAvailabilities: boolean
  isEmpty: boolean
}

/**
 * Analyse l'état du filtrage des disponibilités
 */
export function analyzeAvailabilityFilterState(
  originalAvailabilities: UserAvailability[],
  filteredAvailabilities: UserAvailability[]
): AvailabilityFilterState {
  const excluded = originalAvailabilities.length - filteredAvailabilities.length
  const excludedProviders = originalAvailabilities
    .filter(avail =>
      avail.role === 'prestataire' &&
      !filteredAvailabilities.some(filtered =>
        filtered.userId === avail.userId &&
        filtered.date === avail.date &&
        filtered.startTime === avail.startTime
      )
    )
    .map(avail => avail.person)
    .filter((value, index, array) => array.indexOf(value) === index) // Remove duplicates

  return {
    totalAvailabilities: originalAvailabilities.length,
    includedAvailabilities: filteredAvailabilities.length,
    excludedAvailabilities: excluded,
    excludedProviders,
    hasValidProviderAvailabilities: filteredAvailabilities.some(avail => avail.role === 'prestataire'),
    hasLocataireTenantAvailabilities: filteredAvailabilities.some(avail =>
      avail.role === 'locataire' || avail.role === 'gestionnaire'
    ),
    isEmpty: filteredAvailabilities.length === 0
  }
}

/**
 * Filtre les disponibilités selon les statuts des devis et le rôle utilisateur
 * Inclut :
 * - Toutes les disponibilités des locataires et gestionnaires
 * - Pour les locataires : uniquement les prestataires avec devis approuvés
 * - Pour les gestionnaires/prestataires : prestataires avec devis en attente ou approuvés
 * Exclut :
 * - Les disponibilités des prestataires n'ayant que des devis rejetés
 */
export function filterAvailabilitiesByQuoteStatus(
  availabilities: UserAvailability[],
  quotes: Quote[],
  userRole?: 'locataire' | 'gestionnaire' | 'prestataire'
): UserAvailability[] {
  if (!availabilities?.length) {
    return []
  }

  // Si aucun devis, inclure toutes les disponibilités
  if (!quotes?.length) {
    return availabilities
  }

  // Créer une map des statuts des prestataires
  const providerQuoteStatus = new Map<string, Set<string>>()

  quotes.forEach(quote => {
    if (!providerQuoteStatus.has(quote.providerId)) {
      providerQuoteStatus.set(quote.providerId, new Set())
    }
    providerQuoteStatus.get(quote.providerId)!.add(quote.status)
  })

  // Debug log pour tracer les statuts des prestataires
  logger.info('🔧 [FILTER-DEBUG] Provider quote statuses:', {
    totalProviders: providerQuoteStatus.size,
    providerStatuses: Array.from(providerQuoteStatus.entries()).map(([providerId, statuses]) => ({
      providerId,
      statuses: Array.from(statuses)
    }))
  })

  // Filtrer les disponibilités
  return availabilities.filter(availability => {
    // Inclure toujours les disponibilités des non-prestataires
    if (availability.role !== 'prestataire') {
      return true
    }

    // Pour les prestataires, vérifier s'ils ont des devis actifs
    if (!availability.userId) {
      return true // Inclure si pas d'userId (sécurité)
    }

    const providerStatuses = providerQuoteStatus.get(availability.userId)

    // Gestion des prestataires sans devis selon le rôle utilisateur
    if (!providerStatuses || providerStatuses.size === 0) {
      if (userRole === 'locataire') {
        // Pour les locataires : pas de quote approuvé dans leur liste filtrée = exclusion
        logger.info(`🚫 [FILTER-DEBUG] Provider ${availability.userId} (${availability.person}) has no approved quotes - EXCLUDED for tenant`)
        return false
      } else {
        // Pour gestionnaires/prestataires : inclure les prestataires sans devis (logique existante)
        logger.info(`⚠️ [FILTER-DEBUG] Provider ${availability.userId} (${availability.person}) has no quotes but has availabilities - INCLUDED`)
        return true
      }
    }

    // Logique de filtrage adaptée selon le rôle utilisateur
    let shouldInclude: boolean

    if (userRole === 'locataire') {
      // Pour les locataires : inclure uniquement les prestataires avec devis approuvés
      shouldInclude = providerStatuses.has('approved')
    } else {
      // Pour gestionnaires et prestataires : inclure les devis en attente ou approuvés (logique existante)
      shouldInclude = providerStatuses.has('pending') || providerStatuses.has('approved')
    }

    logger.info(`🔍 [FILTER-DEBUG] Provider ${availability.userId} (${availability.person}) - Role: ${userRole} - Statuses: [${Array.from(providerStatuses).join(', ')}] - ${shouldInclude ? 'INCLUDED' : 'EXCLUDED'}`)
    return shouldInclude
  })
}

/**
 * Génère un message contextuel expliquant le filtrage appliqué
 */
export function getAvailabilityFilterMessage(
  filterState: AvailabilityFilterState
): {
  show: boolean
  message: string
  details?: string
  variant: 'info' | 'warning' | 'default'
} {
  if (filterState.excludedAvailabilities === 0) {
    return {
      show: false,
      message: '',
      variant: 'default'
    }
  }

  if (filterState.excludedProviders.length === 0) {
    return {
      show: false,
      message: '',
      variant: 'default'
    }
  }

  const providerCount = filterState.excludedProviders.length
  const providerNames = providerCount <= 2
    ? filterState.excludedProviders.join(' et ')
    : `${filterState.excludedProviders.slice(0, 2).join(', ')} et ${providerCount - 2} autre${providerCount - 2 > 1 ? 's' : ''}`

  return {
    show: true,
    message: `${filterState.excludedAvailabilities} disponibilité${filterState.excludedAvailabilities > 1 ? 's' : ''} masquée${filterState.excludedAvailabilities > 1 ? 's' : ''}`,
    details: `Disponibilités de ${providerNames} masquées (devis rejetés)`,
    variant: 'info'
  }
}

/**
 * Retourne les disponibilités valides avec les informations de filtrage
 */
export function getValidAvailabilities(
  availabilities: UserAvailability[],
  quotes: Quote[],
  userRole?: 'locataire' | 'gestionnaire' | 'prestataire'
): {
  filteredAvailabilities: UserAvailability[]
  filterState: AvailabilityFilterState
  filterMessage: ReturnType<typeof getAvailabilityFilterMessage>
} {
  const filteredAvailabilities = filterAvailabilitiesByQuoteStatus(availabilities, quotes, userRole)
  const filterState = analyzeAvailabilityFilterState(availabilities, filteredAvailabilities)
  const filterMessage = getAvailabilityFilterMessage(filterState)

  return {
    filteredAvailabilities,
    filterState,
    filterMessage
  }
}

/**
 * Vérifie si des disponibilités doivent être affichées selon le contexte
 */
export function shouldShowAvailabilities(
  availabilities: UserAvailability[],
  quotes: Quote[]
): boolean {
  const { filteredAvailabilities } = getValidAvailabilities(availabilities, quotes)
  return filteredAvailabilities.length > 0
}
