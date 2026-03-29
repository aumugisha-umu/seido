/**
 * Belgian Rent Indexation Calculator
 *
 * Deterministic, client-side calculation engine.
 * Covers Brussels, Wallonia, Flanders + commercial leases.
 * PEB/EPC corrections per region-specific legislation.
 *
 * Legal references:
 * - Brussels: Code bruxellois du Logement, art. 224 (Ordonnance 14/10/2022)
 * - Wallonia: Décret wallon 15/03/2018, art. 26 (modifié 19/10/2022)
 * - Flanders: Vlaams Woninghuurdecreet, art. 34 (Decreet 10/03/2023)
 * - Commercial: Code civil, Article 1728bis
 */

import type {
  IndexationInput,
  IndexationOutcome,
  IndexationResult,
  PebCorrection,
  PebLabel,
  Region,
} from './types'
import healthIndices from './health-indices.json'

// ---------------------------------------------------------------------------
// Index lookup
// ---------------------------------------------------------------------------

const indices = healthIndices as Record<string, number>

/** Format a Date to YYYY-MM key */
function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Get the index for the month preceding the given date */
function getIndicePrecedent(date: Date): { value: number; mois: string } | null {
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  const key = toKey(prev)
  const value = indices[key]
  if (value === undefined) return null
  return { value, mois: key }
}

/** Get the index for a specific YYYY-MM key */
function getIndice(key: string): number | null {
  return indices[key] ?? null
}

/** Get the latest available index */
function getLatestIndice(): { value: number; mois: string } | null {
  const keys = Object.keys(indices).sort()
  const last = keys[keys.length - 1]
  if (!last) return null
  return { value: indices[last], mois: last }
}

// ---------------------------------------------------------------------------
// Anniversary month calculation
// ---------------------------------------------------------------------------

/** Get the anniversary month (1-based) from the lease start date */
function getAnniversaryMonth(dateDebut: Date): number {
  return dateDebut.getMonth() + 1 // 1=Jan, 12=Dec
}

/** Get the day of month for anniversary split (Oct 14 split for Brussels) */
function getAnniversaryDay(dateDebut: Date): number {
  return dateDebut.getDate()
}

// ---------------------------------------------------------------------------
// Brussels PEB correction factors
// ---------------------------------------------------------------------------

// Factors indexed by month (1-12), with Oct split at day 14
const BRUXELLES_FACTORS_E: Record<string, number> = {
  'oct_14_31': 0.949447646,
  'nov': 0.945356473,
  'dec': 0.951977401,
  'jan': 0.951950895,
  'feb': 0.961757813,
  'mar': 0.967996216,
  'apr': 0.965766823,
  'may': 0.971941594,
  'jun': 0.972124068,
  'jul': 0.976119286,
  'aug': 0.977109655,
  'sep': 0.980049682,
  'oct_1_13': 0.989805521,
}

const BRUXELLES_FACTORS_FG: Record<string, number> = {
  'oct_14_31': 0.898895293,
  'nov': 0.890712946,
  'dec': 0.903954802,
  'jan': 0.903901791,
  'feb': 0.923515625,
  'mar': 0.935992433,
  'apr': 0.931533646,
  'may': 0.943883189,
  'jun': 0.944248135,
  'jul': 0.952238571,
  'aug': 0.954219311,
  'sep': 0.960099363,
  'oct_1_13': 0.979611041,
}

const MONTH_KEYS = [
  '', 'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
]

function getBruxellesFactorKey(month: number, day: number): string {
  if (month === 10) {
    return day >= 14 ? 'oct_14_31' : 'oct_1_13'
  }
  return MONTH_KEYS[month]
}

function getBruxellesCorrection(
  peb: PebLabel,
  dateSignature: Date,
  dateDebut: Date,
): PebCorrection {
  // Conditions: bail signé AVANT 14 oct 2022 + PEB E, F, or G
  const cutoff = new Date(2022, 9, 14) // Oct 14, 2022
  if (dateSignature >= cutoff) {
    return { type: 'aucune', facteur: 1, explication: 'Bail signé après le 14 octobre 2022 — pas de facteur correctif.' }
  }

  if (['A+', 'A', 'B', 'C', 'D'].includes(peb)) {
    return { type: 'aucune', facteur: 1, explication: `PEB ${peb} — indexation complète (100%).` }
  }

  const month = getAnniversaryMonth(dateDebut)
  const day = getAnniversaryDay(dateDebut)
  const key = getBruxellesFactorKey(month, day)

  if (peb === 'E') {
    const facteur = BRUXELLES_FACTORS_E[key] ?? 1
    return {
      type: 'facteur_correctif',
      facteur,
      explication: `PEB E à Bruxelles — facteur correctif de ${facteur.toFixed(6)} appliqué (Ordonnance du 14 octobre 2022).`,
    }
  }

  // F or G
  const facteur = BRUXELLES_FACTORS_FG[key] ?? 1
  return {
    type: 'facteur_correctif',
    facteur,
    explication: `PEB ${peb} à Bruxelles — facteur correctif de ${facteur.toFixed(6)} appliqué (Ordonnance du 14 octobre 2022).`,
  }
}

// ---------------------------------------------------------------------------
// Wallonia PEB correction (loyer adapté)
// ---------------------------------------------------------------------------

/** Wallonia restriction percentages during Phase 1 (Nov 2022 - Oct 2023) */
const WALLONIE_RESTRICTION: Record<string, number> = {
  'A+': 1, 'A': 1, 'B': 1, 'C': 1,
  'D': 0.75,
  'E': 0.50,
  'F': 0, 'G': 0,
  'inconnu': 0,
}

function getWallonieCorrection(
  peb: PebLabel,
  dateDebut: Date,
): PebCorrection {
  if (['A+', 'A', 'B', 'C'].includes(peb)) {
    return { type: 'aucune', facteur: 1, explication: `PEB ${peb} — indexation complète, aucune restriction.` }
  }

  const restriction = WALLONIE_RESTRICTION[peb] ?? 0

  if (restriction === 0) {
    return {
      type: 'bloquee',
      facteur: 0,
      explication: `PEB ${peb} en Wallonie — indexation bloquée pendant la phase de restriction (1 nov. 2022 - 31 oct. 2023). Le loyer de base adapté est utilisé depuis le 1 nov. 2023.`,
    }
  }

  // PEB D or E: partial indexation
  const pct = Math.round(restriction * 100)
  return {
    type: 'loyer_adapte',
    facteur: restriction,
    explication: `PEB ${peb} en Wallonie — seuls ${pct}% de la hausse étaient autorisés pendant la phase de restriction. Le loyer de base adapté est utilisé depuis le 1 nov. 2023.`,
  }
}

/**
 * Calculate Wallonia's "loyer adapté" for the reset phase (since Nov 2023).
 * Returns null if the anniversary fell outside the restriction period.
 */
function calculateWallonieLoyer(
  loyerBase: number,
  peb: PebLabel,
  dateDebut: Date,
  indiceDepart: number,
): { loyerAdapte: number; indiceAdapte: number } | null {
  const restriction = WALLONIE_RESTRICTION[peb]
  if (restriction === undefined || restriction === 1) return null

  // Find anniversary that fell during restriction (Nov 2022 - Oct 2023)
  const anniversaryMonth = dateDebut.getMonth() // 0-based
  let anniversaryYear: number

  // Determine which year's anniversary fell in the restriction period
  if (anniversaryMonth >= 10) { // Nov or Dec
    anniversaryYear = 2022
  } else { // Jan-Oct
    anniversaryYear = 2023
  }

  const anniversaryDate = new Date(anniversaryYear, anniversaryMonth, 1)
  const restrictionStart = new Date(2022, 10, 1) // Nov 1, 2022
  const restrictionEnd = new Date(2023, 9, 31) // Oct 31, 2023

  if (anniversaryDate < restrictionStart || anniversaryDate > restrictionEnd) {
    return null
  }

  // Get the index for the month preceding the anniversary during restriction
  const indiceAdapteData = getIndicePrecedent(anniversaryDate)
  if (!indiceAdapteData) return null

  // Calculate what the fully indexed rent would have been
  const loyerIndexeComplet = (loyerBase * indiceAdapteData.value) / indiceDepart

  if (restriction === 0) {
    // Blocked: rent stays at base
    return { loyerAdapte: loyerBase, indiceAdapte: indiceAdapteData.value }
  }

  // Partial: only X% of the increase is allowed
  const hausse = loyerIndexeComplet - loyerBase
  const loyerAdapte = loyerBase + hausse * restriction

  return { loyerAdapte, indiceAdapte: indiceAdapteData.value }
}

// ---------------------------------------------------------------------------
// Flanders EPC correction factor (permanent)
// ---------------------------------------------------------------------------

function getFlandreCorrection(
  peb: PebLabel,
  dateDebut: Date,
): PebCorrection {
  // Conditions: bail started BEFORE Oct 1, 2022 + EPC D, E, F, or absent
  const cutoff = new Date(2022, 9, 1) // Oct 1, 2022
  if (dateDebut >= cutoff) {
    return { type: 'aucune', facteur: 1, explication: 'Bail débuté après le 1 octobre 2022 — pas de facteur correctif.' }
  }

  if (['A+', 'A', 'B', 'C'].includes(peb)) {
    return { type: 'aucune', facteur: 1, explication: `EPC ${peb} — indexation complète.` }
  }

  // No G label in Flanders
  const month = getAnniversaryMonth(dateDebut)
  const isJanSep = month >= 1 && month <= 9

  // Get reference indices for the anniversary month
  const anniversaryMonthKey = String(month).padStart(2, '0')
  const indice2021Key = `2021-${anniversaryMonthKey}`
  const indice2022Key = `2022-${anniversaryMonthKey}`
  const indice2023Key = `2023-${anniversaryMonthKey}`

  // We need month preceding anniversary, so get the previous month's index
  const prevMonth = month === 1 ? 12 : month - 1
  const prevMonthKey = String(prevMonth).padStart(2, '0')
  const prevYear2021 = month === 1 ? 2020 : 2021
  const prevYear2022 = month === 1 ? 2021 : 2022
  const prevYear2023 = month === 1 ? 2022 : 2023

  const i2021 = getIndice(`${prevYear2021}-${prevMonthKey}`)
  const i2022 = getIndice(`${prevYear2022}-${prevMonthKey}`)
  const i2023 = getIndice(`${prevYear2023}-${prevMonthKey}`)

  if (i2021 === null || i2022 === null || i2023 === null) {
    return { type: 'aucune', facteur: 1, explication: 'Indices de référence indisponibles pour le calcul du facteur correctif flamand.' }
  }

  let facteur: number

  if (peb === 'D') {
    // EPC D: CF = 0.50 × (indice_prev + indice_curr) / indice_curr
    if (isJanSep) {
      facteur = 0.50 * (i2022 + i2023) / i2023
    } else {
      facteur = 0.50 * (i2021 + i2022) / i2022
    }
  } else {
    // EPC E, F, or absent (inconnu)
    if (isJanSep) {
      facteur = i2022 / i2023
    } else {
      facteur = i2021 / i2022
    }
  }

  return {
    type: 'facteur_correctif',
    facteur,
    explication: `EPC ${peb} en Flandre — facteur correctif permanent de ${facteur.toFixed(6)} appliqué (Decreet van 10 maart 2023). Ce facteur reste fixe jusqu'à obtention d'un meilleur EPC ou nouveau bail.`,
  }
}

// ---------------------------------------------------------------------------
// Index determination by region
// ---------------------------------------------------------------------------

/**
 * Determine which date's preceding month index to use as starting index.
 * - Brussels & Wallonia: month preceding SIGNATURE
 * - Flanders post-2018: month preceding START of lease
 * - Flanders pre-2019: month preceding SIGNATURE
 */
function getIndiceDepart(
  region: Region,
  dateSignature: Date,
  dateDebut: Date,
): { value: number; mois: string } | null {
  if (region === 'flandre') {
    // Post-2018 leases use start date
    const cutoff = new Date(2019, 0, 1) // Jan 1, 2019
    if (dateDebut >= cutoff) {
      return getIndicePrecedent(dateDebut)
    }
    return getIndicePrecedent(dateSignature)
  }

  // Brussels & Wallonia: month preceding signature
  return getIndicePrecedent(dateSignature)
}

// ---------------------------------------------------------------------------
// Legal references
// ---------------------------------------------------------------------------

export function getBaseLegale(region: Region, bailType: 'habitation' | 'commercial'): string {
  if (bailType === 'commercial') {
    return 'Code civil, Article 1728bis'
  }
  switch (region) {
    case 'bruxelles':
      return 'Code bruxellois du Logement, art. 224 (Ordonnance du 14 octobre 2022)'
    case 'wallonie':
      return 'Décret wallon du 15 mars 2018, art. 26 (modifié par Décret du 19 octobre 2022)'
    case 'flandre':
      return 'Vlaams Woninghuurdecreet, art. 34 (Decreet van 10 maart 2023)'
  }
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

export function calculateIndexation(input: IndexationInput): IndexationOutcome {
  const { bailType, region, peb, loyerBase, dateSignature, dateDebut, bailNonEnregistre } = input

  // --- Bail non enregistré checks ---
  if (bailNonEnregistre && bailType === 'habitation') {
    if (region === 'wallonie') {
      return {
        success: false,
        error: {
          type: 'bail_non_enregistre',
          message: 'En Wallonie, un bail non enregistré ne peut pas être indexé (Décret du 15 mars 2018, art. 26).',
          region,
        },
      }
    }
    if (region === 'bruxelles') {
      return {
        success: false,
        error: {
          type: 'bail_non_enregistre',
          message: 'À Bruxelles, un bail non enregistré perd le droit à l\'indexation.',
          region,
        },
      }
    }
    // Flanders: no specific restriction for non-registered leases in the context of indexation
  }

  // --- Get indices ---
  const indiceDepart = getIndiceDepart(region, dateSignature, dateDebut)
  if (!indiceDepart) {
    return {
      success: false,
      error: {
        type: 'indice_manquant',
        message: `L'indice santé pour le mois précédant la date de référence n'est pas disponible.`,
      },
    }
  }

  const nouvelIndice = getLatestIndice()
  if (!nouvelIndice) {
    return {
      success: false,
      error: {
        type: 'indice_manquant',
        message: 'Aucun indice santé disponible.',
      },
    }
  }

  // --- PEB correction ---
  let correction: PebCorrection = { type: 'aucune', facteur: 1, explication: 'Bail commercial — non soumis aux restrictions PEB.' }

  if (bailType === 'habitation' && peb) {
    switch (region) {
      case 'bruxelles':
        correction = getBruxellesCorrection(peb, dateSignature, dateDebut)
        break
      case 'wallonie':
        correction = getWallonieCorrection(peb, dateDebut)
        break
      case 'flandre':
        correction = getFlandreCorrection(peb, dateDebut)
        break
    }
  }

  // --- Calculate ---
  let nouveauLoyer: number
  let formule: string

  if (region === 'wallonie' && bailType === 'habitation' && peb && !['A+', 'A', 'B', 'C'].includes(peb)) {
    // Wallonia Phase 2: use loyer adapté
    const wallonie = calculateWallonieLoyer(loyerBase, peb, dateDebut, indiceDepart.value)

    if (wallonie) {
      nouveauLoyer = (wallonie.loyerAdapte * nouvelIndice.value) / wallonie.indiceAdapte
      formule = `(${wallonie.loyerAdapte.toFixed(2)} × ${nouvelIndice.value}) / ${wallonie.indiceAdapte}`
    } else {
      // Fallback to standard formula if no anniversary fell in restriction period
      nouveauLoyer = (loyerBase * nouvelIndice.value) / indiceDepart.value
      formule = `(${loyerBase} × ${nouvelIndice.value}) / ${indiceDepart.value}`
    }
  } else {
    // Standard formula (all other cases)
    nouveauLoyer = (loyerBase * nouvelIndice.value) / indiceDepart.value

    if (correction.facteur !== 1) {
      nouveauLoyer *= correction.facteur
      formule = `(${loyerBase} × ${nouvelIndice.value} / ${indiceDepart.value}) × ${correction.facteur.toFixed(6)}`
    } else {
      formule = `(${loyerBase} × ${nouvelIndice.value}) / ${indiceDepart.value}`
    }
  }

  // Round to 2 decimal places
  nouveauLoyer = Math.round(nouveauLoyer * 100) / 100

  const pourcentage = Math.round(((nouveauLoyer - loyerBase) / loyerBase) * 10000) / 100

  const result: IndexationResult = {
    nouveauLoyer,
    pourcentage,
    formule,
    indiceDepart,
    nouvelIndice,
    correctionPEB: correction,
    baseLegale: getBaseLegale(region, bailType),
  }

  return { success: true, result }
}
