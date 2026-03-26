import { NextResponse } from 'next/server'
import { z } from 'zod'
import { EMAIL_CONFIG, isResendConfigured } from '@/lib/email/resend-client'
import { emailService } from '@/lib/email/email-service'
import { logger } from '@/lib/logger'

const demoRequestSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  lotsCount: z.string().min(1).max(50),
  message: z.string().min(1).max(5000),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = demoRequestSchema.parse(body)

    if (!isResendConfigured()) {
      logger.warn('[DEMO-REQUEST] Resend not configured — skipping email')
      return NextResponse.json({ success: true })
    }

    const result = await emailService.sendDemoRequestEmail(
      EMAIL_CONFIG.contactEmail,
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        lotsCount: data.lotsCount,
        message: data.message,
      }
    )

    if (!result.success) {
      logger.error({ error: result.error }, '[DEMO-REQUEST] Failed to send email')
      return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
    }

    logger.info({ name: data.name, email: data.email }, '[DEMO-REQUEST] Email sent')
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }
    logger.error({ err }, '[DEMO-REQUEST] Unexpected error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
