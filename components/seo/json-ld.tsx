/**
 * JSON-LD Structured Data Component
 *
 * Renders schema.org structured data for SEO and AI crawlers.
 * Uses XSS-safe serialization to prevent script injection.
 *
 * @see https://developers.google.com/search/docs/appearance/structured-data
 * @see seo-strategist agent: Schema Markup Strategy
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
