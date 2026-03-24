/**
 * Configuration des interventions standard liées à un immeuble ou un lot
 *
 * Ces templates sont utilisés pour pré-remplir la planification
 * d'interventions après la création d'un bien immobilier.
 *
 * Les types d'intervention utilisés correspondent aux codes existants
 * dans la table `intervention_types` (catégorie "bien").
 *
 * Scheduling: basé sur la date d'expiration du document lié si renseignée,
 * sinon sur la date de création du bien.
 */

import { addMonths, addDays, format } from 'date-fns'
import { CUSTOM_DATE_VALUE } from '@/lib/constants/lease-interventions'
import type { SchedulingOption } from '@/lib/constants/lease-interventions'
import type { ScheduledInterventionData } from '@/components/contract/intervention-schedule-row'

// Re-export shared types for convenience
export { CUSTOM_DATE_VALUE }
export type { SchedulingOption }

/**
 * Entity type for property interventions
 */
export type PropertyEntityType = 'building' | 'lot' | 'lot_in_building'

/**
 * Configuration d'une intervention planifiée pour un bien
 */
export interface PropertyInterventionTemplate {
  key: string
  title: string
  description: string
  /** Code du type d'intervention (table intervention_types) */
  interventionTypeCode: string
  /** Icône Lucide pour l'affichage */
  icon: string
  /** Couleur de l'icône */
  colorClass: string
  /** Activé par défaut dans la modale */
  enabledByDefault: boolean
  /** Type de document lié (pour les dates dynamiques basées sur l'expiration) */
  linkedDocumentType?: string
  /**
   * Options de planification relatives à la date de création du bien.
   * Utilisées quand aucune date d'expiration de document n'est disponible.
   */
  schedulingOptions: SchedulingOption[]
  /** Valeur de l'option par défaut (sans document expiry) */
  defaultSchedulingOption: string
  /**
   * Options de planification relatives à la date d'expiration du document.
   * Générées dynamiquement quand le document lié a une date d'expiration.
   */
  expirySchedulingOptions?: Array<{
    value: string
    /** Label template — {date} sera remplacé par la date formatée */
    labelTemplate: string
    /** Nombre de jours/mois avant l'expiration */
    offsetMonths: number
  }>
  /** Distinguishes interventions (external parties) from reminders (internal tasks) */
  itemType?: 'intervention' | 'reminder'
}

// ─── BUILDING intervention templates ─────────────────────────────

export const BUILDING_INTERVENTION_TEMPLATES: PropertyInterventionTemplate[] = [
  {
    key: 'boiler_maintenance',
    title: 'Entretien chaudière',
    description: 'Entretien obligatoire — Gaz: tous les 2 ans / Mazout: annuel',
    interventionTypeCode: 'chauffage',
    icon: 'Flame',
    colorClass: 'text-orange-500',
    enabledByDefault: true,
    linkedDocumentType: 'entretien_chaudiere',
    schedulingOptions: [
      { value: 'creation_plus_24m', label: 'Dans 24 mois', calculateDate: (c) => addMonths(c, 24) },
      { value: 'creation_plus_12m', label: 'Dans 12 mois', calculateDate: (c) => addMonths(c, 12) }
    ],
    defaultSchedulingOption: 'creation_plus_24m',
    expirySchedulingOptions: [
      { value: 'expiry_minus_1m', labelTemplate: '1 mois avant expiration ({date})', offsetMonths: -1 },
      { value: 'expiry_minus_2m', labelTemplate: '2 mois avant expiration ({date})', offsetMonths: -2 }
    ]
  },
  {
    key: 'elevator_inspection',
    title: 'Contrôle ascenseur',
    description: 'Contrôle périodique obligatoire si ascenseur présent',
    interventionTypeCode: 'ascenseur',
    icon: 'ArrowUpDown',
    colorClass: 'text-zinc-500',
    enabledByDefault: true,
    linkedDocumentType: 'controle_ascenseur',
    schedulingOptions: [
      { value: 'creation_plus_12m', label: 'Dans 12 mois', calculateDate: (c) => addMonths(c, 12) },
      { value: 'creation_plus_6m', label: 'Dans 6 mois', calculateDate: (c) => addMonths(c, 6) }
    ],
    defaultSchedulingOption: 'creation_plus_12m',
    expirySchedulingOptions: [
      { value: 'expiry_minus_1m', labelTemplate: '1 mois avant expiration ({date})', offsetMonths: -1 },
      { value: 'expiry_minus_2m', labelTemplate: '2 mois avant expiration ({date})', offsetMonths: -2 }
    ]
  },
  {
    key: 'fire_safety_inspection',
    title: 'Contrôle sécurité incendie',
    description: 'Vérification alarmes, extincteurs, détecteurs de fumée',
    interventionTypeCode: 'securite_incendie',
    icon: 'Bell',
    colorClass: 'text-red-500',
    enabledByDefault: true,
    schedulingOptions: [
      { value: 'creation_plus_12m', label: 'Dans 12 mois', calculateDate: (c) => addMonths(c, 12) },
      { value: 'creation_plus_6m', label: 'Dans 6 mois', calculateDate: (c) => addMonths(c, 6) }
    ],
    defaultSchedulingOption: 'creation_plus_12m'
  },
  {
    key: 'peb_renewal',
    title: 'Renouvellement certificat PEB/EPC',
    description: 'Certificat de performance énergétique — validité 10 ans',
    interventionTypeCode: 'autre_technique',
    icon: 'Zap',
    colorClass: 'text-yellow-500',
    enabledByDefault: true,
    linkedDocumentType: 'certificat_peb',
    schedulingOptions: [
      { value: 'creation_plus_120m', label: 'Dans 10 ans', calculateDate: (c) => addMonths(c, 120) },
      { value: 'creation_plus_108m', label: 'Dans 9 ans', calculateDate: (c) => addMonths(c, 108) }
    ],
    defaultSchedulingOption: 'creation_plus_120m',
    expirySchedulingOptions: [
      { value: 'expiry_minus_3m', labelTemplate: '3 mois avant expiration ({date})', offsetMonths: -3 },
      { value: 'expiry_minus_6m', labelTemplate: '6 mois avant expiration ({date})', offsetMonths: -6 }
    ]
  },
  {
    key: 'common_areas_cleaning',
    title: 'Nettoyage parties communes',
    description: 'Entretien régulier des halls, escaliers, caves',
    interventionTypeCode: 'nettoyage',
    icon: 'Sparkles',
    colorClass: 'text-teal-500',
    enabledByDefault: false,
    schedulingOptions: [
      { value: 'creation_plus_1m', label: 'Dans 1 mois', calculateDate: (c) => addMonths(c, 1) },
      { value: 'creation_plus_7d', label: 'Dans 1 semaine', calculateDate: (c) => addDays(c, 7) }
    ],
    defaultSchedulingOption: 'creation_plus_1m'
  },
  {
    key: 'green_spaces_maintenance',
    title: 'Entretien espaces verts',
    description: 'Jardinage, taille, entretien des espaces extérieurs',
    interventionTypeCode: 'espaces_verts',
    icon: 'Trees',
    colorClass: 'text-green-500',
    enabledByDefault: false,
    schedulingOptions: [
      { value: 'creation_plus_3m', label: 'Dans 3 mois', calculateDate: (c) => addMonths(c, 3) },
      { value: 'creation_plus_1m', label: 'Dans 1 mois', calculateDate: (c) => addMonths(c, 1) }
    ],
    defaultSchedulingOption: 'creation_plus_3m'
  }
]

// ─── LOT intervention templates (standalone, without building) ────

export const LOT_INTERVENTION_TEMPLATES: PropertyInterventionTemplate[] = [
  {
    key: 'boiler_maintenance',
    title: 'Entretien chaudière',
    description: 'Entretien obligatoire — Gaz: tous les 2 ans / Mazout: annuel',
    interventionTypeCode: 'chauffage',
    icon: 'Flame',
    colorClass: 'text-orange-500',
    enabledByDefault: true,
    linkedDocumentType: 'entretien_chaudiere',
    schedulingOptions: [
      { value: 'creation_plus_24m', label: 'Dans 24 mois', calculateDate: (c) => addMonths(c, 24) },
      { value: 'creation_plus_12m', label: 'Dans 12 mois', calculateDate: (c) => addMonths(c, 12) }
    ],
    defaultSchedulingOption: 'creation_plus_24m',
    expirySchedulingOptions: [
      { value: 'expiry_minus_1m', labelTemplate: '1 mois avant expiration ({date})', offsetMonths: -1 },
      { value: 'expiry_minus_2m', labelTemplate: '2 mois avant expiration ({date})', offsetMonths: -2 }
    ]
  },
  {
    key: 'peb_renewal',
    title: 'Renouvellement certificat PEB/EPC',
    description: 'Certificat de performance énergétique — validité 10 ans',
    interventionTypeCode: 'autre_technique',
    icon: 'Zap',
    colorClass: 'text-yellow-500',
    enabledByDefault: true,
    linkedDocumentType: 'certificat_peb',
    schedulingOptions: [
      { value: 'creation_plus_120m', label: 'Dans 10 ans', calculateDate: (c) => addMonths(c, 120) },
      { value: 'creation_plus_108m', label: 'Dans 9 ans', calculateDate: (c) => addMonths(c, 108) }
    ],
    defaultSchedulingOption: 'creation_plus_120m',
    expirySchedulingOptions: [
      { value: 'expiry_minus_3m', labelTemplate: '3 mois avant expiration ({date})', offsetMonths: -3 },
      { value: 'expiry_minus_6m', labelTemplate: '6 mois avant expiration ({date})', offsetMonths: -6 }
    ]
  }
]

// ─── LOT in building: lot-specific interventions (PEB is per-lot in Belgium) ─

export const LOT_IN_BUILDING_INTERVENTION_TEMPLATES: PropertyInterventionTemplate[] = [
  {
    key: 'peb_renewal',
    title: 'Renouvellement certificat PEB/EPC',
    description: 'Certificat de performance énergétique — validité 10 ans',
    interventionTypeCode: 'autre_technique',
    icon: 'Zap',
    colorClass: 'text-yellow-500',
    enabledByDefault: true,
    linkedDocumentType: 'certificat_peb',
    schedulingOptions: [
      { value: 'creation_plus_120m', label: 'Dans 10 ans', calculateDate: (c) => addMonths(c, 120) },
      { value: 'creation_plus_108m', label: 'Dans 9 ans', calculateDate: (c) => addMonths(c, 108) }
    ],
    defaultSchedulingOption: 'creation_plus_120m',
    expirySchedulingOptions: [
      { value: 'expiry_minus_3m', labelTemplate: '3 mois avant expiration ({date})', offsetMonths: -3 },
      { value: 'expiry_minus_6m', labelTemplate: '6 mois avant expiration ({date})', offsetMonths: -6 }
    ]
  }
]

// ─── Missing document intervention generator ──────────────────────

/** Labels for property document types (used for missing document interventions) */
const PROPERTY_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  certificat_peb: 'Certificat PEB/EPC',
  entretien_chaudiere: 'Entretien chaudière',
  controle_ascenseur: 'Contrôle ascenseur',
  etat_des_lieux: 'État des lieux',
  autre: 'Autre document'
}

/**
 * Génère une intervention pour un document de bien manquant
 */
export function createMissingPropertyDocumentIntervention(
  documentType: string,
  index: number
): PropertyInterventionTemplate {
  const label = PROPERTY_DOCUMENT_TYPE_LABELS[documentType] || documentType

  return {
    key: `retrieve_document_${documentType}_${index}`,
    title: `Récupérer: ${label}`,
    description: 'Document manquant lors de la création du bien',
    interventionTypeCode: 'autre_administratif',
    icon: 'FileSearch',
    colorClass: 'text-amber-500',
    enabledByDefault: true,
    schedulingOptions: [
      { value: 'now_plus_7d', label: 'Dans 7 jours', calculateDate: () => addDays(new Date(), 7) },
      { value: 'now_plus_14d', label: 'Dans 14 jours', calculateDate: () => addDays(new Date(), 14) },
      { value: 'now_plus_1m', label: 'Dans 1 mois', calculateDate: () => addMonths(new Date(), 1) }
    ],
    defaultSchedulingOption: 'now_plus_7d',
    itemType: 'reminder'
  }
}

// ─── Helper: Get templates by entity type ─────────────────────────

export function getTemplatesForEntityType(entityType: PropertyEntityType): PropertyInterventionTemplate[] {
  switch (entityType) {
    case 'building': return BUILDING_INTERVENTION_TEMPLATES
    case 'lot': return LOT_INTERVENTION_TEMPLATES
    case 'lot_in_building': return LOT_IN_BUILDING_INTERVENTION_TEMPLATES
  }
}

// ─── Helper: Resolve dynamic scheduling options ───────────────────

/**
 * Résout les options de planification pour un template en tenant compte
 * de la date d'expiration du document lié.
 *
 * Si le document a une date d'expiration, les options "avant expiration"
 * sont ajoutées en priorité et deviennent le défaut.
 */
export function resolveSchedulingOptions(
  template: PropertyInterventionTemplate,
  documentExpiryDates: Record<string, string>
): {
  options: SchedulingOption[]
  defaultOption: string
  defaultDate: Date
} {
  const creationDate = new Date()
  let options = [...template.schedulingOptions]
  let defaultOption = template.defaultSchedulingOption

  // If template has a linked document with an expiry date, add dynamic options
  if (template.linkedDocumentType && template.expirySchedulingOptions) {
    const expiryDateStr = documentExpiryDates[template.linkedDocumentType]
    if (expiryDateStr) {
      const expiryDate = new Date(expiryDateStr)
      const formattedExpiry = format(expiryDate, 'dd/MM/yyyy')

      const dynamicOptions: SchedulingOption[] = template.expirySchedulingOptions.map(opt => ({
        value: opt.value,
        label: opt.labelTemplate.replace('{date}', formattedExpiry),
        calculateDate: () => addMonths(expiryDate, opt.offsetMonths)
      }))

      // Prepend dynamic options (they take priority)
      options = [...dynamicOptions, ...options]
      // Use the first expiry option as default
      defaultOption = dynamicOptions[0].value
    }
  }

  // Calculate default date
  const selectedOption = options.find(o => o.value === defaultOption)
  const defaultDate = selectedOption
    ? selectedOption.calculateDate(creationDate, creationDate)
    : creationDate

  return { options, defaultOption, defaultDate }
}

// ─── Main generator function ──────────────────────────────────────

/**
 * Génère la liste complète des interventions pour un bien immobilier
 * incluant les documents manquants.
 *
 * @param entityType - Type d'entité (building, lot, lot_in_building)
 * @param documentExpiryDates - Map des dates d'expiration par type de document (ISO strings)
 * @param missingDocuments - Types de documents recommandés manquants
 */
export function generatePropertyInterventions(
  entityType: PropertyEntityType,
  documentExpiryDates: Record<string, string> = {},
  missingDocuments: string[] = []
): Array<{
  template: PropertyInterventionTemplate
  options: SchedulingOption[]
  defaultOption: string
  defaultDate: Date
}> {
  const templates = getTemplatesForEntityType(entityType)

  // Standard interventions with resolved scheduling
  const standardInterventions = templates.map(template => ({
    template,
    ...resolveSchedulingOptions(template, documentExpiryDates)
  }))

  // Missing document interventions
  const documentInterventions = missingDocuments.map((docType, index) => {
    const template = createMissingPropertyDocumentIntervention(docType, index)
    return {
      template,
      ...resolveSchedulingOptions(template, {})
    }
  })

  return [...standardInterventions, ...documentInterventions]
}

/**
 * Formate une date pour l'affichage
 */
export function formatPropertyInterventionDate(date: Date): string {
  return format(date, 'dd/MM/yyyy')
}

// ─── Custom intervention support ────────────────────────────────

/** Default scheduling options for custom interventions */
export const CUSTOM_INTERVENTION_SCHEDULING_OPTIONS: SchedulingOption[] = [
  { value: 'now_plus_7d', label: 'Dans 7 jours', calculateDate: () => addDays(new Date(), 7) },
  { value: 'now_plus_14d', label: 'Dans 14 jours', calculateDate: () => addDays(new Date(), 14) },
  { value: 'now_plus_1m', label: 'Dans 1 mois', calculateDate: () => addMonths(new Date(), 1) }
]

/** Create an empty custom intervention for user to fill in */
export function createEmptyCustomIntervention(
  currentUser?: { id: string; name: string }
): ScheduledInterventionData {
  return {
    key: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    description: '',
    interventionTypeCode: 'autre',
    icon: 'PenLine',
    colorClass: 'text-indigo-500',
    enabled: true,
    scheduledDate: addDays(new Date(), 7),
    isAutoCalculated: true,
    availableOptions: CUSTOM_INTERVENTION_SCHEDULING_OPTIONS,
    selectedSchedulingOption: 'now_plus_7d',
    assignedUsers: currentUser
      ? [{ userId: currentUser.id, role: 'gestionnaire' as const, name: currentUser.name }]
      : []
  }
}
