import { NextRequest } from 'next/server'
import { handleTwilioIncoming } from '@/app/api/webhooks/whatsapp/route'

// ============================================================================
// POST — Receive incoming SMS messages from Twilio
// ============================================================================
// Same routing logic as WhatsApp — reuses handleTwilioIncoming with channel='sms'

export async function POST(request: NextRequest) {
  return handleTwilioIncoming(request, 'sms', '/api/webhooks/sms')
}
