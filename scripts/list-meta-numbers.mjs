/**
 * List phone numbers registered on Meta WABA
 * Usage: node scripts/list-meta-numbers.mjs
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const token = process.env.META_WHATSAPP_ACCESS_TOKEN
const wabaId = process.env.META_WHATSAPP_BUSINESS_ID

if (!token || !wabaId) {
  console.error('Missing META_WHATSAPP_ACCESS_TOKEN or META_WHATSAPP_BUSINESS_ID')
  process.exit(1)
}

const res = await fetch(
  `https://graph.facebook.com/v23.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`,
  { headers: { Authorization: `Bearer ${token}` } }
)

const data = await res.json()
console.log(JSON.stringify(data, null, 2))
