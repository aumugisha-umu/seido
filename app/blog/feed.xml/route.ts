import { getAllArticles } from '@/lib/blog'

const BASE_URL = 'https://www.seido-app.com'

const escapeXml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export const GET = async () => {
  const articles = await getAllArticles()
  const feedArticles = articles.filter((a) => a.type !== 'hub')

  const lastBuildDate = feedArticles.length > 0
    ? new Date(feedArticles[0].date).toUTCString()
    : new Date().toUTCString()

  const items = feedArticles
    .map((article) => {
      const pubDate = new Date(article.date).toUTCString()
      const link = `${BASE_URL}/blog/${article.slug}`

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(article.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      <category>${escapeXml(article.category)}</category>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog SEIDO — Gestion Locative Belgique</title>
    <link>${BASE_URL}/blog</link>
    <description>Analyses, décryptages et conseils pratiques pour gestionnaires immobiliers en Belgique</description>
    <language>fr-BE</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
