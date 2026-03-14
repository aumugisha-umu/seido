import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/hooks/use-auth"
import { TeamStatusProvider } from "@/hooks/use-team-status"
import { CookieConsentProvider } from "@/hooks/use-cookie-consent"
import { CookieConsentBanner } from "@/components/cookie-consent-banner"
import { AnalyticsProvider } from "@/components/analytics-provider"
import { ConnectionStatus } from "@/components/connection-status"
import { Toaster as SonnerToaster } from "sonner"
import EnvironmentLogger from "@/components/environment-logger"
import LoggerInitializer from "@/components/logger-initializer"
import { PWARegister } from "@/components/pwa-register"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { NotificationPromptProvider } from "@/contexts/notification-prompt-context"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.seido-app.com'),
  title: { default: 'SEIDO — Gestion Locative', template: '%s | SEIDO' },
  description: "Plateforme de gestion immobilière multi-rôles pour propriétaires, gestionnaires, locataires et prestataires",
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
          <NotificationPromptProvider>
            <TeamStatusProvider>
              <ImpersonationBanner />
              <CookieConsentProvider>
                <AnalyticsProvider>
                  <Suspense fallback={null}>{children}</Suspense>
                </AnalyticsProvider>
                <ConnectionStatus />
                <SonnerToaster position="top-right" richColors closeButton />
                <CookieConsentBanner />
              </CookieConsentProvider>
            </TeamStatusProvider>
          </NotificationPromptProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
