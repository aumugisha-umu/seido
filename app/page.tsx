import { LandingPage } from '@/components/landing'
import { JsonLd } from '@/components/seo/json-ld'
import type { Metadata } from 'next'
import { faq } from '@/data/faq'

export const metadata: Metadata = {
  title: 'Gestion Locative Simplifiee — Gagnez 2h/jour | SEIDO',
  description: 'SEIDO connecte gestionnaires, prestataires et locataires sur une seule plateforme. Interventions, documents, communication : tout au meme endroit. Essai gratuit.',
  openGraph: {
    title: 'Gestion Locative Simplifiee — Gagnez 2h/jour | SEIDO',
    description: 'SEIDO connecte gestionnaires, prestataires et locataires sur une seule plateforme. Interventions, documents, communication : tout au meme endroit. Essai gratuit.',
    images: ['/images/preview_image.webp'],
    type: 'website',
    url: 'https://www.seido-app.com',
    siteName: 'SEIDO',
    locale: 'fr_BE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestion Locative Simplifiee — Gagnez 2h/jour | SEIDO',
    description: 'SEIDO connecte gestionnaires, prestataires et locataires sur une seule plateforme. Interventions, documents, communication : tout au meme endroit. Essai gratuit.',
    images: ['/images/preview_image.webp'],
  },
  alternates: {
    canonical: 'https://www.seido-app.com',
  },
}

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              name: 'SEIDO',
              url: 'https://www.seido-app.com',
              logo: 'https://www.seido-app.com/images/Logo/Logo_Seido_Color.png',
              description: 'Plateforme de gestion locative tout-en-un pour gestionnaires immobiliers en Belgique',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'contact@seido-app.com',
                contactType: 'customer service',
                availableLanguage: ['French', 'English', 'Dutch'],
              },
              sameAs: ['https://www.linkedin.com/company/seido-app'],
              areaServed: ['BE', 'FR'],
              knowsLanguage: ['fr', 'en', 'nl'],
            },
            {
              '@type': 'SoftwareApplication',
              name: 'SEIDO',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'EUR',
                description: 'Essai gratuit — puis 5 EUR/lot/mois ou 50 EUR/lot/an',
              },
              featureList: [
                'Gestion interventions multi-statut',
                'Portail locataire self-service',
                'Portail prestataire',
                'Gestion documents (GED)',
                'Notifications push PWA',
                'Communication multi-canal',
                'Gestion multi-equipe',
              ],
            },
            {
              '@type': 'FAQPage',
              mainEntity: faq.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: item.answer,
                },
              })),
            },
          ],
        }}
      />
      <LandingPage />
    </>
  )
}
