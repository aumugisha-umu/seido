import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Providers } from "./providers"
import { AuthProvider } from "@/hooks/use-auth"
import { TeamStatusProvider } from "@/hooks/use-team-status"
import { ConnectionStatus } from "@/components/connection-status"
import { Toaster } from "@/components/ui/toaster"
import EnvironmentLogger from "@/components/environment-logger"
import LoggerInitializer from "@/components/logger-initializer"
import { PWARegister } from "@/components/pwa-register"
import "./globals.css"

// Font configuration - Material Design 3 compliant
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "SEIDO - Gestion Immobilière",
  description: "Plateforme de gestion immobilière multi-rôles pour propriétaires, gestionnaires, locataires et prestataires",
  generator: "v0.app",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SEIDO'
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }
    ]
  }
}

// ✅ Next.js 15 API - viewport séparé de metadata
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e40af'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`h-screen font-sans ${inter.variable} ${jetbrainsMono.variable} overflow-x-hidden antialiased`}
        suppressHydrationWarning={true}
      >
        <Providers>
          <PWARegister />
          <LoggerInitializer />
          <EnvironmentLogger />
          <AuthProvider>
            <TeamStatusProvider>
              <Suspense fallback={null}>{children}</Suspense>
              <ConnectionStatus />
              <Toaster />
            </TeamStatusProvider>
          </AuthProvider>
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
