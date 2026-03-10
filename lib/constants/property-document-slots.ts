/**
 * Document slot configurations for lots and buildings
 *
 * Based on Belgian residential rental regulations:
 * - Wallonia, Brussels-Capital, Flanders
 * - Mandatory and optional documents with validity periods
 */

import type { GenericDocumentSlotConfig } from '@/components/documents/types'

// ─── LOT (unit) document slots ────────────────────────────────

export const LOT_DOCUMENT_SLOTS: GenericDocumentSlotConfig[] = [
  {
    type: 'certificat_peb',
    label: 'Certificat PEB/EPC',
    recommended: true,
    allowMultiple: true,
    hint: 'Certificat de performance énergétique (obligatoire)',
    icon: 'Zap',
    hasExpiry: true,
    defaultValidityYears: 10
  },
  {
    type: 'entretien_chaudiere',
    label: 'Entretien chaudière',
    recommended: true,
    allowMultiple: true,
    hint: 'Gaz: tous les 2 ans / Mazout: annuel',
    icon: 'Thermometer',
    hasExpiry: true,
    defaultValidityYears: 2
  },
  {
    type: 'etat_des_lieux',
    label: 'État des lieux',
    recommended: true,
    allowMultiple: true,
    hint: 'État des lieux d\'entrée ou de sortie',
    icon: 'ClipboardList',
    hasExpiry: false
  },
  {
    type: 'autre',
    label: 'Autres documents',
    recommended: false,
    allowMultiple: true,
    hint: 'Tout autre document utile',
    icon: 'File',
    hasExpiry: false
  }
]

// ─── LOT within a BUILDING — no boiler (managed at building level) ───

export const LOT_IN_BUILDING_DOCUMENT_SLOTS: GenericDocumentSlotConfig[] =
  LOT_DOCUMENT_SLOTS.filter(s => s.type !== 'entretien_chaudiere')

// ─── BUILDING (immeuble) document slots ───────────────────────

export const BUILDING_DOCUMENT_SLOTS: GenericDocumentSlotConfig[] = [
  {
    type: 'certificat_peb',
    label: 'Certificat PEB/EPC',
    recommended: true,
    allowMultiple: true,
    hint: 'Certificat de performance énergétique du bâtiment',
    icon: 'Zap',
    hasExpiry: true,
    defaultValidityYears: 10
  },
  {
    type: 'entretien_chaudiere',
    label: 'Entretien chaudière',
    recommended: true,
    allowMultiple: true,
    hint: 'Gaz: tous les 2 ans / Mazout: annuel',
    icon: 'Thermometer',
    hasExpiry: true,
    defaultValidityYears: 2
  },
  {
    type: 'controle_ascenseur',
    label: 'Contrôle ascenseur',
    recommended: true,
    allowMultiple: true,
    hint: 'Si ascenseur présent — contrôle périodique obligatoire',
    icon: 'ArrowUpDown',
    hasExpiry: true,
    defaultValidityYears: 1
  },
  {
    type: 'autre',
    label: 'Autres documents',
    recommended: false,
    allowMultiple: true,
    hint: 'Tout autre document utile',
    icon: 'File',
    hasExpiry: false
  }
]

// ─── Validity duration presets ─────────────────────────────────

export const VALIDITY_DURATION_OPTIONS = [
  { value: 12,  label: '1 an' },
  { value: 24,  label: '2 ans' },
  { value: 36,  label: '3 ans' },
  { value: 60,  label: '5 ans' },
  { value: 120, label: '10 ans' },
  { value: -1,  label: 'Personnalisé' },
] as const

/**
 * Compute expiry date from document date + validity duration.
 * Returns ISO date string (YYYY-MM-DD) or undefined.
 */
export const computeExpiryDate = (
  documentDate?: string,
  validityDuration?: number,
  customExpiry?: string
): string | undefined => {
  // Custom expiry takes precedence
  if (validityDuration === -1 && customExpiry) return customExpiry
  if (!documentDate || !validityDuration || validityDuration <= 0) return undefined

  const date = new Date(documentDate)
  date.setMonth(date.getMonth() + validityDuration)
  return date.toISOString().split('T')[0]
}

// ─── Helpers ──────────────────────────────────────────────────

export const LOT_RECOMMENDED_TYPES = LOT_DOCUMENT_SLOTS
  .filter(s => s.recommended)
  .map(s => s.type)

export const BUILDING_RECOMMENDED_TYPES = BUILDING_DOCUMENT_SLOTS
  .filter(s => s.recommended)
  .map(s => s.type)
