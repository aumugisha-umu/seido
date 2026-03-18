import { notFound } from 'next/navigation'
import DebugConfirmationsClient from './debug-confirmations-client'

export const dynamic = 'force-dynamic'

export default function DebugConfirmationsPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return <DebugConfirmationsClient />
}
