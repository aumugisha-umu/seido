import { logger } from '@/lib/logger'
import { getTwilioAuth, TWILIO_API } from '@/lib/services/domain/twilio-auth'
import type { MessageChannel } from './types'

// ============================================================================
// Channel-aware phone formatting
// ============================================================================

const formatPhone = (phone: string, channel: MessageChannel): string =>
  channel === 'whatsapp' ? `whatsapp:${phone}` : phone

// ============================================================================
// Send WhatsApp text message
// ============================================================================

export const sendWhatsAppMessage = async (
  fromNumber: string,
  to: string,
  body: string,
  channel: MessageChannel = 'whatsapp'
): Promise<string> => {
  const { sid, header } = getTwilioAuth()

  const params = new URLSearchParams({
    From: formatPhone(fromNumber, channel),
    To: formatPhone(to, channel),
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
    throw new Error(`Twilio ${channel} send failed (${response.status}): ${error}`)
  }

  const data = await response.json() as { sid: string }
  const messageSid = data.sid

  logger.info({ messageSid, to, channel }, '[TWILIO] Message sent')
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
// Disambiguation: text-based quick reply for multi-team tenants
// ============================================================================

export const sendDisambiguationMessage = async (
  fromNumber: string,
  to: string,
  options: Array<{ id: string; label: string }>,
  channel: MessageChannel = 'whatsapp'
): Promise<string> => {
  const optionsList = options
    .map((opt, i) => `${i + 1}. ${opt.label}`)
    .join('\n')

  const body = `Bonjour ! Vous êtes lié à plusieurs gestionnaires.\nPour quelle adresse souhaitez-vous signaler un problème ?\n\n${optionsList}\n\nRépondez avec le numéro correspondant.`

  return sendWhatsAppMessage(fromNumber, to, body, channel)
}

/**
 * Parse a tenant's reply to a disambiguation message.
 * Returns the 0-indexed option index, or null if the reply is not a valid choice.
 */
export const parseDisambiguationReply = (
  body: string,
  optionCount: number
): number | null => {
  const trimmed = body.trim()
  const num = parseInt(trimmed, 10)
  if (!isNaN(num) && num >= 1 && num <= optionCount) {
    return num - 1
  }
  return null
}

// ============================================================================
// Re-export Twilio signature validation
// ============================================================================

export { validateTwilioSignature } from '@/lib/services/domain/ai-phone/twilio-number.service'
