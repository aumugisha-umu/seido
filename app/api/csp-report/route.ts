import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const report = body['csp-report'] || body

    logger.warn('CSP violation report', {
      blockedUri: report['blocked-uri'],
      violatedDirective: report['violated-directive'],
      documentUri: report['document-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
    })

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 400 })
  }
}
