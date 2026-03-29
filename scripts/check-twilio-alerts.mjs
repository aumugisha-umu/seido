/**
 * Check Twilio error alerts (recent sender registration errors)
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sid = process.env.TWILIO_ACCOUNT_SID
const token = process.env.TWILIO_AUTH_TOKEN
const auth = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')

const res = await fetch(
  'https://monitor.twilio.com/v1/Alerts?PageSize=10',
  { headers: { Authorization: auth } }
)

const data = await res.json()

if (!data.alerts?.length) {
  console.log('No recent alerts')
} else {
  for (const alert of data.alerts) {
    console.log(`[${alert.date_created}] Code: ${alert.error_code} — ${alert.alert_text?.slice(0, 200)}`)
    console.log(`  Resource: ${alert.resource_sid}`)
    console.log('')
  }
}
