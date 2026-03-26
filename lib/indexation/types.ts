/**
 * Types for Belgian rent indexation calculation
 *
 * Covers 3 regions (Brussels, Wallonia, Flanders) with PEB/EPC corrections.
 * All calculations are deterministic and client-side.
 */

export type Region = 'bruxelles' | 'wallonie' | 'flandre'

export type PebLabel =
  | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  | 'inconnu'

export type BailType = 'habitation' | 'commercial'

export interface IndexationInput {
  /** Type de bail */
  bailType: BailType
  /** Région du bien */
  region: Region
  /** Certificat PEB/EPC (null for commercial) */
  peb: PebLabel | null
  /** Loyer de base mensuel en euros (hors charges) */
  loyerBase: number
  /** Date de signature du bail */
  dateSignature: Date
  /** Date de début du bail */
  dateDebut: Date
  /** Le bail est-il non enregistré ? */
  bailNonEnregistre: boolean
}

export interface IndexationResult {
  /** Nouveau loyer calculé (arrondi au centime) */
  nouveauLoyer: number
  /** Pourcentage d'augmentation */
  pourcentage: number
  /** Formule lisible (ex: "(850 × 128.94) / 113.12") */
  formule: string
  /** Indice santé de départ */
  indiceDepart: { value: number; mois: string }
  /** Nouvel indice santé */
  nouvelIndice: { value: number; mois: string }
  /** Détails de la correction PEB appliquée */
  correctionPEB: PebCorrection
  /** Base légale applicable */
  baseLegale: string
}

export interface PebCorrection {
  /** Type de correction appliquée */
  type: 'aucune' | 'facteur_correctif' | 'loyer_adapte' | 'bloquee'
  /** Facteur multiplicatif (1.0 = pas de correction) */
  facteur: number
  /** Explication en français */
  explication: string
}

export interface IndexationError {
  type: 'bail_non_enregistre' | 'indice_manquant' | 'date_invalide'
  message: string
  region?: Region
}

export type IndexationOutcome =
  | { success: true; result: IndexationResult }
  | { success: false; error: IndexationError }
