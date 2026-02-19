import { MetadataRoute } from 'next'

/**
 * Configuration robots.txt pour SEIDO
 *
 * Bloque les routes protegees (auth, API, dashboards par role)
 * tout en autorisant l'indexation des pages publiques.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/',
        '/admin/',
        '/gestionnaire/',
        '/prestataire/',
        '/locataire/',
        '/dashboard/',
      ],
    },
    sitemap: 'https://www.seido-app.com/sitemap.xml',
  }
}
