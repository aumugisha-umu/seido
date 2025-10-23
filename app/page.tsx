import { LandingPageV1 } from '@/components/landing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SEIDO - Plateforme de gestion immobilière',
  description: 'Centralisez vos demandes, coordonnez vos prestataires, satisfaites vos locataires. SEIDO simplifie la gestion de vos interventions de A à Z. À partir de 3€/lot/mois.',
  keywords: ['gestion immobilière', 'interventions', 'maintenance', 'gestionnaire', 'prestataire', 'locataire', 'SaaS immobilier'],
  openGraph: {
    title: 'SEIDO - Fini le calvaire de la coordination des interventions',
    description: 'Centralisez vos demandes, coordonnez vos prestataires, satisfaites vos locataires.',
    images: ['/images/mockup_desktop.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEIDO - Plateforme de gestion immobilière',
    description: 'Simplifiez la gestion de vos interventions immobilières',
    images: ['/images/mockup_desktop.png'],
  },
}

export default function HomePage() {
  return <LandingPageV1 />
}
