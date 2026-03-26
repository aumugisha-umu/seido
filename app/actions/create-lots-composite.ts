'use server'

/**
 * Composite Server Action for Lot Creation
 *
 * Replaces N individual server action calls with 1 composite call:
 * - 1 auth init (instead of 4-12)
 * - Bulk INSERT addresses, lots, lot_contacts (instead of N individual INSERTs)
 * - Interventions deferred via after() (non-blocking)
 *
 * Supports both "independent" and "existing_building" modes.
 */

import { createServerActionSupabaseClient } from '@/lib/services'
import { createServiceRoleSubscriptionService } from '@/lib/services/domain/subscription-helpers'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { after } from 'next/server'
import { logger } from '@/lib/logger'

// Country mapping (duplicated from address.service.ts to avoid class instantiation)
const COUNTRY_MAP: Record<string, string> = {
  'belgium': 'belgique', 'belgique': 'belgique', 'be': 'belgique', 'belgië': 'belgique',
  'france': 'france', 'fr': 'france',
  'luxembourg': 'luxembourg', 'luxemburg': 'luxembourg', 'lu': 'luxembourg',
  'netherlands': 'pays-bas', 'pays-bas': 'pays-bas', 'pays bas': 'pays-bas', 'nl': 'pays-bas', 'nederland': 'pays-bas',
  'germany': 'allemagne', 'allemagne': 'allemagne', 'de': 'allemagne', 'deutschland': 'allemagne',
  'switzerland': 'suisse', 'suisse': 'suisse', 'ch': 'suisse', 'schweiz': 'suisse',
}

function mapCountry(country: string): string {
  return COUNTRY_MAP[country.toLowerCase().trim()] || 'autre'
}

// ── Types ──

export type CompositeAddress = {
  street: string
  postalCode: string
  city: string
  country: string
  latitude?: number
  longitude?: number
  placeId?: string
  formattedAddress?: string
}

export type CompositeLot = {
  reference: string
  category: string
  floor?: number | null
  doorNumber?: string | null
  description?: string | null
  pebRating?: string
  address?: CompositeAddress
}

export type CompositeContact = {
  lotIndex: number
  userId: string
  isPrimary: boolean
}

export type CompositeIntervention = {
  lotIndex: number
  title: string
  description?: string
  interventionTypeCode: string
  scheduledDate?: string
  assignedUsers: Array<{ userId: string; role: string }>
}

export type CreateLotsCompositePayload = {
  teamId: string
  mode: 'independent' | 'existing_building'
  buildingId?: string
  lots: CompositeLot[]
  contacts: CompositeContact[]
  interventions: CompositeIntervention[]
}

export type CreateLotsCompositeResult = {
  success: boolean
  createdLots?: Array<{ id: string; reference: string; lotIndex: number }>
  error?: string
}

// ── Main Action ──

export async function createLotsCompositeAction(
  payload: CreateLotsCompositePayload
): Promise<CreateLotsCompositeResult> {
  try {
    // 1. Auth — single check
    const authContext = await getServerActionAuthContextOrNull()
    if (!authContext) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createServerActionSupabaseClient()
    const { teamId, mode, buildingId, lots, contacts, interventions } = payload

    if (lots.length === 0) {
      return { success: false, error: 'Au moins un lot est requis' }
    }

    // 2. Subscription check — single check for entire batch
    const subService = createServiceRoleSubscriptionService()
    const canAdd = await subService.canAddProperty(teamId, lots.length)
    if (!canAdd.allowed) {
      return { success: false, error: canAdd.reason ?? 'Limite d\'abonnement atteinte' }
    }

    // 3. Create addresses (independent mode only) — bulk INSERT
    const lotAddressIds: (string | null)[] = new Array(lots.length).fill(null)

    if (mode === 'independent') {
      const addressRows = lots
        .map((lot, index) => {
          if (!lot.address?.street && !lot.address?.city) return null
          const addr = lot.address!
          const id = crypto.randomUUID()
          return {
            index,
            row: {
              id,
              street: addr.street,
              postal_code: addr.postalCode,
              city: addr.city,
              country: mapCountry(addr.country),
              latitude: addr.latitude || null,
              longitude: addr.longitude || null,
              place_id: addr.placeId || null,
              formatted_address: addr.formattedAddress || null,
              team_id: teamId,
            }
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      if (addressRows.length > 0) {
        const { error: addrError } = await supabase
          .from('addresses')
          .insert(addressRows.map(a => a.row))

        if (addrError) {
          logger.error({ error: addrError }, 'Bulk address insert failed')
          return { success: false, error: 'Erreur lors de la création des adresses' }
        }

        // Map address IDs back to lot indices
        for (const { index, row } of addressRows) {
          lotAddressIds[index] = row.id
        }

        logger.info({ count: addressRows.length }, 'Bulk addresses created')
      }
    }

    // 4. Create lots — bulk INSERT with pre-generated UUIDs
    const lotRows = lots.map((lot, index) => ({
      id: crypto.randomUUID(),
      reference: lot.reference,
      category: lot.category,
      floor: lot.floor ?? 0,
      apartment_number: lot.doorNumber || null,
      description: lot.description || null,
      peb_rating: lot.pebRating || null,
      building_id: mode === 'existing_building' ? (buildingId || null) : null,
      address_id: lotAddressIds[index],
      team_id: teamId,
    }))

    const { error: lotError } = await supabase
      .from('lots')
      .insert(lotRows)

    if (lotError) {
      logger.error({ error: lotError }, 'Bulk lot insert failed')
      return { success: false, error: 'Erreur lors de la création des lots' }
    }

    logger.info({ count: lotRows.length }, 'Bulk lots created')

    // 5. Assign contacts — bulk INSERT lot_contacts
    if (contacts.length > 0) {
      const contactRows = contacts
        .filter(c => c.lotIndex >= 0 && c.lotIndex < lotRows.length)
        .map(c => ({
          lot_id: lotRows[c.lotIndex].id,
          user_id: c.userId,
          is_primary: c.isPrimary,
        }))

      if (contactRows.length > 0) {
        const { error: contactError } = await supabase
          .from('lot_contacts')
          .insert(contactRows)

        if (contactError) {
          // Non-blocking: lots are created, contacts are secondary
          logger.error({ error: contactError }, 'Bulk contact assignment failed')
        } else {
          logger.info({ count: contactRows.length }, 'Bulk contacts assigned')
        }
      }
    }

    // 6. Build result before deferring
    const createdLots = lotRows.map((row, index) => ({
      id: row.id,
      reference: row.reference,
      lotIndex: index,
    }))

    // 7. Defer interventions via after() — non-blocking
    if (interventions.length > 0) {
      const interventionData = interventions.map(iv => ({
        ...iv,
        lotId: iv.lotIndex >= 0 && iv.lotIndex < lotRows.length
          ? lotRows[iv.lotIndex].id
          : null,
      }))

      after(async () => {
        try {
          const { createInterventionAction } = await import('@/app/actions/intervention-actions')

          const results = await Promise.allSettled(
            interventionData
              .filter(iv => iv.lotId)
              .map(iv =>
                createInterventionAction({
                  title: iv.title,
                  description: iv.description || '',
                  type: iv.interventionTypeCode,
                  urgency: 'basse',
                  lot_id: iv.lotId!,
                  team_id: teamId,
                  requested_date: iv.scheduledDate ? new Date(iv.scheduledDate) : undefined,
                }, {
                  useServiceRole: true,
                  assignments: iv.assignedUsers.length > 0 ? iv.assignedUsers : undefined,
                })
              )
          )

          const successCount = results.filter(r => r.status === 'fulfilled').length
          logger.info({ successCount, total: results.length }, 'Deferred interventions created')
        } catch (err) {
          logger.error({ error: err }, 'Deferred intervention creation failed')
        }
      })
    }

    return { success: true, createdLots }
  } catch (error) {
    logger.error({ error }, 'createLotsCompositeAction failed')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
