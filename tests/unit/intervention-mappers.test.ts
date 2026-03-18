/**
 * Unit tests for intervention mapping functions
 * @see lib/utils/intervention-mappers.ts
 *
 * Tests all mapper functions that convert between:
 * - Frontend form values ↔ Database enum values
 * - Database values ↔ Display labels (French)
 * - Status → boolean flags (terminal, requires action)
 */

import { describe, it, expect } from 'vitest'
import {
  mapInterventionType,
  mapTypeToFrontend,
  mapUrgencyLevel,
  mapUrgencyToFrontend,
  mapUrgencyToPriority,
  mapStatusToFrontend,
  mapStatusToLabel,
  isTerminalStatus,
  statusRequiresManagerAction,
  getInterventionTypeOptions,
  getUrgencyOptions,
  getStatusOptions,
  INTERVENTION_TYPE_TO_DB,
  INTERVENTION_TYPE_TO_FRONTEND,
  URGENCY_TO_DB,
  URGENCY_TO_FRONTEND,
  STATUS_TO_FRONTEND,
  STATUS_TO_LABEL,
} from '@/lib/utils/intervention-mappers'

// ==========================================================================
// mapInterventionType (frontend → DB with legacy mapping)
// ==========================================================================

describe('mapInterventionType', () => {
  it('maps legacy "jardinage" to "espaces_verts"', () => {
    expect(mapInterventionType('jardinage')).toBe('espaces_verts')
  })

  it('maps legacy "menage" to "nettoyage"', () => {
    expect(mapInterventionType('menage')).toBe('nettoyage')
  })

  it('maps legacy "autre" to "autre_technique"', () => {
    expect(mapInterventionType('autre')).toBe('autre_technique')
  })

  it('passes through modern type codes unchanged', () => {
    expect(mapInterventionType('plomberie')).toBe('plomberie')
    expect(mapInterventionType('electricite')).toBe('electricite')
    expect(mapInterventionType('chauffage')).toBe('chauffage')
  })

  it('is case-insensitive', () => {
    expect(mapInterventionType('JARDINAGE')).toBe('espaces_verts')
    expect(mapInterventionType('Plomberie')).toBe('plomberie')
  })

  it('returns "autre_technique" for empty/null input', () => {
    expect(mapInterventionType('')).toBe('autre_technique')
    expect(mapInterventionType(null as unknown as string)).toBe('autre_technique')
    expect(mapInterventionType(undefined as unknown as string)).toBe('autre_technique')
  })

  it('passes through unknown values unchanged', () => {
    expect(mapInterventionType('custom_type')).toBe('custom_type')
  })
})

// ==========================================================================
// mapTypeToFrontend (DB → display label)
// ==========================================================================

describe('mapTypeToFrontend', () => {
  it('maps DB types to French labels', () => {
    expect(mapTypeToFrontend('plomberie')).toBe('Plomberie')
    expect(mapTypeToFrontend('electricite')).toBe('Électricité')
    expect(mapTypeToFrontend('chauffage')).toBe('Chauffage')
    expect(mapTypeToFrontend('serrurerie')).toBe('Serrurerie')
    expect(mapTypeToFrontend('menuiserie')).toBe('Menuiserie')
    expect(mapTypeToFrontend('peinture')).toBe('Peinture')
    expect(mapTypeToFrontend('nettoyage')).toBe('Nettoyage')
    expect(mapTypeToFrontend('jardinage')).toBe('Jardinage')
    expect(mapTypeToFrontend('renovation')).toBe('Rénovation')
    expect(mapTypeToFrontend('autre')).toBe('Autre')
  })

  it('returns the raw value for unknown types', () => {
    expect(mapTypeToFrontend('custom_type')).toBe('custom_type')
  })

  it('returns "Autre" for empty/null input', () => {
    expect(mapTypeToFrontend('')).toBe('Autre')
  })
})

// ==========================================================================
// mapUrgencyLevel (frontend → DB enum)
// ==========================================================================

describe('mapUrgencyLevel', () => {
  it('maps English urgencies to French DB values', () => {
    expect(mapUrgencyLevel('low')).toBe('basse')
    expect(mapUrgencyLevel('medium')).toBe('normale')
    expect(mapUrgencyLevel('high')).toBe('haute')
    expect(mapUrgencyLevel('urgent')).toBe('urgente')
    expect(mapUrgencyLevel('critical')).toBe('urgente') // Maps to urgente, not critique
  })

  it('passes through French values unchanged', () => {
    expect(mapUrgencyLevel('basse')).toBe('basse')
    expect(mapUrgencyLevel('normale')).toBe('normale')
    expect(mapUrgencyLevel('haute')).toBe('haute')
    expect(mapUrgencyLevel('urgente')).toBe('urgente')
  })

  it('is case-insensitive', () => {
    expect(mapUrgencyLevel('HIGH')).toBe('haute')
    expect(mapUrgencyLevel('Low')).toBe('basse')
  })

  it('returns "normale" as default for unknown values', () => {
    expect(mapUrgencyLevel('unknown')).toBe('normale')
    expect(mapUrgencyLevel('')).toBe('normale')
  })
})

// ==========================================================================
// mapUrgencyToFrontend (DB → display label)
// ==========================================================================

describe('mapUrgencyToFrontend', () => {
  it('maps DB urgencies to French display labels', () => {
    expect(mapUrgencyToFrontend('basse')).toBe('Basse')
    expect(mapUrgencyToFrontend('normale')).toBe('Normale')
    expect(mapUrgencyToFrontend('haute')).toBe('Haute')
    expect(mapUrgencyToFrontend('urgente')).toBe('Urgente')
    expect(mapUrgencyToFrontend('critique')).toBe('Critique')
  })

  it('returns raw value for unknown urgency', () => {
    expect(mapUrgencyToFrontend('custom')).toBe('custom')
  })

  it('returns "Normale" for empty/null input', () => {
    expect(mapUrgencyToFrontend('')).toBe('Normale')
  })
})

// ==========================================================================
// mapUrgencyToPriority (DB urgency → priority level)
// ==========================================================================

describe('mapUrgencyToPriority', () => {
  it('maps DB urgencies to priority levels', () => {
    expect(mapUrgencyToPriority('basse')).toBe('basse')
    expect(mapUrgencyToPriority('normale')).toBe('normale')
    expect(mapUrgencyToPriority('haute')).toBe('haute')
    expect(mapUrgencyToPriority('urgente')).toBe('urgent')
    expect(mapUrgencyToPriority('critique')).toBe('critique')
  })

  it('returns "normale" for unknown urgency', () => {
    expect(mapUrgencyToPriority('custom')).toBe('normale')
  })
})

// ==========================================================================
// mapStatusToFrontend (DB status → frontend key)
// ==========================================================================

describe('mapStatusToFrontend', () => {
  it('maps all DB statuses to frontend keys', () => {
    expect(mapStatusToFrontend('demande')).toBe('nouvelle-demande')
    expect(mapStatusToFrontend('rejetee')).toBe('rejetee')
    expect(mapStatusToFrontend('approuvee')).toBe('approuvee')
    expect(mapStatusToFrontend('planification')).toBe('planification')
    expect(mapStatusToFrontend('planifiee')).toBe('planifiee')
    expect(mapStatusToFrontend('cloturee_par_prestataire')).toBe('travaux-termines')
    expect(mapStatusToFrontend('cloturee_par_locataire')).toBe('validee')
    expect(mapStatusToFrontend('cloturee_par_gestionnaire')).toBe('cloturee')
    expect(mapStatusToFrontend('annulee')).toBe('annulee')
  })

  it('returns raw value for unknown status', () => {
    expect(mapStatusToFrontend('unknown')).toBe('unknown')
  })
})

// ==========================================================================
// mapStatusToLabel (DB status → French label)
// ==========================================================================

describe('mapStatusToLabel', () => {
  it('maps all DB statuses to French labels', () => {
    expect(mapStatusToLabel('demande')).toBe('Nouvelle demande')
    expect(mapStatusToLabel('rejetee')).toBe('Rejetée')
    expect(mapStatusToLabel('approuvee')).toBe('Approuvée')
    expect(mapStatusToLabel('planification')).toBe('Planification')
    expect(mapStatusToLabel('planifiee')).toBe('Planifiée')
    expect(mapStatusToLabel('cloturee_par_prestataire')).toBe('Travaux terminés')
    expect(mapStatusToLabel('cloturee_par_locataire')).toBe('Validée par locataire')
    expect(mapStatusToLabel('cloturee_par_gestionnaire')).toBe('Clôturée')
    expect(mapStatusToLabel('annulee')).toBe('Annulée')
  })

  it('returns raw value for unknown status', () => {
    expect(mapStatusToLabel('contestee')).toBe('contestee')
  })
})

// ==========================================================================
// isTerminalStatus
// ==========================================================================

describe('isTerminalStatus', () => {
  it('identifies terminal statuses', () => {
    expect(isTerminalStatus('cloturee_par_gestionnaire')).toBe(true)
    expect(isTerminalStatus('annulee')).toBe(true)
    expect(isTerminalStatus('rejetee')).toBe(true)
  })

  it('identifies non-terminal statuses', () => {
    expect(isTerminalStatus('demande')).toBe(false)
    expect(isTerminalStatus('approuvee')).toBe(false)
    expect(isTerminalStatus('planification')).toBe(false)
    expect(isTerminalStatus('planifiee')).toBe(false)
    expect(isTerminalStatus('cloturee_par_prestataire')).toBe(false)
    expect(isTerminalStatus('cloturee_par_locataire')).toBe(false)
  })

  it('returns false for unknown status', () => {
    expect(isTerminalStatus('unknown')).toBe(false)
  })
})

// ==========================================================================
// statusRequiresManagerAction
// ==========================================================================

describe('statusRequiresManagerAction', () => {
  it('identifies statuses requiring manager action', () => {
    expect(statusRequiresManagerAction('demande')).toBe(true)
    expect(statusRequiresManagerAction('approuvee')).toBe(true)
    expect(statusRequiresManagerAction('planification')).toBe(true)
    expect(statusRequiresManagerAction('planifiee')).toBe(true)
  })

  it('identifies statuses NOT requiring manager action', () => {
    expect(statusRequiresManagerAction('rejetee')).toBe(false)
    expect(statusRequiresManagerAction('cloturee_par_prestataire')).toBe(false)
    expect(statusRequiresManagerAction('cloturee_par_locataire')).toBe(false)
    expect(statusRequiresManagerAction('cloturee_par_gestionnaire')).toBe(false)
    expect(statusRequiresManagerAction('annulee')).toBe(false)
  })
})

// ==========================================================================
// Utility functions (getOptions)
// ==========================================================================

describe('getInterventionTypeOptions', () => {
  it('returns array of value/label objects', () => {
    const options = getInterventionTypeOptions()
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
    for (const opt of options) {
      expect(opt).toHaveProperty('value')
      expect(opt).toHaveProperty('label')
      expect(typeof opt.value).toBe('string')
      expect(typeof opt.label).toBe('string')
    }
  })
})

describe('getUrgencyOptions', () => {
  it('returns array of value/label objects', () => {
    const options = getUrgencyOptions()
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })
})

describe('getStatusOptions', () => {
  it('returns array of value/label objects', () => {
    const options = getStatusOptions()
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })
})

// ==========================================================================
// Mapping constant integrity
// ==========================================================================

describe('mapping constants', () => {
  it('INTERVENTION_TYPE_TO_DB has both English and French entries', () => {
    // English entries
    expect(INTERVENTION_TYPE_TO_DB['plumbing']).toBe('plomberie')
    expect(INTERVENTION_TYPE_TO_DB['electrical']).toBe('electricite')
    // French entries
    expect(INTERVENTION_TYPE_TO_DB['plomberie']).toBe('plomberie')
    expect(INTERVENTION_TYPE_TO_DB['electricite']).toBe('electricite')
  })

  it('INTERVENTION_TYPE_TO_FRONTEND covers all DB types', () => {
    const dbTypes = ['plomberie', 'electricite', 'chauffage', 'serrurerie',
      'menuiserie', 'peinture', 'nettoyage', 'jardinage', 'renovation', 'autre']
    for (const type of dbTypes) {
      expect(INTERVENTION_TYPE_TO_FRONTEND).toHaveProperty(type)
    }
  })

  it('URGENCY_TO_DB has both English and French entries', () => {
    expect(URGENCY_TO_DB['low']).toBe('basse')
    expect(URGENCY_TO_DB['basse']).toBe('basse')
  })

  it('STATUS_TO_FRONTEND covers all main statuses', () => {
    const statuses = ['demande', 'rejetee', 'approuvee', 'planification',
      'planifiee', 'cloturee_par_prestataire', 'cloturee_par_locataire',
      'cloturee_par_gestionnaire', 'annulee']
    for (const status of statuses) {
      expect(STATUS_TO_FRONTEND).toHaveProperty(status)
    }
  })

  it('STATUS_TO_LABEL covers all main statuses', () => {
    const statuses = ['demande', 'rejetee', 'approuvee', 'planification',
      'planifiee', 'cloturee_par_prestataire', 'cloturee_par_locataire',
      'cloturee_par_gestionnaire', 'annulee']
    for (const status of statuses) {
      expect(STATUS_TO_LABEL).toHaveProperty(status)
    }
  })
})
