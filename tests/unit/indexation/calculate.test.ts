import { describe, it, expect } from 'vitest'
import { calculateIndexation } from '@/lib/indexation/calculate'
import type { IndexationInput } from '@/lib/indexation/types'

// Helper to create a base input with sensible defaults
function makeInput(overrides: Partial<IndexationInput> = {}): IndexationInput {
  return {
    bailType: 'habitation',
    region: 'bruxelles',
    peb: 'C',
    loyerBase: 850,
    dateSignature: new Date(2021, 2, 15), // March 15, 2021
    dateDebut: new Date(2021, 3, 1),       // April 1, 2021
    bailNonEnregistre: false,
    ...overrides,
  }
}

describe('calculateIndexation', () => {
  // ─────────────────────────────────────────────────
  // Basic formula (all regions, no PEB correction)
  // ─────────────────────────────────────────────────

  describe('standard formula without PEB correction', () => {
    it('calculates indexed rent for Brussels PEB C (no correction)', () => {
      const input = makeInput({
        region: 'bruxelles',
        peb: 'C',
        loyerBase: 850,
        dateSignature: new Date(2021, 2, 15), // March 2021
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      // Formula: (850 × latest_index) / index_feb_2021
      // indice départ = month preceding signature = Feb 2021 = 105.33
      expect(result.result.indiceDepart.mois).toBe('2021-02')
      expect(result.result.indiceDepart.value).toBe(105.33)
      expect(result.result.nouveauLoyer).toBeGreaterThan(850)
      expect(result.result.pourcentage).toBeGreaterThan(0)
      expect(result.result.correctionPEB.type).toBe('aucune')
      expect(result.result.baseLegale).toContain('Code bruxellois')
    })

    it('calculates indexed rent for Wallonia PEB A (no correction)', () => {
      const input = makeInput({
        region: 'wallonie',
        peb: 'A',
        loyerBase: 700,
        dateSignature: new Date(2020, 5, 10), // June 10, 2020
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.indiceDepart.mois).toBe('2020-05')
      expect(result.result.correctionPEB.type).toBe('aucune')
      expect(result.result.baseLegale).toContain('Décret wallon')
    })

    it('calculates indexed rent for Flanders EPC B (no correction)', () => {
      const input = makeInput({
        region: 'flandre',
        peb: 'B',
        loyerBase: 950,
        dateSignature: new Date(2020, 0, 5), // Jan 5, 2020
        dateDebut: new Date(2020, 1, 1),     // Feb 1, 2020
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      // Flanders post-2018: uses month preceding START date = Jan 2020
      expect(result.result.indiceDepart.mois).toBe('2020-01')
      expect(result.result.indiceDepart.value).toBe(105.33)
      expect(result.result.correctionPEB.type).toBe('aucune')
      expect(result.result.baseLegale).toContain('Woninghuurdecreet')
    })
  })

  // ─────────────────────────────────────────────────
  // Flanders: date reference rules
  // ─────────────────────────────────────────────────

  describe('Flanders index date rules', () => {
    it('uses signature date for pre-2019 leases', () => {
      const input = makeInput({
        region: 'flandre',
        peb: 'C',
        loyerBase: 800,
        dateSignature: new Date(2018, 5, 15), // June 15, 2018
        dateDebut: new Date(2018, 6, 1),       // July 1, 2018
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      // Pre-2019: month preceding SIGNATURE = May 2018
      expect(result.result.indiceDepart.mois).toBe('2018-05')
    })

    it('uses start date for post-2018 leases', () => {
      const input = makeInput({
        region: 'flandre',
        peb: 'C',
        loyerBase: 800,
        dateSignature: new Date(2019, 5, 15), // June 15, 2019
        dateDebut: new Date(2019, 6, 1),       // July 1, 2019
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      // Post-2018: month preceding START = June 2019
      expect(result.result.indiceDepart.mois).toBe('2019-06')
    })
  })

  // ─────────────────────────────────────────────────
  // Brussels PEB corrections
  // ─────────────────────────────────────────────────

  describe('Brussels PEB E correction', () => {
    it('applies correction factor for PEB E + bail signed before Oct 2022', () => {
      const input = makeInput({
        region: 'bruxelles',
        peb: 'E',
        loyerBase: 900,
        dateSignature: new Date(2020, 2, 1), // March 1, 2020
        dateDebut: new Date(2020, 3, 1),     // April 1, 2020 → anniversary month = April
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('facteur_correctif')
      expect(result.result.correctionPEB.facteur).toBeLessThan(1)
      expect(result.result.correctionPEB.facteur).toBeCloseTo(0.965766823, 5) // April factor for PEB E
      expect(result.result.correctionPEB.explication).toContain('PEB E')
    })

    it('no correction for PEB E + bail signed AFTER Oct 2022', () => {
      const input = makeInput({
        region: 'bruxelles',
        peb: 'E',
        loyerBase: 900,
        dateSignature: new Date(2023, 0, 15), // Jan 15, 2023
        dateDebut: new Date(2023, 1, 1),
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('aucune')
      expect(result.result.correctionPEB.facteur).toBe(1)
    })
  })

  describe('Brussels PEB F/G correction', () => {
    it('applies stronger correction factor for PEB F', () => {
      const input = makeInput({
        region: 'bruxelles',
        peb: 'F',
        loyerBase: 750,
        dateSignature: new Date(2019, 10, 1), // Nov 1, 2019
        dateDebut: new Date(2019, 11, 1),     // Dec 1, 2019 → anniversary month = December
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('facteur_correctif')
      expect(result.result.correctionPEB.facteur).toBeCloseTo(0.903954802, 5) // Dec factor for PEB F/G
      // F/G factor should be lower (more restrictive) than E
      expect(result.result.correctionPEB.facteur).toBeLessThan(0.96)
    })
  })

  // ─────────────────────────────────────────────────
  // Wallonia PEB restrictions
  // ─────────────────────────────────────────────────

  describe('Wallonia PEB D/E restrictions (loyer adapté)', () => {
    it('applies partial restriction for PEB D (75%)', () => {
      const input = makeInput({
        region: 'wallonie',
        peb: 'D',
        loyerBase: 800,
        dateSignature: new Date(2020, 5, 1), // June 1, 2020
        dateDebut: new Date(2020, 6, 1),     // July 1, 2020
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('loyer_adapte')
      expect(result.result.correctionPEB.explication).toContain('75%')
    })

    it('blocks indexation for PEB G (0%)', () => {
      const input = makeInput({
        region: 'wallonie',
        peb: 'G',
        loyerBase: 600,
        dateSignature: new Date(2020, 8, 1), // Sep 1, 2020
        dateDebut: new Date(2020, 9, 1),     // Oct 1, 2020
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('bloquee')
      expect(result.result.correctionPEB.explication).toContain('bloquée')
    })

    it('blocks indexation for PEB inconnu', () => {
      const input = makeInput({
        region: 'wallonie',
        peb: 'inconnu',
        loyerBase: 600,
        dateSignature: new Date(2020, 8, 1),
        dateDebut: new Date(2020, 9, 1),
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('bloquee')
    })
  })

  // ─────────────────────────────────────────────────
  // Flanders EPC corrections
  // ─────────────────────────────────────────────────

  describe('Flanders EPC D correction (permanent factor)', () => {
    it('applies permanent correction for EPC D + bail before Oct 2022', () => {
      const input = makeInput({
        region: 'flandre',
        peb: 'D',
        loyerBase: 850,
        dateSignature: new Date(2021, 2, 1), // March 1, 2021
        dateDebut: new Date(2021, 3, 1),     // April 1, 2021 → anniversary month April (jan-sep range)
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('facteur_correctif')
      expect(result.result.correctionPEB.facteur).toBeLessThan(1)
      expect(result.result.correctionPEB.explication).toContain('permanent')
    })

    it('no correction for EPC D + bail AFTER Oct 2022', () => {
      const input = makeInput({
        region: 'flandre',
        peb: 'D',
        loyerBase: 850,
        dateSignature: new Date(2022, 10, 1), // Nov 1, 2022
        dateDebut: new Date(2022, 11, 1),     // Dec 1, 2022 (after cutoff)
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('aucune')
      expect(result.result.correctionPEB.facteur).toBe(1)
    })
  })

  describe('Flanders EPC E/F correction', () => {
    it('applies stronger correction for EPC E (jan-sep anniversary)', () => {
      const input = makeInput({
        region: 'flandre',
        peb: 'E',
        loyerBase: 750,
        dateSignature: new Date(2020, 4, 1), // May 1, 2020
        dateDebut: new Date(2020, 5, 1),     // June 1, 2020 → anniversary month June (jan-sep)
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('facteur_correctif')
      // E/F factor = indice_2022 / indice_2023 (for jan-sep)
      expect(result.result.correctionPEB.facteur).toBeLessThan(1)
    })

    it('applies correction for EPC F (oct-dec anniversary)', () => {
      const input = makeInput({
        region: 'flandre',
        peb: 'F',
        loyerBase: 650,
        dateSignature: new Date(2020, 10, 1), // Nov 1, 2020
        dateDebut: new Date(2020, 11, 1),      // Dec 1, 2020 → anniversary month Dec (oct-dec)
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('facteur_correctif')
      // E/F factor = indice_2021 / indice_2022 (for oct-dec)
      expect(result.result.correctionPEB.facteur).toBeLessThan(1)
    })
  })

  // ─────────────────────────────────────────────────
  // Commercial leases
  // ─────────────────────────────────────────────────

  describe('commercial leases', () => {
    it('applies standard formula without PEB correction', () => {
      const input = makeInput({
        bailType: 'commercial',
        region: 'bruxelles',
        peb: null,
        loyerBase: 2500,
        dateSignature: new Date(2020, 0, 15), // Jan 15, 2020
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.result.correctionPEB.type).toBe('aucune')
      expect(result.result.correctionPEB.explication).toContain('commercial')
      expect(result.result.baseLegale).toContain('1728bis')
      expect(result.result.nouveauLoyer).toBeGreaterThan(2500)
    })
  })

  // ─────────────────────────────────────────────────
  // Bail non enregistré
  // ─────────────────────────────────────────────────

  describe('bail non enregistré', () => {
    it('returns error for Wallonia (no indexation possible)', () => {
      const input = makeInput({
        region: 'wallonie',
        bailNonEnregistre: true,
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.type).toBe('bail_non_enregistre')
      expect(result.error.region).toBe('wallonie')
    })

    it('returns error for Brussels (loss of indexation right)', () => {
      const input = makeInput({
        region: 'bruxelles',
        bailNonEnregistre: true,
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.type).toBe('bail_non_enregistre')
      expect(result.error.region).toBe('bruxelles')
    })

    it('allows indexation for Flanders (no specific restriction)', () => {
      const input = makeInput({
        region: 'flandre',
        peb: 'C',
        bailNonEnregistre: true,
        dateDebut: new Date(2020, 1, 1),
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
    })

    it('ignores for commercial leases', () => {
      const input = makeInput({
        bailType: 'commercial',
        region: 'wallonie',
        peb: null,
        bailNonEnregistre: true,
      })

      // Commercial leases don't check non-enregistré
      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────
  // Edge cases
  // ─────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns error when starting index is unavailable', () => {
      const input = makeInput({
        dateSignature: new Date(2000, 0, 1), // Far in the past
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.type).toBe('indice_manquant')
    })

    it('rounds nouveau loyer to 2 decimal places', () => {
      const input = makeInput({
        loyerBase: 777.77,
        peb: 'A',
        dateSignature: new Date(2021, 2, 15),
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      const decimals = result.result.nouveauLoyer.toString().split('.')[1]
      expect(!decimals || decimals.length <= 2).toBe(true)
    })

    it('calculates correct percentage', () => {
      const input = makeInput({
        loyerBase: 1000,
        peb: 'A',
        dateSignature: new Date(2021, 2, 15),
      })

      const result = calculateIndexation(input)
      expect(result.success).toBe(true)
      if (!result.success) return

      const expectedPct = Math.round(((result.result.nouveauLoyer - 1000) / 1000) * 10000) / 100
      expect(result.result.pourcentage).toBe(expectedPct)
    })
  })
})
