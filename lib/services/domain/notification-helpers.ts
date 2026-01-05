/**
 * Notification Business Logic Helpers
 *
 * Pure functions pour déterminer les destinataires de notifications.
 * Partagées entre NotificationService (DB) et EmailNotificationService (Email).
 *
 * Architecture:
 * - Ces helpers sont PURS (pas d'effets de bord, pas d'appels DB)
 * - Input: Données enrichies (intervention + managers, building + managers, etc.)
 * - Output: Liste de recipients avec métadonnées (userId, isPersonal, role)
 *
 * @module notification-helpers
 */

import type { UserRole } from '@/lib/auth'

/**
 * Recipient pour une notification
 */
export interface NotificationRecipient {
  userId: string
  isPersonal: boolean // true = notification personnelle, false = notification d'équipe
  role: UserRole      // Rôle de l'utilisateur pour filtrage contextuel
}

/**
 * Options de filtrage pour determineInterventionRecipients
 *
 * Permet d'exclure ou d'inclure des catégories d'utilisateurs selon le contexte.
 *
 * @example
 * ```typescript
 * // Exclure le créateur et ne notifier que les prestataires
 * const options: RecipientFilterOptions = {
 *   excludeUserId: creatorId,
 *   onlyRoles: ['prestataire']
 * }
 *
 * // Notifier tout le monde sauf les gestionnaires d'équipe
 * const options: RecipientFilterOptions = {
 *   excludeUserId: creatorId,
 *   excludeRoles: ['gestionnaire'],
 *   excludeNonPersonal: true
 * }
 * ```
 */
export interface RecipientFilterOptions {
  /** ID de l'utilisateur à exclure (généralement le créateur/acteur) */
  excludeUserId?: string | null

  /** Rôles à exclure complètement des destinataires */
  excludeRoles?: UserRole[]

  /** Si défini, SEULEMENT ces rôles recevront des notifications (mutuellement exclusif avec excludeRoles) */
  onlyRoles?: UserRole[]

  /** Si true, exclut les membres d'équipe non directement assignés (isPersonal: false) */
  excludeNonPersonal?: boolean
}

/**
 * Intervention enrichie avec managers
 */
export interface InterventionWithManagers {
  id: string
  title: string
  reference: string
  lot_id: string | null
  team_id: string
  created_by: string
  assigned_to: string | null
  manager_id: string | null
  interventionAssignedManagers: string[] // IDs des gestionnaires assignés à CETTE intervention (via intervention_assignments)
  interventionAssignedProviders: string[] // IDs des prestataires assignés à CETTE intervention (via intervention_assignments)
  interventionAssignedTenants: string[] // IDs des locataires assignés à CETTE intervention (via intervention_assignments)
  buildingManagers: string[] // IDs des gestionnaires du bâtiment (contexte, ne PAS utiliser pour is_personal)
  lotManagers: string[] // IDs des gestionnaires du lot (contexte, ne PAS utiliser pour is_personal)
  teamMembers: Array<{ id: string; role: string; name: string }>
  lot?: {
    reference: string
    building?: {
      name: string
    }
  }
}

/**
 * Bâtiment enrichi avec managers
 */
export interface BuildingWithManagers {
  id: string
  name: string
  address: string
  team_id: string
  buildingManagers: string[] // IDs des gestionnaires principaux
  teamMembers: Array<{ id: string; role: string; name: string }>
}

/**
 * Lot enrichi avec managers
 */
export interface LotWithManagers {
  id: string
  reference: string
  building_id: string
  team_id: string
  lotManagers: string[] // IDs des gestionnaires du lot
  buildingManagers: string[] // IDs des gestionnaires du bâtiment parent
  teamMembers: Array<{ id: string; role: string; name: string }>
  building?: {
    name: string
  }
}

/**
 * Contact enrichi avec managers
 */
export interface ContactWithManagers {
  id: string
  first_name: string
  last_name: string
  type: string
  team_id: string
  relatedBuildingManagers: string[] // Gestionnaires des bâtiments liés
  teamMembers: Array<{ id: string; role: string; name: string }>
}

// ══════════════════════════════════════════════════════════════
// INTERVENTION RECIPIENTS
// ══════════════════════════════════════════════════════════════

/**
 * Détermine les destinataires pour une notification d'intervention
 *
 * Logique métier:
 * 1. Utilisateurs assignés directement (gestionnaires, prestataires, locataires) → Notification PERSONNELLE
 * 2. Gestionnaires d'équipe non assignés → Notification D'ÉQUIPE
 * 3. Filtrage optionnel par rôle (excludeRoles/onlyRoles)
 *
 * @param intervention - Intervention enrichie avec managers et assignations
 * @param options - Options de filtrage (excludeUserId, excludeRoles, onlyRoles, excludeNonPersonal)
 * @returns Liste de recipients avec flag isPersonal et role
 *
 * @example
 * ```typescript
 * // Création: notifier tout le monde sauf le créateur
 * const recipients = determineInterventionRecipients(intervention, { excludeUserId: creatorId })
 *
 * // Approbation: notifier seulement locataire + prestataires assignés
 * const recipients = determineInterventionRecipients(intervention, {
 *   excludeUserId: managerId,
 *   excludeRoles: ['gestionnaire'],
 *   excludeNonPersonal: true
 * })
 *
 * // Clôture: notifier seulement les gestionnaires
 * const recipients = determineInterventionRecipients(intervention, {
 *   excludeUserId: providerId,
 *   onlyRoles: ['gestionnaire']
 * })
 * ```
 */
export function determineInterventionRecipients(
  intervention: InterventionWithManagers,
  options: RecipientFilterOptions = {}
): NotificationRecipient[] {
  const { excludeUserId, excludeRoles, onlyRoles, excludeNonPersonal } = options
  let recipients: NotificationRecipient[] = []
  const processedUserIds = new Set<string>()

  // Helper: Vérifier si un userId doit être exclu
  const shouldExcludeUser = (userId: string): boolean => {
    return excludeUserId ? userId === excludeUserId : false
  }

  // 1. Ajouter les gestionnaires directement assignés (PERSONNELLE)
  intervention.interventionAssignedManagers.forEach(userId => {
    if (!shouldExcludeUser(userId) && !processedUserIds.has(userId)) {
      recipients.push({
        userId,
        isPersonal: true,
        role: 'gestionnaire'
      })
      processedUserIds.add(userId)
    }
  })

  // 2. Ajouter les prestataires directement assignés (PERSONNELLE)
  intervention.interventionAssignedProviders.forEach(userId => {
    if (!shouldExcludeUser(userId) && !processedUserIds.has(userId)) {
      recipients.push({
        userId,
        isPersonal: true,
        role: 'prestataire'
      })
      processedUserIds.add(userId)
    }
  })

  // 3. Ajouter les locataires directement assignés (PERSONNELLE)
  intervention.interventionAssignedTenants.forEach(userId => {
    if (!shouldExcludeUser(userId) && !processedUserIds.has(userId)) {
      recipients.push({
        userId,
        isPersonal: true,
        role: 'locataire'
      })
      processedUserIds.add(userId)
    }
  })

  // 4. Ajouter les gestionnaires de l'équipe non encore inclus (D'ÉQUIPE)
  intervention.teamMembers
    .filter(member =>
      member.role === 'gestionnaire' &&
      !shouldExcludeUser(member.id) &&
      !processedUserIds.has(member.id)
    )
    .forEach(manager => {
      recipients.push({
        userId: manager.id,
        isPersonal: false,
        role: 'gestionnaire'
      })
      processedUserIds.add(manager.id)
    })

  // ══════════════════════════════════════════════════════════════
  // PHASE DE FILTRAGE
  // ══════════════════════════════════════════════════════════════

  // 5. Appliquer excludeNonPersonal si demandé
  if (excludeNonPersonal) {
    recipients = recipients.filter(r => r.isPersonal)
  }

  // 6. Appliquer excludeRoles si défini
  if (excludeRoles && excludeRoles.length > 0) {
    recipients = recipients.filter(r => !excludeRoles.includes(r.role))
  }

  // 7. Appliquer onlyRoles si défini (mutuellement exclusif avec excludeRoles)
  if (onlyRoles && onlyRoles.length > 0 && (!excludeRoles || excludeRoles.length === 0)) {
    recipients = recipients.filter(r => onlyRoles.includes(r.role))
  }

  return recipients
}

/**
 * Détermine les destinataires pour un changement de statut d'intervention
 *
 * Utilise la même logique que determineInterventionRecipients()
 * mais permet des options de filtrage spécifiques au changement de statut.
 *
 * @param intervention - Intervention enrichie avec managers et assignations
 * @param options - Options de filtrage
 * @returns Liste de recipients avec flag isPersonal et role
 */
export function determineInterventionStatusChangeRecipients(
  intervention: InterventionWithManagers,
  options: RecipientFilterOptions = {}
): NotificationRecipient[] {
  // Pour un changement de statut, les destinataires sont les mêmes que pour la création
  return determineInterventionRecipients(intervention, options)
}

// ══════════════════════════════════════════════════════════════
// BUILDING RECIPIENTS
// ══════════════════════════════════════════════════════════════

/**
 * Détermine les destinataires pour une notification de bâtiment
 *
 * Logique métier:
 * - Tous les gestionnaires d'équipe (sauf excludeUserId)
 * - Ceux assignés au bâtiment reçoivent notification PERSONNELLE
 * - Les autres gestionnaires reçoivent notification D'ÉQUIPE
 *
 * @param building - Bâtiment enrichi avec managers
 * @param excludeUserId - ID de l'utilisateur à exclure
 * @returns Liste de recipients avec flag isPersonal
 */
export function determineBuildingRecipients(
  building: BuildingWithManagers,
  excludeUserId: string
): NotificationRecipient[] {
  const directResponsibles = new Set(
    building.buildingManagers.filter(id => id !== excludeUserId)
  )

  const allManagers = building.teamMembers
    .filter(member => member.role === 'gestionnaire' && member.id !== excludeUserId)

  return allManagers.map(manager => ({
    userId: manager.id,
    isPersonal: directResponsibles.has(manager.id),
    role: 'gestionnaire' as const
  }))
}

// ══════════════════════════════════════════════════════════════
// LOT RECIPIENTS
// ══════════════════════════════════════════════════════════════

/**
 * Détermine les destinataires pour une notification de lot
 *
 * Logique métier:
 * - Tous les gestionnaires d'équipe (sauf excludeUserId)
 * - Ceux assignés au lot OU au bâtiment parent reçoivent notification PERSONNELLE
 * - Les autres gestionnaires reçoivent notification D'ÉQUIPE
 *
 * @param lot - Lot enrichi avec managers
 * @param excludeUserId - ID de l'utilisateur à exclure
 * @returns Liste de recipients avec flag isPersonal
 */
export function determineLotRecipients(
  lot: LotWithManagers,
  excludeUserId: string
): NotificationRecipient[] {
  const directResponsibles = new Set<string>()

  lot.lotManagers.forEach(id => {
    if (id !== excludeUserId) directResponsibles.add(id)
  })

  lot.buildingManagers.forEach(id => {
    if (id !== excludeUserId) directResponsibles.add(id)
  })

  const allManagers = lot.teamMembers
    .filter(member => member.role === 'gestionnaire' && member.id !== excludeUserId)

  return allManagers.map(manager => ({
    userId: manager.id,
    isPersonal: directResponsibles.has(manager.id),
    role: 'gestionnaire' as const
  }))
}

// ══════════════════════════════════════════════════════════════
// CONTACT RECIPIENTS
// ══════════════════════════════════════════════════════════════

/**
 * Détermine les destinataires pour une notification de contact
 *
 * Logique métier:
 * - Tous les gestionnaires d'équipe (sauf excludeUserId)
 * - Ceux assignés aux bâtiments liés au contact reçoivent notification PERSONNELLE
 * - Les autres gestionnaires reçoivent notification D'ÉQUIPE
 *
 * @param contact - Contact enrichi avec managers
 * @param excludeUserId - ID de l'utilisateur à exclure
 * @returns Liste de recipients avec flag isPersonal
 */
export function determineContactRecipients(
  contact: ContactWithManagers,
  excludeUserId: string
): NotificationRecipient[] {
  const directResponsibles = new Set(
    contact.relatedBuildingManagers.filter(id => id !== excludeUserId)
  )

  const allManagers = contact.teamMembers
    .filter(member => member.role === 'gestionnaire' && member.id !== excludeUserId)

  return allManagers.map(manager => ({
    userId: manager.id,
    isPersonal: directResponsibles.has(manager.id),
    role: 'gestionnaire' as const
  }))
}

// ══════════════════════════════════════════════════════════════
// FORMATTING HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Formate le message pour une notification d'intervention
 *
 * @param intervention - Intervention enrichie
 * @param isPersonal - true = notification personnelle, false = notification d'équipe
 * @param action - Type d'action ('created' | 'status_change')
 * @returns Message formaté
 */
export function formatInterventionMessage(
  intervention: InterventionWithManagers,
  isPersonal: boolean,
  action: 'created' | 'status_change'
): string {
  const lotRef = intervention.lot?.reference ? ` pour ${intervention.lot.reference}` : ''

  if (action === 'created') {
    return isPersonal
      ? `Une nouvelle intervention "${intervention.title}"${lotRef} vous concerne directement`
      : `Une nouvelle intervention "${intervention.title}"${lotRef} a été créée`
  }

  return `L'intervention "${intervention.title}"${lotRef} a été mise à jour`
}

/**
 * Tronque un texte à une longueur maximale
 *
 * @param text - Texte à tronquer
 * @param maxLength - Longueur maximale
 * @returns Texte tronqué avec '...' si nécessaire
 */
export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}
