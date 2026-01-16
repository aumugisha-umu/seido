/**
 * Configuration des slots de documents pour la checklist de bail
 *
 * Chaque slot représente un type de document avec ses propriétés :
 * - type: Le type de document dans la DB (ContractDocumentType)
 * - label: Le libellé affiché à l'utilisateur
 * - recommended: Indique si le document est recommandé (badge visuel)
 * - allowMultiple: Permet plusieurs fichiers (ex: plusieurs CNI)
 * - hint: Texte d'aide optionnel
 * - icon: Nom de l'icône Lucide à afficher
 */

import type { ContractDocumentType } from '@/lib/types/contract.types'

export interface DocumentSlotConfig {
  type: ContractDocumentType
  label: string
  recommended: boolean
  allowMultiple: boolean
  hint?: string
  icon: string
}

/**
 * Slots de documents pour la création d'un bail
 * Ordre: Documents recommandés en premier, puis optionnels
 */
export const LEASE_DOCUMENT_SLOTS: DocumentSlotConfig[] = [
  // Documents recommandés
  {
    type: 'bail',
    label: 'Bail signé',
    recommended: true,
    allowMultiple: true,
    hint: 'Contrat de location signé par toutes les parties',
    icon: 'FileSignature'
  },
  {
    type: 'attestation_assurance',
    label: 'Attestation d\'assurance',
    recommended: true,
    allowMultiple: true,
    hint: 'Assurance habitation du locataire',
    icon: 'Shield'
  },
  {
    type: 'justificatif_identite',
    label: 'Justificatifs d\'identité',
    recommended: true,
    allowMultiple: true,
    hint: 'Carte d\'identité ou passeport (un par occupant)',
    icon: 'IdCard'
  },

  // Documents optionnels
  {
    type: 'etat_des_lieux_entree',
    label: 'État des lieux d\'entrée',
    recommended: false,
    allowMultiple: true,
    hint: 'Peut être ajouté après l\'entrée dans les lieux',
    icon: 'ClipboardCheck'
  },
  {
    type: 'diagnostic',
    label: 'Diagnostics (PEB, DPE...)',
    recommended: false,
    allowMultiple: true,
    hint: 'Certificat PEB, diagnostic plomb, amiante, etc.',
    icon: 'FileBarChart'
  },
  {
    type: 'justificatif_revenus',
    label: 'Justificatifs de revenus',
    recommended: false,
    allowMultiple: true,
    hint: 'Fiches de paie, avis d\'imposition',
    icon: 'Receipt'
  },
  {
    type: 'autre',
    label: 'Autres documents',
    recommended: false,
    allowMultiple: true,
    hint: 'Tout autre document utile',
    icon: 'File'
  }
]

/**
 * Types de documents considérés comme "recommandés"
 * Utilisé pour identifier les documents manquants dans la modale
 */
export const RECOMMENDED_DOCUMENT_TYPES: ContractDocumentType[] =
  LEASE_DOCUMENT_SLOTS
    .filter(slot => slot.recommended)
    .map(slot => slot.type)

/**
 * Récupère la configuration d'un slot par son type
 */
export function getSlotConfig(type: ContractDocumentType): DocumentSlotConfig | undefined {
  return LEASE_DOCUMENT_SLOTS.find(slot => slot.type === type)
}

/**
 * Récupère le label d'un type de document
 */
export function getDocumentLabel(type: ContractDocumentType): string {
  const slot = getSlotConfig(type)
  return slot?.label ?? type
}
