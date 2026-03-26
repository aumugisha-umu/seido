import { BetaAccessGate } from '@/app/auth/beta-access-gate'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demander un acces | SEIDO',
  description: 'Demandez votre acces a SEIDO, la plateforme de gestion locative nouvelle generation.',
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return <BetaAccessGate />
}
