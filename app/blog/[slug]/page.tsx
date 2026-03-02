import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Calendar, Clock, User, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { JsonLd } from '@/components/seo/json-ld'
import { getArticleBySlug, getAllSlugs } from '@/lib/blog'
import { BlogMarkdown } from '@/components/blog/blog-markdown'

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>
}

export const generateStaticParams = async () => {
  return (await getAllSlugs()).map((slug) => ({ slug }))
}

export const generateMetadata = async ({
  params,
}: BlogArticlePageProps): Promise<Metadata> => {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    return { title: 'Article introuvable' }
  }

  return {
    title: article.title,
    description: article.description,
    authors: [{ name: article.author }],
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.date,
      authors: [article.author],
      locale: 'fr_BE',
      siteName: 'SEIDO',
      tags: article.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
    },
    alternates: {
      canonical: `https://www.seido-app.com/blog/${article.slug}`,
    },
  }
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  const formattedDate = new Date(article.date).toLocaleDateString('fr-BE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.description,
          datePublished: article.date,
          author: {
            '@type': 'Organization',
            name: article.author,
            url: 'https://www.seido-app.com',
          },
          publisher: {
            '@type': 'Organization',
            name: 'SEIDO',
            url: 'https://www.seido-app.com',
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://www.seido-app.com/blog/${article.slug}`,
          },
          keywords: article.tags.join(', '),
        }}
      />

      <div className="container mx-auto px-4 py-6 md:py-10">
        {/* Breadcrumb */}
        <nav className="max-w-4xl mx-auto mb-6 flex items-center gap-2 text-sm text-white/50">
          <Link href="/" className="hover:text-white transition-colors">
            Accueil
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-white transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-white/70 truncate">{article.title}</span>
        </nav>

        {/* Back link */}
        <div className="max-w-4xl mx-auto mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Tous les articles
          </Link>
        </div>

        {/* Article header */}
        <header className="max-w-4xl mx-auto mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge
              variant="outline"
              className="border-blue-500/50 text-blue-300 bg-blue-500/10"
            >
              {article.category}
            </Badge>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            {article.title}
          </h1>

          <p className="text-lg text-white/70 mb-6 leading-relaxed">
            {article.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {article.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {article.reading_time}
            </span>
          </div>
        </header>

        {/* Article content */}
        <article className="max-w-4xl mx-auto">
          <div className="p-6 md:p-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <BlogMarkdown content={article.content} />
          </div>
        </article>

        {/* Tags */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-white/40" />
            {article.tags.map((tag) => (
              <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                <Badge
                  variant="outline"
                  className="border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
                >
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
