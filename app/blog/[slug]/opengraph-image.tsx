import { ImageResponse } from 'next/og'
import { getArticleBySlug } from '@/lib/blog'

export const runtime = 'nodejs'

export const alt = 'SEIDO Blog'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Article introuvable
        </div>
      ),
      { ...size }
    )
  }

  const formattedDate = new Date(article.date).toLocaleDateString('fr-BE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          padding: '60px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient accent */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Top bar: logo + category */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '40px',
          }}
        >
          {/* SEIDO logo text */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 700,
              }}
            >
              S
            </div>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '2px',
              }}
            >
              SEIDO
            </span>
          </div>

          {/* Category badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              borderRadius: '20px',
              backgroundColor: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              color: '#60a5fa',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            {article.category}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              fontSize: article.title.length > 80 ? '36px' : article.title.length > 50 ? '44px' : '52px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              margin: 0,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {article.title}
          </h1>
        </div>

        {/* Bottom bar: author + date */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Author avatar placeholder */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              {article.author.charAt(0).toUpperCase()}
            </div>
            <span
              style={{
                fontSize: '18px',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 500,
              }}
            >
              {article.author}
            </span>
          </div>

          <span
            style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {formattedDate}
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
