/**
 * Check WABA status, limits, and business verification
 * Usage: node scripts/check-waba-status.mjs
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const token = process.env.META_WHATSAPP_ACCESS_TOKEN
const wabaId = process.env.META_WHATSAPP_BUSINESS_ID

if (!token || !wabaId) {
  console.error('Missing META_WHATSAPP_ACCESS_TOKEN or META_WHATSAPP_BUSINESS_ID')
  process.exit(1)
}

console.log(`\nChecking WABA: ${wabaId}\n`)

// 1. WABA details
const wabaRes = await fetch(
  `https://graph.facebook.com/v23.0/${wabaId}?fields=id,name,currency,message_template_namespace,account_review_status,business_verification_status,ownership_type,on_behalf_of_business_info`,
  { headers: { Authorization: `Bearer ${token}` } }
)
const waba = await wabaRes.json()
console.log('=== WABA Details ===')
console.log(JSON.stringify(waba, null, 2))

// 2. Phone numbers
const phonesRes = await fetch(
  `https://graph.facebook.com/v23.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,status,name_status`,
  { headers: { Authorization: `Bearer ${token}` } }
)
const phones = await phonesRes.json()
console.log('\n=== Phone Numbers ===')
console.log(JSON.stringify(phones, null, 2))

// 3. Business portfolio (if available from WABA)
if (waba.on_behalf_of_business_info?.id) {
  const bizId = waba.on_behalf_of_business_info.id
  const bizRes = await fetch(
    `https://graph.facebook.com/v23.0/${bizId}?fields=id,name,verification_status,is_disabled_for_integrity_reasons`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const biz = await bizRes.json()
  console.log('\n=== Business Portfolio ===')
  console.log(JSON.stringify(biz, null, 2))
}
