/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  eslint: {
    // Ignore ESLint errors during build (Vercel deployment)
    ignoreDuringBuilds: true,
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      'date-fns'
    ],
    // Externalize Supabase packages to avoid Edge Runtime conflicts
    serverComponentsExternalPackages: ['@supabase/supabase-js', '@supabase/ssr']
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

module.exports = withBundleAnalyzer(nextConfig)