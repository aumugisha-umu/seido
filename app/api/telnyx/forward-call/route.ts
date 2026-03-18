/**
 * Temporary TeXML endpoint for Telnyx call forwarding.
 * Forwards all incoming calls to a mobile number.
 * Used for one-time Meta WhatsApp number verification.
 * DELETE THIS FILE after verification is complete.
 */
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const forwardTo = process.env.TELNYX_FORWARD_TO_NUMBER

  if (!forwardTo) {
    console.error(
      '[forward-call] TELNYX_FORWARD_TO_NUMBER not set in .env.local — calls will not ring'
    )
  }

  const body = await request.json().catch(() => ({}))
  console.log('[forward-call] Telnyx webhook:', body.data?.event_type, '→ forward to', forwardTo || '(not set)')

  // For inbound calls, Telnyx requires <Answer> before <Dial>
  const texml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Answer />
  <Dial callerId="+3226010784" timeout="45">
    <Number>${forwardTo || '+32470000000'}</Number>
  </Dial>
</Response>`

  return new Response(texml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  })
}
