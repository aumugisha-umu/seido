/** @type {import('next').NextConfig} */
const withSerwist = require('@serwist/next').default({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  // ✅ FIX: Désactiver le SW en dev pour éviter les problèmes de cache/CSP
  // Le SW cause des blocages quand il y a des erreurs CSP ou timeout
  // Pour tester la PWA, faire un build de production
  disable: process.env.NODE_ENV === 'development',
  register: false
})

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  // Vanity URL redirects → canonical auth routes
  async redirects() {
    return [
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/signup', destination: '/auth/signup', permanent: true },
      { source: '/signin', destination: '/auth/login', permanent: true },
      { source: '/register', destination: '/auth/signup', permanent: true },
    ]
  },

  // Security and cache headers for all routes
  async headers() {
    return [
      {
        // Immutable cache for hashed static assets (JS, CSS, fonts)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/:path*',
        headers: [
          // Protection against clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          // Protection against MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // XSS Protection (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.contentsquare.net https://*.contentsquare.com https://*.vercel-insights.com https://*.vercel-scripts.com https://*.vercel.app https://*.frill.co https://maps.googleapis.com https://*.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://*.frill.co https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://lh3.googleusercontent.com",
              "font-src 'self' data: https://frill-prod-app.b-cdn.net https://fonts.gstatic.com",
              "connect-src 'self' http://127.0.0.1:* http://localhost:* https://*.supabase.co wss://*.supabase.co https://*.contentsquare.net https://*.contentsquare.com https://*.vercel-insights.com https://*.vercel-scripts.com https://*.frill.co https://frill-prod-app.b-cdn.net https://lh3.googleusercontent.com https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://fonts.gstatic.com",
              "frame-src 'self' https://*.frill.co https://*.google.com",
              "frame-ancestors 'self'",
              "media-src 'self' blob:",
              "worker-src 'self' blob:"
            ].join('; ')
          },
          // HSTS — enforce HTTPS for 2 years
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains'
          },
          // Restrict browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
          },
          // Cache compression hint
          {
            key: 'Vary',
            value: 'Accept-Encoding'
          },
          // CSP Report-Only — stricter than enforced CSP, reports violations without blocking (production only)
          ...(process.env.NODE_ENV !== 'development' ? [{
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "script-src 'self' 'unsafe-inline' https://*.contentsquare.net https://*.contentsquare.com https://*.vercel-insights.com https://*.vercel-scripts.com https://*.vercel.app https://*.frill.co https://maps.googleapis.com https://*.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://*.frill.co https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://lh3.googleusercontent.com",
              "font-src 'self' data: https://frill-prod-app.b-cdn.net https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.contentsquare.net https://*.contentsquare.com https://*.vercel-insights.com https://*.vercel-scripts.com https://*.frill.co https://frill-prod-app.b-cdn.net https://lh3.googleusercontent.com https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://fonts.gstatic.com",
              "frame-src 'self' https://*.frill.co https://*.google.com",
              "frame-ancestors 'self'",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
              "report-uri /api/csp-report"
            ].join('; ')
          }] : [])
        ]
      }
    ]
  },

  eslint: {
    // Ignore ESLint errors during build (Vercel deployment)
    ignoreDuringBuilds: true,
  },

  typescript: {
    // Ignore TypeScript errors during build (Vercel deployment)
    // We check types separately with `tsc --noEmit`
    ignoreBuildErrors: true,
  },

  // Externalize Supabase and React Email packages to avoid Edge Runtime conflicts (Next.js 15+)
  serverExternalPackages: [
    '@supabase/supabase-js',
    '@supabase/ssr',
    '@react-email/render',
    '@react-email/components',
    'pino',
  ],

  experimental: {
    // ✅ US-403: Partial Prerendering - static shells served from cache, dynamic content streamed
    // Requires Suspense boundaries around dynamic parts (done in US-401)
    // NOTE: ppr requires Next.js canary version. Enable when upgrading to canary:
    // ppr: true,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-avatar',
      'date-fns',
      'recharts'  // ⚡ Added: ~150KB savings via tree-shaking
    ]
  },
}

module.exports = withSerwist(withBundleAnalyzer(nextConfig))