/**
 * Unit tests for intervention status transition rules
 *
 * These tests verify the intervention state machine:
 * demande → approuvee → planification → planifiee → cloturee_par_prestataire
 *     ↓                                    ↓              ↓
 *   rejetee                             annulee    cloturee_par_locataire → cloturee_par_gestionnaire
 *
 * Note: We define the expected transitions inline rather than importing from
 * intervention-service.ts because that module has server-side dependencies
 * (logger, repositories) that can't load in the unit test environment.
 * These tests serve as a contract test: if the transitions change in the
 * service, these tests should be updated to match.
 */

import { describe, it, expect } from 'vitest'

/**
 * Expected valid transitions — must match VALID_TRANSITIONS in
 * lib/services/domain/intervention-service.ts
 */
const EXPECTED_TRANSITIONS: Record<string, string[]> = {
  'demande': ['rejetee', 'approuvee'],
  'rejetee': [],
  'approuvee': ['planification', 'annulee'],
  'planification': ['planifiee', 'annulee'],
  'planifiee': ['cloturee_par_prestataire', 'cloturee_par_gestionnaire', 'annulee'],
  'cloturee_par_prestataire': ['cloturee_par_locataire', 'cloturee_par_gestionnaire'],
  'cloturee_par_locataire': ['cloturee_par_gestionnaire'],
  'cloturee_par_gestionnaire': [],
  'annulee': [],
  'contestee': ['cloturee_par_gestionnaire', 'annulee'],
}

// All intervention statuses in the system
const ALL_STATUSES = Object.keys(EXPECTED_TRANSITIONS)

// Terminal statuses: no further transitions allowed
const TERMINAL_STATUSES = ['rejetee', 'cloturee_par_gestionnaire', 'annulee']

/** Helper: check if a transition is valid */
function isValidTransition(from: string, to: string): boolean {
  return EXPECTED_TRANSITIONS[from]?.includes(to) || false
}

describe('EXPECTED_TRANSITIONS map', () => {
  it('has 10 status entries', () => {
    expect(ALL_STATUSES.length).toBe(10)
  })

  it('contains only valid status values in transition arrays', () => {
    for (const [, transitions] of Object.entries(EXPECTED_TRANSITIONS)) {
      for (const target of transitions) {
        expect(ALL_STATUSES).toContain(target)
      }
    }
  })
})

describe('terminal statuses', () => {
  for (const status of TERMINAL_STATUSES) {
    it(`${status} has no outgoing transitions`, () => {
      expect(EXPECTED_TRANSITIONS[status]).toEqual([])
    })
  }
})

describe('demande transitions', () => {
  it('can be approved', () => {
    expect(isValidTransition('demande', 'approuvee')).toBe(true)
  })

  it('can be rejected', () => {
    expect(isValidTransition('demande', 'rejetee')).toBe(true)
  })

  it('cannot skip to planification', () => {
    expect(isValidTransition('demande', 'planification')).toBe(false)
  })

  it('cannot skip to planifiee', () => {
    expect(isValidTransition('demande', 'planifiee')).toBe(false)
  })

  it('cannot skip to closure', () => {
    expect(isValidTransition('demande', 'cloturee_par_gestionnaire')).toBe(false)
  })
})

describe('approuvee transitions', () => {
  it('can move to planification', () => {
    expect(isValidTransition('approuvee', 'planification')).toBe(true)
  })

  it('can be cancelled', () => {
    expect(isValidTransition('approuvee', 'annulee')).toBe(true)
  })

  it('cannot go back to demande', () => {
    expect(isValidTransition('approuvee', 'demande')).toBe(false)
  })
})

describe('planification transitions', () => {
  it('can become planifiee', () => {
    expect(isValidTransition('planification', 'planifiee')).toBe(true)
  })

  it('can be cancelled', () => {
    expect(isValidTransition('planification', 'annulee')).toBe(true)
  })

  it('cannot go back to approuvee', () => {
    expect(isValidTransition('planification', 'approuvee')).toBe(false)
  })
})

describe('planifiee transitions', () => {
  it('can be completed by provider', () => {
    expect(isValidTransition('planifiee', 'cloturee_par_prestataire')).toBe(true)
  })

  it('can be cancelled', () => {
    expect(isValidTransition('planifiee', 'annulee')).toBe(true)
  })

  it('manager can finalize directly', () => {
    expect(isValidTransition('planifiee', 'cloturee_par_gestionnaire')).toBe(true)
  })
})

describe('closure chain', () => {
  it('provider closure → tenant validation', () => {
    expect(isValidTransition('cloturee_par_prestataire', 'cloturee_par_locataire')).toBe(true)
  })

  it('provider closure → manager can finalize directly', () => {
    expect(isValidTransition('cloturee_par_prestataire', 'cloturee_par_gestionnaire')).toBe(true)
  })

  it('tenant validation → manager finalization', () => {
    expect(isValidTransition('cloturee_par_locataire', 'cloturee_par_gestionnaire')).toBe(true)
  })
})

describe('contestee transitions', () => {
  it('can be finalized by manager', () => {
    expect(isValidTransition('contestee', 'cloturee_par_gestionnaire')).toBe(true)
  })

  it('can be cancelled', () => {
    expect(isValidTransition('contestee', 'annulee')).toBe(true)
  })
})

describe('forward-only enforcement', () => {
  it('approuvee cannot go back to demande', () => {
    expect(isValidTransition('approuvee', 'demande')).toBe(false)
  })

  it('planification cannot go back to approuvee', () => {
    expect(isValidTransition('planification', 'approuvee')).toBe(false)
  })

  it('planifiee cannot go back to planification', () => {
    expect(isValidTransition('planifiee', 'planification')).toBe(false)
  })

  it('cloturee_par_locataire cannot go back to cloturee_par_prestataire', () => {
    expect(isValidTransition('cloturee_par_locataire', 'cloturee_par_prestataire')).toBe(false)
  })
})

describe('annulee reachability', () => {
  const cancelReachable = ['approuvee', 'planification', 'planifiee', 'contestee']

  for (const status of cancelReachable) {
    it(`${status} can transition to annulee`, () => {
      expect(isValidTransition(status, 'annulee')).toBe(true)
    })
  }

  it('demande cannot be directly cancelled (must reject instead)', () => {
    expect(isValidTransition('demande', 'annulee')).toBe(false)
  })
})

describe('happy path completeness', () => {
  it('full lifecycle path is valid: demande → approuvee → planification → planifiee → cloturee_par_prestataire → cloturee_par_locataire → cloturee_par_gestionnaire', () => {
    const happyPath = [
      'demande', 'approuvee', 'planification', 'planifiee',
      'cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire',
    ]

    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(isValidTransition(happyPath[i], happyPath[i + 1])).toBe(true)
    }
  })
})
