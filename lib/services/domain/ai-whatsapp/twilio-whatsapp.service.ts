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
// Property selection: confirmation (1 property) or numbered list (2+)
// ============================================================================

export const sendPropertySelectionMessage = async (
  fromNumber: string,
  to: string,
  properties: Array<{ label: string }>,
  channel: MessageChannel = 'whatsapp'
): Promise<string> => {
  const isSms = channel === 'sms'

  if (properties.length === 1) {
    const prop = properties[0]
    const body = isSms
      ? `Votre message concerne ${prop.label} ? OUI/NON`
      : `Votre message concerne *${prop.label}* ?\n\nRépondez *OUI* ou *NON*.`
    return sendWhatsAppMessage(fromNumber, to, body, channel)
  }

  const list = properties
    .map((p, i) => `${i + 1}. ${isSms ? p.label.slice(0, 60) : p.label}`)
    .join('\n')

  const otherIndex = properties.length + 1
  const otherLabel = isSms ? 'Autre' : 'Autre chose'

  const body = isSms
    ? `Quel logement ?\n${list}\n${otherIndex}. ${otherLabel}\nRepondez avec le numero.`
    : `Quel logement concerne votre message ?\n\n${list}\n${otherIndex}. ${otherLabel}\n\nRépondez avec le numéro.`

  return sendWhatsAppMessage(fromNumber, to, body, channel)
}

/**
 * Parse a confirmation reply (OUI/NON).
 * Returns true for yes, false for no, null for unrecognized.
 */
export const parseConfirmationReply = (body: string): boolean | null => {
  const trimmed = body.trim().toLowerCase()
  if (['oui', 'yes', 'o', 'y', '1', 'ok', 'ouais', 'ja'].includes(trimmed)) return true
  if (['non', 'no', 'n', '2', 'nee', 'neen'].includes(trimmed)) return false
  return null
}

// ============================================================================
// Intervention selection: numbered list for providers
// ============================================================================

export const sendInterventionSelectionMessage = async (
  fromNumber: string,
  to: string,
  interventions: Array<{ label: string }>,
  channel: MessageChannel = 'whatsapp'
): Promise<string> => {
  const isSms = channel === 'sms'

  const list = interventions
    .map((iv, i) => `${i + 1}. ${isSms ? iv.label.slice(0, 60) : iv.label}`)
    .join('\n')

  const newIndex = interventions.length + 1
  const newLabel = isSms ? 'Nouveau probleme' : 'Nouveau problème'

  const body = isSms
    ? `Vos interventions actives :\n${list}\n${newIndex}. ${newLabel}\nRepondez avec le numero.`
    : `Vos interventions actives :\n\n${list}\n${newIndex}. ${newLabel}\n\nRépondez avec le numéro correspondant.`

  return sendWhatsAppMessage(fromNumber, to, body, channel)
}

// ============================================================================
// Team selection: numbered list for multi-team contacts
// ============================================================================

export const sendTeamSelectionMessage = async (
  fromNumber: string,
  to: string,
  teams: Array<{ label: string }>,
  channel: MessageChannel = 'whatsapp'
): Promise<string> => {
  const isSms = channel === 'sms'

  const list = teams
    .map((t, i) => `${i + 1}. ${t.label}`)
    .join('\n')

  const otherIndex = teams.length + 1
  const otherLabel = isSms ? 'Autre' : 'Autre agence'

  const body = isSms
    ? `Plusieurs gestionnaires :\n${list}\n${otherIndex}. ${otherLabel}\nRepondez avec le numero.`
    : `Vous êtes lié à plusieurs gestionnaires.\n\n${list}\n${otherIndex}. ${otherLabel}\n\nRépondez avec le numéro.`

  return sendWhatsAppMessage(fromNumber, to, body, channel)
}

// ============================================================================
// Re-export Twilio signature validation
// ============================================================================

export { validateTwilioSignature } from '@/lib/services/domain/ai-phone/twilio-number.service'
