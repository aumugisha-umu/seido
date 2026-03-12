import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getAllArticles, getAllCategories, getTagsWithFrequency } from '@/lib/blog'
import { JsonLd } from '@/components/seo/json-ld'
import { BlogListClient } from '@/components/blog/blog-list-client'

export const metadata: Metadata = {
  title: 'Blog — Actualités gestion immobilière Belgique',
  description:
    'Articles et analyses sur la gestion immobilière en Belgique : réglementation PEB, copropriété, fiscalité, rénovation énergétique, droits des propriétaires et locataires.',
  alternates: {
    canonical: 'https://www.seido-app.com/blog',
    languages: {
      'fr-BE': 'https://www.seido-app.com/blog',
      'x-default': 'https://www.seido-app.com/blog',
    },
  },
  openGraph: {
    title: 'Blog SEIDO — Actualités gestion immobilière Belgique',
    description:
      'Articles et analyses pour gestionnaires immobiliers belges : réglementation, fiscalité, copropriété.',
    type: 'website',
    locale: 'fr_BE',
    siteName: 'SEIDO',
  },
}

export default async function BlogIndexPage() {
  const [articles, categories, tagsWithFrequency] = await Promise.all([
    getAllArticles(),
    getAllCategories(),
    getTagsWithFrequency(),
  ])

  // Strip content from articles for the list (only need metadata)
  const articleMetas = articles.map(({ content: _content, ...meta }) => meta)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Blog',
              name: 'Blog SEIDO — Actualités gestion immobilière Belgique',
              description: 'Analyses, décryptages et conseils pratiques pour gestionnaires immobiliers en Belgique.',
              url: 'https://www.seido-app.com/blog',
              publisher: {
                '@type': 'Organization',
                name: 'SEIDO',
                url: 'https://www.seido-app.com',
              },
              inLanguage: 'fr-BE',
              blogPost: articles.slice(0, 5).map((a) => ({
                '@type': 'BlogPosting',
                headline: a.title,
                url: `https://www.seido-app.com/blog/${a.slug}`,
                datePublished: a.date,
                dateModified: a.updated_at || a.date,
              })),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Accueil',
                  item: 'https://www.seido-app.com',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Blog',
                  item: 'https://www.seido-app.com/blog',
                },
              ],
            },
          ],
        }}
      />
      <div className="container mx-auto px-4 py-6 md:py-10">

        {/* Blog heading — visible H1 for SEO */}
        <div className="max-w-6xl mx-auto mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Actualités gestion immobilière Belgique
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Analyses, décryptages et conseils pratiques pour gestionnaires immobiliers, propriétaires et syndics.
          </p>
        </div>

        {/* Article list with filters */}
        <div className="max-w-6xl mx-auto">
          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-64 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <BlogListClient
              articles={articleMetas}
              categories={categories}
              tagsWithFrequency={tagsWithFrequency}
            />
          </Suspense>
        </div>

      </div>
    </>
  )
}
