/**
 * Test AI WhatsApp Provisioning Flow (Twilio Senders API)
 *
 * Modes:
 *   --mode=register    Register existing Twilio number as WhatsApp Sender
 *   --mode=status      Check registration status of a sender
 *   --mode=list        List all registered WhatsApp senders
 *
 * Usage:
 *   node scripts/test-provisioning.mjs --mode=register --phone=+32460257659
 *   node scripts/test-provisioning.mjs --mode=register --phone=+32460257659 --webhook=https://abc.ngrok.app/api/webhooks/whatsapp
 *   node scripts/test-provisioning.mjs --mode=status --sender-sid=XExxxxxxxx
 *   node scripts/test-provisioning.mjs --mode=list
 *
 * Requires .env.local with:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (for DB upsert)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// ============================================================================
// Config
// ============================================================================

const TEAM_ID = '6bd50107-f31a-4f3f-943f-d0afacec181d'
const TWILIO_SENDERS_API = 'https://messaging.twilio.com/v2/Channels/Senders'

const args = parseArgs(process.argv.slice(2))
const MODE = args.mode ?? 'register'
const PHONE = args.phone ?? process.env.DEV_WHATSAPP_PHONE_NUMBER ?? '+32460257659'
const SENDER_SID = args['sender-sid'] ?? ''
const WEBHOOK_URL = args.webhook ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/webhooks/whatsapp`

// ============================================================================
// Env validation
// ============================================================================

const twilioSid = process.env.TWILIO_ACCOUNT_SID
const twilioToken = process.env.TWILIO_AUTH_TOKEN

if (!twilioSid || !twilioToken) {
  console.error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env.local')
  process.exit(1)
}

const twilioAuth = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')

// ============================================================================
// Helpers
// ============================================================================

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    const match = arg.match(/^--(\w[\w-]*)=(.+)$/)
    if (match) result[match[1]] = match[2]
    else if (arg.startsWith('--')) result[arg.slice(2)] = true
  }
  return result
}

function log(emoji, msg, data) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] ${emoji} ${msg}`)
  if (data) console.log('  ', JSON.stringify(data, null, 2).split('\n').join('\n   '))
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    log('!!', 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping DB operations')
    return null
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ============================================================================
// Twilio Senders API
// ============================================================================

async function registerWhatsAppSender(phoneNumber, webhookUrl) {
  log('>>',`Registering ${phoneNumber} as WhatsApp Sender...`)
  log('>>',`Webhook: ${webhookUrl}`)

  const res = await fetch(TWILIO_SENDERS_API, {
    method: 'POST',
    headers: {
      Authorization: twilioAuth,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      sender_id: `whatsapp:${phoneNumber}`,
      profile: {
        name: 'Seido',
        about: 'Gestion immobiliere intelligente',
        description: 'Seido - Plateforme de gestion immobiliere avec assistant IA',
        address: 'Bruxelles, Belgique',
        vertical: 'Other',
        websites: ['https://seido-app.com'],
      },
      webhook: {
        callback_url: webhookUrl,
        callback_method: 'POST',
      },
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Twilio Senders API ${res.status}: ${JSON.stringify(data, null, 2)}`)
  }

  return data
}

async function getSenderStatus(senderSid) {
  const res = await fetch(`${TWILIO_SENDERS_API}/${senderSid}`, {
    headers: {
      Authorization: twilioAuth,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Twilio Senders API ${res.status}: ${JSON.stringify(data, null, 2)}`)
  }

  return data
}

async function listSenders() {
  const res = await fetch(TWILIO_SENDERS_API, {
    headers: {
      Authorization: twilioAuth,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Twilio Senders API ${res.status}: ${JSON.stringify(data, null, 2)}`)
  }

  return data
}

async function pollSenderStatus(senderSid, maxSeconds = 300) {
  log('..', `Polling status for ${senderSid} (max ${maxSeconds}s)...`)
  log('  ', 'Twilio auto-verifies OTP for SMS-capable numbers — no manual step needed')
  console.log('')

  const start = Date.now()
  while (Date.now() - start < maxSeconds * 1000) {
    const sender = await getSenderStatus(senderSid)
    const status = sender.status

    if (status === 'ONLINE') {
      log('OK', 'WhatsApp Sender is ONLINE — ready to send/receive messages!')
      return sender
    }

    if (status === 'OFFLINE') {
      log('!!', 'Sender is OFFLINE — check Twilio Console Error Log for details')
      log('  ', 'Full response:', sender)
      return sender
    }

    const elapsed = Math.round((Date.now() - start) / 1000)
    process.stdout.write(`\r  .. Waiting... ${elapsed}s (status: ${status})`)
    await new Promise(r => setTimeout(r, 10000))
  }

  console.log('')
  log('!!', 'Timeout — check status later with:')
  log('  ', `node scripts/test-provisioning.mjs --mode=status --sender-sid=${senderSid}`)
  return null
}

// ============================================================================
// DB operations
// ============================================================================

async function upsertPhoneRecord(supabase, phoneNumber, status, extra = {}) {
  const { data, error } = await supabase
    .from('ai_phone_numbers')
    .upsert(
      {
        team_id: TEAM_ID,
        phone_number: phoneNumber,
        whatsapp_number: phoneNumber,
        is_active: true,
        whatsapp_enabled: true,
        provisioning_status: status,
        provisioning_error: null,
        meta_phone_number_id: null,
        ...extra,
      },
      { onConflict: 'team_id' }
    )
    .select('id')
    .single()

  if (error) throw new Error(`DB upsert failed: ${error.message}`)
  log('DB', `Record upserted (status=${status})`, { id: data.id })
  return data.id
}

// ============================================================================
// Main flows
// ============================================================================

async function modeRegister() {
  log('>>', `Mode: register`)
  log('>>', `Phone: ${PHONE}`)
  log('>>', `Team: ${TEAM_ID}`)
  log('>>', `Webhook: ${WEBHOOK_URL}`)
  console.log('')

  // Step 1: Register with Twilio Senders API
  let sender
  try {
    sender = await registerWhatsAppSender(PHONE, WEBHOOK_URL)
  } catch (err) {
    log('!!', `Registration failed: ${err.message}`)
    process.exit(1)
  }

  log('OK', `Sender created!`, {
    sid: sender.sid,
    status: sender.status,
    sender_id: sender.sender_id,
  })

  // Step 2: Upsert DB record
  const supabase = getSupabase()
  if (supabase) {
    try {
      await upsertPhoneRecord(supabase, PHONE, 'active')
    } catch (err) {
      log('!!', `DB upsert failed (non-blocking): ${err.message}`)
    }
  }

  // Step 3: Poll for ONLINE status
  console.log('')
  log('>>',  'Polling Twilio for sender status...')
  log('  ', 'Status flow: CREATING -> ONLINE (auto-verified for Twilio numbers)')
  console.log('')

  await pollSenderStatus(sender.sid)
}

async function modeStatus() {
  if (!SENDER_SID) {
    log('!!', 'Missing --sender-sid=XExxxxxxxx')
    log('  ', 'Use --mode=list to find your sender SID')
    process.exit(1)
  }

  log('>>', `Checking sender: ${SENDER_SID}`)
  const sender = await getSenderStatus(SENDER_SID)
  log('OK', `Sender status:`, sender)
}

async function modeList() {
  log('>>', 'Listing all WhatsApp senders...')
  const data = await listSenders()

  if (!data.senders?.length) {
    log('  ', 'No senders registered')
    return
  }

  for (const s of data.senders) {
    console.log(`  ${s.status.padEnd(12)} ${s.sender_id.padEnd(25)} SID: ${s.sid}`)
  }
  console.log(`\n  Total: ${data.senders.length} sender(s)`)
}

// ============================================================================
// Entry point
// ============================================================================

console.log('')
console.log('--- SEIDO WhatsApp Provisioning (Twilio Senders API) ---')
console.log('')

try {
  if (MODE === 'register') {
    await modeRegister()
  } else if (MODE === 'status') {
    await modeStatus()
  } else if (MODE === 'list') {
    await modeList()
  } else {
    console.error(`Unknown mode: ${MODE}`)
    console.error('Usage: --mode=register | --mode=status | --mode=list')
    process.exit(1)
  }
} catch (err) {
  log('!!', `Unexpected error: ${err.message}`)
  console.error(err)
  process.exit(1)
}
