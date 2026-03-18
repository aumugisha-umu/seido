import { notFound } from 'next/navigation'
import ModalsAuditClient from './modals-audit-client'

export const dynamic = 'force-dynamic'

export default function ModalsAuditPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return <ModalsAuditClient />
}
