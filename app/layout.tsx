import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import Script from "next/script"
import { AuthProvider } from "@/hooks/use-auth"
import { TeamStatusProvider } from "@/hooks/use-team-status"
import { CookieConsentProvider } from "@/hooks/use-cookie-consent"
import { CookieConsentBanner } from "@/components/cookie-consent-banner"
import { AnalyticsProvider } from "@/components/analytics-provider"
import { ConnectionStatus } from "@/components/connection-status"
import { Toaster } from "@/components/ui/toaster"
import EnvironmentLogger from "@/components/environment-logger"
import LoggerInitializer from "@/components/logger-initializer"
import { PWARegister } from "@/components/pwa-register"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import "./globals.css"

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
        className={`h-screen font-sans ${GeistSans.variable} ${GeistMono.variable} overflow-x-hidden`}
        suppressHydrationWarning={true}
      >
        <PWARegister />
        <LoggerInitializer />
        <EnvironmentLogger />
        <AuthProvider>
          <TeamStatusProvider>
            <ImpersonationBanner />
            <CookieConsentProvider>
              <AnalyticsProvider>
                <Suspense fallback={null}>{children}</Suspense>
              </AnalyticsProvider>
              <ConnectionStatus />
              <Toaster />
              <CookieConsentBanner />
            </CookieConsentProvider>
          </TeamStatusProvider>
        </AuthProvider>
        <Analytics />
        <Script
          src="https://t.contentsquare.net/uxa/b3cbc84e830fe.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
