import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // ✅ PHASE 2: Optimisations bundle et performance
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'lucide-react'
    ]
  },

  // ✅ Configuration webpack pour optimisation bundle
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Code splitting optimisé pour auth
      config.optimization.splitChunks.cacheGroups.auth = {
        name: 'auth',
        test: /[\\/]lib[\\/](auth-service|auth-cache|supabase)\.ts$/,
        chunks: 'all',
        priority: 10,
        enforce: true
      }

      // Chunk séparé pour les composants UI lourds
      config.optimization.splitChunks.cacheGroups.ui = {
        name: 'ui-components',
        test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
        chunks: 'all',
        priority: 9,
        enforce: true
      }

      // Chunk pour Supabase
      config.optimization.splitChunks.cacheGroups.supabase = {
        name: 'supabase',
        test: /[\\/]node_modules[\\/]@supabase[\\/]/,
        chunks: 'all',
        priority: 8,
        enforce: true
      }
    }

    return config
  },

  // ✅ Optimisation des imports pour tree shaking (configuration simplifiée)
  modularizeImports: {
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}.js'
    }
  }
}

export default withBundleAnalyzer(nextConfig)
