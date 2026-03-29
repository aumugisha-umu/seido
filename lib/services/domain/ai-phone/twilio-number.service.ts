import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '@/lib/logger'
import { getTwilioAuth, TWILIO_API } from '@/lib/services/domain/twilio-auth'

// ============================================================================
// Search available phone numbers
// ============================================================================

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
}

export const searchAvailableNumbers = async (
  countryCode: string,
  limit = 5
): Promise<AvailableNumber[]> => {
  const { sid, header } = getTwilioAuth()

  const params = new URLSearchParams({
    SmsEnabled: 'true',
    PageSize: String(limit),
  })

  const response = await fetch(
    `${TWILIO_API}/Accounts/${sid}/AvailablePhoneNumbers/${countryCode}/Mobile.json?${params}`,
    { headers: { Authorization: header } }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio search failed (${response.status}): ${error}`)
  }

  const data = await response.json() as {
    available_phone_numbers: { phone_number: string; friendly_name: string }[]
  }

  return data.available_phone_numbers.map((n) => ({
    phoneNumber: n.phone_number,
    friendlyName: n.friendly_name,
  }))
}

// ============================================================================
// Purchase a phone number + configure SMS webhook
// ============================================================================

interface PurchasedNumber {
  sid: string
  phoneNumber: string
}

export const purchaseNumber = async (
  phoneNumber: string
): Promise<PurchasedNumber> => {
  const { sid, header } = getTwilioAuth()

  const body = new URLSearchParams({
    PhoneNumber: phoneNumber,
  })

  const response = await fetch(
    `${TWILIO_API}/Accounts/${sid}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        Authorization: header,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio purchase failed (${response.status}): ${error}`)
  }

  const data = await response.json() as { sid: string; phone_number: string }

  logger.info(
    { numberSid: data.sid, phoneNumber: data.phone_number },
    '[TWILIO-NUM] Number purchased'
  )

  return { sid: data.sid, phoneNumber: data.phone_number }
}

// ============================================================================
// Release a phone number
// ============================================================================

export const releaseNumber = async (numberSid: string): Promise<void> => {
  const { sid, header } = getTwilioAuth()

  const response = await fetch(
    `${TWILIO_API}/Accounts/${sid}/IncomingPhoneNumbers/${numberSid}.json`,
    {
      method: 'DELETE',
      headers: { Authorization: header },
    }
  )

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    throw new Error(`Twilio release failed (${response.status}): ${error}`)
  }

  logger.info({ numberSid }, '[TWILIO-NUM] Number released')
}

// ============================================================================
// Validate Twilio webhook signature (manual — no SDK)
// HMAC-SHA1: sort params, concat URL + key1value1key2value2, Base64
// ============================================================================

export const validateTwilioSignature = (
  url: string,
  params: Record<string, string>,
  signature: string
): boolean => {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) return false

  // Build the data string: URL + sorted params concatenated
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }

  const expected = createHmac('sha1', token)
    .update(data)
    .digest('base64')

  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)
  if (expectedBuf.length !== signatureBuf.length) return false
  return timingSafeEqual(expectedBuf, signatureBuf)
}
