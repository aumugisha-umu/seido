import { logger } from '@/lib/logger'
import { getTwilioAuth, TWILIO_API } from '@/lib/services/domain/twilio-auth'

// ============================================================================
// Send WhatsApp text message
// ============================================================================

export const sendWhatsAppMessage = async (
  fromNumber: string,
  to: string,
  body: string
): Promise<string> => {
  const { sid, header } = getTwilioAuth()

  const params = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: `whatsapp:${to}`,
    Body: body,
  })

  const response = await fetch(
    `${TWILIO_API}/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: header,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio WhatsApp send failed (${response.status}): ${error}`)
  }

  const data = await response.json() as { sid: string }
  const messageSid = data.sid

  logger.info({ messageSid, to }, '[TWILIO-WA] Message sent')
  return messageSid
}

// ============================================================================
// Send WhatsApp media message (image with caption)
// ============================================================================

export const sendWhatsAppMediaMessage = async (
  fromNumber: string,
  to: string,
  caption: string,
  mediaUrl: string
): Promise<string> => {
  const { sid, header } = getTwilioAuth()

  const params = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: `whatsapp:${to}`,
    Body: caption,
    MediaUrl: mediaUrl,
  })

  const response = await fetch(
    `${TWILIO_API}/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: header,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio WhatsApp media send failed (${response.status}): ${error}`)
  }

  const data = await response.json() as { sid: string }
  const messageSid = data.sid

  logger.info({ messageSid, to }, '[TWILIO-WA] Media message sent')
  return messageSid
}

// ============================================================================
// Download media from Twilio (single authenticated fetch)
// ============================================================================

export const downloadMedia = async (mediaUrl: string): Promise<{
  buffer: Buffer
  contentType: string
}> => {
  const { header } = getTwilioAuth()

  const response = await fetch(mediaUrl, {
    headers: { Authorization: header },
  })

  if (!response.ok) {
    throw new Error(`Twilio media download failed (${response.status})`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'

  logger.info({ mediaUrl, contentType, size: buffer.length }, '[TWILIO-WA] Media downloaded')
  return { buffer, contentType }
}

// ============================================================================
// Re-export Twilio signature validation
// ============================================================================

export { validateTwilioSignature } from '@/lib/services/domain/ai-phone/twilio-number.service'
