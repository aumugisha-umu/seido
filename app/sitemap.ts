import { MetadataRoute } from 'next'
import { getAllArticles } from '@/lib/blog'

/**
 * Sitemap dynamique pour SEIDO
 *
 * Contient uniquement les routes PUBLIQUES accessibles aux crawlers.
 * Les routes protegees (auth, admin, gestionnaire, prestataire, locataire)
 * sont bloquees par robots.ts et ne doivent pas etre indexees.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.seido-app.com'

  // Dynamic blog article entries
  const articles = await getAllArticles()
  const blogEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: new Date(article.updated_at || article.date),
    changeFrequency: 'monthly' as const,
    priority: article.type === 'hub' ? 0.8 : 0.7,
  }))

  return [
    // Page d'accueil (landing)
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Blog index
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Blog articles (dynamic)
    ...blogEntries,
    // Pages legales
    {
      url: `${baseUrl}/conditions-generales`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/confidentialite`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
