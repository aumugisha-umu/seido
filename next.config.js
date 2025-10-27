/** @type {import('next').NextConfig} */
const withSerwist = require('@serwist/next').default({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  register: false
})

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
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