import { LandingPage } from '@/components/landing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Seido, la gestion locative simplifiée',
  description: 'Une plateforme intelligente qui connecte gestionnaires, prestataires et locataires. Gagnez jusqu\'à 2h par jour en optimisant la gestion opérationnelle de votre patrimoine.',
  keywords: ['gestion immobilière', 'interventions', 'maintenance', 'gestionnaire', 'prestataire', 'locataire', 'SaaS immobilier'],
  openGraph: {
    title: 'Seido, la gestion locative simplifiée',
    description: 'Une plateforme intelligente qui connecte gestionnaires, prestataires et locataires. Gagnez jusqu\'à 2h par jour en optimisant la gestion opérationnelle de votre patrimoine.',
    images: ['/images/preview_image.webp'],
    type: 'website',
    url: 'https://www.seido-app.com',
    siteName: 'SEIDO',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seido, la gestion locative simplifiée',
    description: 'Une plateforme intelligente qui connecte gestionnaires, prestataires et locataires. Gagnez jusqu\'à 2h par jour en optimisant la gestion opérationnelle de votre patrimoine.',
    images: ['/images/preview_image.webp'],
  },
}

export default function HomePage() {
  return <LandingPage />
}
