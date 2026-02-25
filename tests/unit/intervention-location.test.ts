/**
 * Unit tests for intervention location formatting
 * @see lib/utils/intervention-location.ts
 */

import { describe, it, expect } from 'vitest'
import { formatInterventionLocation } from '@/lib/utils/intervention-location'

describe('formatInterventionLocation', () => {
  it('formats building + lot correctly', () => {
    const result = formatInterventionLocation({
      lot: {
        reference: 'AND-A01',
        building: {
          name: 'Anderlecht Square',
          address_record: {
            formatted_address: '56 Place de la Vaillance, 1070 Bruxelles',
          },
        },
      },
    })
    expect(result.primary).toBe('Anderlecht Square › Lot AND-A01')
    expect(result.address).toBe('56 Place de la Vaillance, 1070 Bruxelles')
    expect(result.buildingName).toBe('Anderlecht Square')
    expect(result.lotReference).toBe('AND-A01')
    expect(result.icon).toBe('mapPin')
  })

  it('formats lot only (independent lot)', () => {
    const result = formatInterventionLocation({
      lot: {
        reference: 'IND-01',
        address_record: {
          street: '10 Rue Test',
          postal_code: '1000',
          city: 'Bruxelles',
        },
      },
    })
    expect(result.primary).toBe('Lot IND-01')
    expect(result.address).toBe('10 Rue Test, 1000, Bruxelles')
    expect(result.lotReference).toBe('IND-01')
    expect(result.icon).toBe('mapPin')
  })

  it('formats building only (no lot)', () => {
    const result = formatInterventionLocation({
      building: {
        name: 'Tour Alpha',
        address_record: {
          formatted_address: '1 Boulevard Alpha, 1000 Bruxelles',
        },
      },
    })
    expect(result.primary).toBe('Tour Alpha')
    expect(result.buildingName).toBe('Tour Alpha')
    expect(result.lotReference).toBeNull()
    expect(result.icon).toBe('building')
  })

  it('falls back to intervention.location', () => {
    const result = formatInterventionLocation({
      location: 'Custom location text',
    })
    expect(result.primary).toBe('Custom location text')
    expect(result.address).toBeNull()
  })

  it('falls back to "Non spécifié" when no data', () => {
    const result = formatInterventionLocation({})
    expect(result.primary).toBe('Non spécifié')
  })

  it('prioritizes lot address_record over building address_record', () => {
    const result = formatInterventionLocation({
      lot: {
        reference: 'LOT-01',
        address_record: {
          formatted_address: 'Lot-specific address',
        },
        building: {
          name: 'Building',
          address_record: {
            formatted_address: 'Building address',
          },
        },
      },
    })
    expect(result.address).toBe('Lot-specific address')
  })

  it('builds address from parts when no formatted_address', () => {
    const result = formatInterventionLocation({
      building: {
        name: 'Test',
        address_record: {
          street: '10 Rue A',
          city: 'Liege',
        },
      },
    })
    expect(result.address).toBe('10 Rue A, Liege')
  })

  it('handles null address_record fields', () => {
    const result = formatInterventionLocation({
      building: {
        name: 'Test',
        address_record: {
          street: null,
          postal_code: null,
          city: null,
        },
      },
    })
    expect(result.address).toBeNull()
  })
})
