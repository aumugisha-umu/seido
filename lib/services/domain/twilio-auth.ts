// ============================================================================
// Shared Twilio auth helper (Basic Auth for Twilio REST API — no SDK needed)
// Used by: twilio-number.service.ts, twilio-whatsapp.service.ts
// ============================================================================

export interface TwilioAuth {
  sid: string
  token: string
  header: string
}

export const getTwilioAuth = (): TwilioAuth => {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required')
  return {
    sid,
    token,
    header: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
  }
}

export const TWILIO_API = 'https://api.twilio.com/2010-04-01'
