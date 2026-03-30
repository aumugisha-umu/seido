import { LandingPage } from '@/components/landing'
import { JsonLd } from '@/components/seo/json-ld'
import type { Metadata } from 'next'
import { faq } from '@/data/faq'
import { testimonials } from '@/data/testimonials'
import { getLatestArticles } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Logiciel Gestion Locative Belgique — De 10h à 1h/semaine | SEIDO',
  description: 'Logiciel de gestion locative belge tout-en-un. Centralisez WhatsApp, email et appels locataires. Triage IA automatique. Essai gratuit 1 mois, sans carte.',
  openGraph: {
    title: 'Logiciel Gestion Locative Belgique — De 10h à 1h/semaine | SEIDO',
    description: 'Logiciel de gestion locative belge tout-en-un. Centralisez WhatsApp, email et appels locataires. Triage IA automatique. Essai gratuit 1 mois, sans carte.',
    images: ['/images/preview_image.webp'],
    type: 'website',
    url: 'https://www.seido-app.com',
    siteName: 'SEIDO',
    locale: 'fr_BE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Logiciel Gestion Locative Belgique — De 10h à 1h/semaine | SEIDO',
    description: 'Logiciel de gestion locative belge tout-en-un. Centralisez WhatsApp, email et appels locataires. Triage IA automatique. Essai gratuit 1 mois, sans carte.',
    images: ['/images/preview_image.webp'],
  },
  alternates: {
    canonical: 'https://www.seido-app.com',
    languages: {
      'fr-BE': 'https://www.seido-app.com',
      'x-default': 'https://www.seido-app.com',
    },
  },
}

export default async function HomePage() {
  // Server-side: read latest blog articles from filesystem (cached)
  const latestArticles = await getLatestArticles(3)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              name: 'SEIDO',
              url: 'https://www.seido-app.com',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://www.seido-app.com/blog?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            },
            {
              '@type': 'Organization',
              name: 'SEIDO',
              legalName: 'UMUMENTUM SRL',
              url: 'https://www.seido-app.com',
              logo: 'https://www.seido-app.com/images/Logo/Logo_Seido_Color.png',
              description: 'Plateforme de gestion locative tout-en-un pour gestionnaires immobiliers en Belgique',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Rue de Grand-Bigard 14',
                addressLocality: 'Berchem-Sainte-Agathe',
                postalCode: '1082',
                addressCountry: 'BE',
              },
              vatID: 'BE0775691974',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'info@seido-app.com',
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
              url: 'https://www.seido-app.com',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'EUR',
                description: 'Essai gratuit — puis 5 EUR/lot/mois ou 50 EUR/lot/an',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '5',
                reviewCount: '5',
                bestRating: '5',
              },
              featureList: [
                'Centralisation multicanal (WhatsApp, email, téléphone, SMS)',
                'Triage IA automatique des demandes locataires',
                'Gestion interventions 9 statuts avec workflow complet',
                'Portail locataire self-service',
                'Portail prestataire avec devis et planification',
                'Assistant IA vocal et WhatsApp',
                'Gestion documents et emails connectés',
                'Conforme RGPD — Hébergement EU (Frankfurt)',
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
            ...testimonials.map((t) => ({
              '@type': 'Review' as const,
              datePublished: '2026-01-15',
              author: {
                '@type': 'Person' as const,
                name: t.author,
              },
              reviewRating: {
                '@type': 'Rating' as const,
                ratingValue: String(t.rating),
                bestRating: '5',
              },
              reviewBody: t.quote,
              itemReviewed: {
                '@type': 'SoftwareApplication' as const,
                name: 'SEIDO',
              },
            })),
          ],
        }}
      />
      <LandingPage latestArticles={latestArticles} />
    </>
  )
}
