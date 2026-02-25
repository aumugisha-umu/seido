import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getAllArticles, getAllCategories, getAllTags } from '@/lib/blog'
import { BlogListClient } from '@/components/blog/blog-list-client'

export const metadata: Metadata = {
  title: 'Blog — Actualites gestion immobiliere Belgique',
  description:
    'Articles et analyses sur la gestion immobiliere en Belgique : reglementation PEB, copropriete, fiscalite, renovation energetique, droits des proprietaires et locataires.',
  alternates: {
    canonical: 'https://www.seido-app.com/blog',
  },
  openGraph: {
    title: 'Blog SEIDO — Actualites gestion immobiliere Belgique',
    description:
      'Articles et analyses pour gestionnaires immobiliers belges : reglementation, fiscalite, copropriete.',
    type: 'website',
    locale: 'fr_BE',
    siteName: 'SEIDO',
  },
}

export default function BlogIndexPage() {
  const articles = getAllArticles()
  const categories = getAllCategories()
  const tags = getAllTags()

  // Strip content from articles for the list (only need metadata)
  const articleMetas = articles.map(({ content: _content, ...meta }) => meta)

  return (
    <>
      <div className="container mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="max-w-4xl mx-auto mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Actualites gestion immobiliere Belgique
          </h1>
          <p className="text-lg text-white/60 leading-relaxed">
            Analyses, decryptages et conseils pratiques pour gestionnaires
            immobiliers, proprietaires et syndics en Belgique.
          </p>
        </header>

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
              tags={tags}
            />
          </Suspense>
        </div>

      </div>
    </>
  )
}
