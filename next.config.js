/** @type {import('next').NextConfig} */
const withSerwist = require('@serwist/next').default({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: false, // ⚠️ Activé en dev pour tester la PWA sur localhost
  register: false
})

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  // Security and cache headers for all routes
  async headers() {
    return [
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.contentsquare.net https://*.contentsquare.com https://*.vercel-insights.com https://*.vercel.app",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.contentsquare.net https://*.contentsquare.com https://*.vercel-insights.com",
              "frame-ancestors 'self'",
              "media-src 'self' blob:",
              "worker-src 'self' blob:"
            ].join('; ')
          },
          // Cache compression hint
          {
            key: 'Vary',
            value: 'Accept-Encoding'
          }
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
    '@react-email/components'
  ],

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      'date-fns'
    ]
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize for client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        'lodash': 'lodash-es'
      }
    }

    return config
  }
}

module.exports = withSerwist(withBundleAnalyzer(nextConfig))