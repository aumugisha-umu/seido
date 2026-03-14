import { notFound } from 'next/navigation'
import DebugOnboardingClient from './debug-onboarding-client'

export const dynamic = 'force-dynamic'

export default function DebugOnboardingPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return <DebugOnboardingClient />
}
