import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verification successful')
    return new Response(challenge, { status: 200 })
  }

  console.warn('[WhatsApp Webhook] Verification failed — token mismatch or missing params')
  return new Response('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  // TODO: implement full webhook handler (US-003)
  return Response.json({ ok: true })
}
