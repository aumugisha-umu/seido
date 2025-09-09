import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/hooks/use-auth"
import { TeamStatusProvider } from "@/hooks/use-team-status"
import { ConnectionStatus } from "@/components/connection-status"
import "./globals.css"

export const metadata: Metadata = {
  title: "SEIDO - Gestion Immobilière",
  description: "Plateforme de gestion immobilière multi-rôles pour propriétaires, locataires et prestataires",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body 
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <TeamStatusProvider>
            <Suspense fallback={null}>{children}</Suspense>
            <ConnectionStatus />
          </TeamStatusProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
