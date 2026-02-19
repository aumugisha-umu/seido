import { MetadataRoute } from 'next'

/**
 * Sitemap dynamique pour SEIDO
 *
 * Contient uniquement les routes PUBLIQUES accessibles aux crawlers.
 * Les routes protegees (auth, admin, gestionnaire, prestataire, locataire)
 * sont bloquees par robots.ts et ne doivent pas etre indexees.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.seido-app.com'

  return [
    // Page d'accueil (landing)
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
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
