/**
 * Configuration des interventions standard liées à un bail
 *
 * Ces templates sont utilisés pour pré-remplir la modale de planification
 * d'interventions après la création d'un nouveau bail.
 *
 * Les types d'intervention utilisés correspondent aux codes existants
 * dans la table `intervention_types` (catégorie "bail").
 */

import { addMonths, addDays, format } from 'date-fns'
import type { ContractDocumentType, ChargesType } from '@/lib/types/contract.types'
import { CONTRACT_DOCUMENT_TYPE_LABELS } from '@/lib/types/contract.types'

/**
 * Configuration d'une intervention planifiée
 */
export interface LeaseInterventionTemplate {
  key: string
  /** Titre statique ou dynamique selon le type de charges */
  title: string | ((chargesType: ChargesType) => string)
  /** Description statique ou dynamique selon le type de charges */
  description: string | ((chargesType: ChargesType) => string)
  /** Code du type d'intervention (table intervention_types) */
  interventionTypeCode: string
  /** Icône Lucide pour l'affichage */
  icon: string
  /** Couleur de l'icône */
  colorClass: string
  /** Fonction pour calculer la date par défaut */
  calculateDefaultDate: (startDate: Date, endDate: Date) => Date
  /** Activé par défaut dans la modale */
  enabledByDefault: boolean
  /** Types de charges pour lesquels cette intervention s'applique (undefined = tous) */
  applicableChargesTypes?: ChargesType[]
}

/**
 * Résout un titre ou description qui peut être une fonction
 */
export function resolveTemplateText(
  text: string | ((chargesType: ChargesType) => string),
  chargesType: ChargesType
): string {
  return typeof text === 'function' ? text(chargesType) : text
}

/**
 * Interventions standard pour un bail
 */
export const LEASE_INTERVENTION_TEMPLATES: LeaseInterventionTemplate[] = [
  {
    key: 'entry_inspection',
    title: 'État des lieux d\'entrée',
    description: 'Inspection du logement à l\'entrée du locataire',
    interventionTypeCode: 'etat_des_lieux_entree',
    icon: 'ClipboardCheck',
    colorClass: 'text-emerald-500',
    calculateDefaultDate: (startDate) => startDate,
    enabledByDefault: true
  },
  {
    key: 'rent_indexation',
    title: 'Indexation du loyer',
    description: 'Révision annuelle du loyer selon l\'IRL',
    interventionTypeCode: 'revision_loyer',
    icon: 'TrendingUp',
    colorClass: 'text-green-600',
    calculateDefaultDate: (startDate) => addMonths(startDate, 12),
    enabledByDefault: true
  },
  {
    key: 'charges_indexation',
    title: (chargesType) => chargesType === 'forfaitaire'
      ? 'Indexation du forfait de charges'
      : 'Indexation de la provision de charges',
    description: (chargesType) => chargesType === 'forfaitaire'
      ? 'Révision annuelle du forfait selon l\'IRL'
      : 'Révision annuelle de la provision selon l\'IRL',
    interventionTypeCode: 'revision_charges',
    icon: 'TrendingUp',
    colorClass: 'text-emerald-600',
    calculateDefaultDate: (startDate) => addMonths(startDate, 12),
    enabledByDefault: true
    // Pas de applicableChargesTypes = s'applique aux deux types
  },
  {
    key: 'charges_regularization',
    title: 'Régularisation des charges',
    description: 'Décompte annuel des charges locatives vs provision versée',
    interventionTypeCode: 'regularisation_charges',
    icon: 'Calculator',
    colorClass: 'text-violet-500',
    calculateDefaultDate: (startDate) => addMonths(startDate, 12),
    enabledByDefault: true,
    applicableChargesTypes: ['provision'] // Uniquement pour provision
  },
  {
    key: 'insurance_reminder',
    title: 'Rappel assurance',
    description: 'Demande de renouvellement de l\'attestation d\'assurance',
    interventionTypeCode: 'assurance',
    icon: 'Shield',
    colorClass: 'text-blue-500',
    calculateDefaultDate: (startDate) => addMonths(startDate, 11),
    enabledByDefault: true
  },
  {
    key: 'exit_inspection',
    title: 'État des lieux de sortie',
    description: 'Inspection du logement avant fin de bail',
    interventionTypeCode: 'etat_des_lieux_sortie',
    icon: 'ClipboardX',
    colorClass: 'text-rose-500',
    calculateDefaultDate: (_, endDate) => addMonths(endDate, -1),
    enabledByDefault: true
  }
]

/**
 * Génère une intervention pour un document manquant
 */
export function createMissingDocumentIntervention(
  documentType: ContractDocumentType,
  index: number
): LeaseInterventionTemplate {
  const label = CONTRACT_DOCUMENT_TYPE_LABELS[documentType] || documentType

  return {
    key: `retrieve_document_${documentType}_${index}`,
    title: `Récupérer: ${label}`,
    description: `Document manquant lors de la création du bail`,
    interventionTypeCode: 'autre_administratif',
    icon: 'FileSearch',
    colorClass: 'text-amber-500',
    calculateDefaultDate: () => addDays(new Date(), 7),
    enabledByDefault: true
  }
}

/**
 * Template résolu avec titre et description en string (plus de fonctions)
 */
export interface ResolvedLeaseInterventionTemplate {
  key: string
  title: string
  description: string
  interventionTypeCode: string
  icon: string
  colorClass: string
  calculateDefaultDate: (startDate: Date, endDate: Date) => Date
  enabledByDefault: boolean
  defaultDate: Date
}

/**
 * Génère la liste complète des interventions pour un bail
 * incluant les documents manquants, filtrée selon le type de charges
 */
export function generateLeaseInterventions(
  startDate: Date,
  endDate: Date,
  chargesType: ChargesType = 'forfaitaire',
  missingDocuments: ContractDocumentType[] = []
): ResolvedLeaseInterventionTemplate[] {
  // Filtrer les interventions selon le type de charges
  const applicableTemplates = LEASE_INTERVENTION_TEMPLATES.filter(template => {
    if (!template.applicableChargesTypes) return true
    return template.applicableChargesTypes.includes(chargesType)
  })

  // Résoudre les titres/descriptions dynamiques
  const standardInterventions = applicableTemplates.map(template => ({
    ...template,
    title: resolveTemplateText(template.title, chargesType),
    description: resolveTemplateText(template.description, chargesType),
    defaultDate: template.calculateDefaultDate(startDate, endDate)
  }))

  // Interventions pour documents manquants
  const documentInterventions = missingDocuments.map((docType, index) => {
    const template = createMissingDocumentIntervention(docType, index)
    return {
      ...template,
      defaultDate: template.calculateDefaultDate(startDate, endDate)
    }
  })

  return [...standardInterventions, ...documentInterventions]
}

/**
 * Formate une date pour l'affichage
 */
export function formatInterventionDate(date: Date): string {
  return format(date, 'dd/MM/yyyy')
}
