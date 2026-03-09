import { logger } from '@/lib/logger'

// ============================================================================
// Types
// ============================================================================

export interface TelnyxAvailableNumber {
  phone_number: string
  region_information: Array<{ region_name: string; region_type: string }>
  cost_information: { upfront_cost: string; monthly_cost: string }
}

export interface TelnyxNumberOrder {
  id: string
  status: string
  phone_numbers: Array<{
    id: string
    phone_number: string
    status: string
    regulatory_requirements: Array<{ requirement_group_id: string }>
  }>
}

export interface TelnyxPhoneNumber {
  id: string
  phone_number: string
  status: string
  connection_id: string | null
}

export class TelnyxProvisioningError extends Error {
  constructor(
    message: string,
    public readonly code: 'SEARCH_FAILED' | 'NO_NUMBERS_AVAILABLE' | 'PURCHASE_FAILED' | 'ASSIGN_FAILED' | 'RELEASE_FAILED' | 'API_ERROR',
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'TelnyxProvisioningError'
  }
}

// ============================================================================
// Config
// ============================================================================

const TELNYX_API_BASE = 'https://api.telnyx.com/v2'

const getConfig = () => ({
  apiKey: process.env.TELNYX_API_KEY ?? '',
  sipConnectionId: process.env.TELNYX_SIP_CONNECTION_ID ?? '',
  requirementGroupId: process.env.TELNYX_REQUIREMENT_GROUP_ID ?? '',
})

const telnyxFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const { apiKey } = getConfig()
  if (!apiKey) {
    throw new TelnyxProvisioningError('TELNYX_API_KEY not configured', 'API_ERROR')
  }

  const url = `${TELNYX_API_BASE}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error')
    logger.error(
      { status: response.status, url, body: errorBody },
      '❌ [TELNYX] API request failed'
    )
    throw new TelnyxProvisioningError(
      `Telnyx API error: ${response.status} ${response.statusText}`,
      'API_ERROR',
      { status: response.status, body: errorBody }
    )
  }

  return response.json() as Promise<T>
}

// ============================================================================
// Service
// ============================================================================

/**
 * Searches for available Belgian phone numbers with SIP trunking support.
 * Uses REST direct (not SDK — Telnyx SDK Issue #289: filters ignored).
 */
export const searchAvailableNumbers = async (
  locality?: string,
  limit = 5
): Promise<TelnyxAvailableNumber[]> => {
  const params = new URLSearchParams({
    'filter[country_code]': 'BE',
    'filter[features][]': 'sip_trunking',
    'filter[limit]': String(limit),
  })

  if (locality) {
    params.set('filter[locality]', locality)
  }

  const result = await telnyxFetch<{ data: TelnyxAvailableNumber[] }>(
    `/available_phone_numbers?${params.toString()}`
  )

  if (!result.data || result.data.length === 0) {
    throw new TelnyxProvisioningError(
      `No Belgian numbers available${locality ? ` in ${locality}` : ''}`,
      'NO_NUMBERS_AVAILABLE'
    )
  }

  logger.info(
    { count: result.data.length, locality },
    '📞 [TELNYX] Found available numbers'
  )

  return result.data
}

/**
 * Purchases a phone number and assigns it to the SIP connection.
 * IMPORTANT: requirement_group_id goes INSIDE each phone_number object, NOT top-level.
 */
export const purchaseNumber = async (
  phoneNumber: string,
  teamId: string
): Promise<{ orderId: string; phoneNumberId: string; phoneNumber: string }> => {
  const { sipConnectionId, requirementGroupId } = getConfig()

  const orderPayload = {
    connection_id: sipConnectionId,
    customer_reference: `seido-team-${teamId}`,
    phone_numbers: [
      {
        phone_number: phoneNumber,
        ...(requirementGroupId ? { requirement_group_id: requirementGroupId } : {}),
      },
    ],
  }

  logger.info(
    { phoneNumber, teamId },
    '📞 [TELNYX] Purchasing number'
  )

  let order: { data: TelnyxNumberOrder }
  try {
    order = await telnyxFetch<{ data: TelnyxNumberOrder }>('/number_orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    })
  } catch (error) {
    throw new TelnyxProvisioningError(
      `Failed to purchase number ${phoneNumber}`,
      'PURCHASE_FAILED',
      { phoneNumber, originalError: error instanceof Error ? error.message : String(error) }
    )
  }

  const purchasedNumber = order.data.phone_numbers[0]
  if (!purchasedNumber?.id) {
    throw new TelnyxProvisioningError(
      'Purchase order returned but no phone number ID',
      'PURCHASE_FAILED',
      { orderId: order.data.id }
    )
  }

  logger.info(
    { orderId: order.data.id, phoneNumberId: purchasedNumber.id, phoneNumber },
    '✅ [TELNYX] Number purchased successfully'
  )

  return {
    orderId: order.data.id,
    phoneNumberId: purchasedNumber.id,
    phoneNumber: purchasedNumber.phone_number,
  }
}

/**
 * Assigns a phone number to the SIP connection (if not already assigned during purchase).
 */
export const assignToConnection = async (phoneNumberId: string): Promise<void> => {
  const { sipConnectionId } = getConfig()

  try {
    await telnyxFetch(`/phone_numbers/${phoneNumberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ connection_id: sipConnectionId }),
    })

    logger.info(
      { phoneNumberId, sipConnectionId },
      '✅ [TELNYX] Number assigned to SIP connection'
    )
  } catch (error) {
    throw new TelnyxProvisioningError(
      `Failed to assign number ${phoneNumberId} to SIP connection`,
      'ASSIGN_FAILED',
      { phoneNumberId, originalError: error instanceof Error ? error.message : String(error) }
    )
  }
}

/**
 * Releases a phone number (enters hold + aging period).
 */
export const releaseNumber = async (phoneNumberId: string): Promise<void> => {
  try {
    await telnyxFetch(`/phone_numbers/${phoneNumberId}`, {
      method: 'DELETE',
    })

    logger.info({ phoneNumberId }, '✅ [TELNYX] Number released')
  } catch (error) {
    throw new TelnyxProvisioningError(
      `Failed to release number ${phoneNumberId}`,
      'RELEASE_FAILED',
      { phoneNumberId, originalError: error instanceof Error ? error.message : String(error) }
    )
  }
}

/**
 * Searches and purchases the first available Belgian number.
 * Convenience method combining search + purchase.
 */
export const searchAndPurchase = async (
  teamId: string,
  locality?: string
): Promise<{ orderId: string; phoneNumberId: string; phoneNumber: string }> => {
  const available = await searchAvailableNumbers(locality, 1)
  return purchaseNumber(available[0].phone_number, teamId)
}
