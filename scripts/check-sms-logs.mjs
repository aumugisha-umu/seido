/**
 * Check recent SMS messages received on the Seido number
 * Usage: node scripts/check-sms-logs.mjs
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sid = process.env.TWILIO_ACCOUNT_SID
const token = process.env.TWILIO_AUTH_TOKEN
const auth = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')

// Check incoming SMS to our number
const res = await fetch(
  `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?To=%2B32460257659&PageSize=10`,
  { headers: { Authorization: auth } }
)

const data = await res.json()

if (!data.messages?.length) {
  console.log('No recent SMS to +32460257659')
} else {
  console.log(`Found ${data.messages.length} messages:\n`)
  for (const m of data.messages) {
    console.log(`[${m.date_sent}] From: ${m.from}`)
    console.log(`  Body: ${m.body}`)
    console.log(`  Status: ${m.status}`)
    console.log('')
  }
}
