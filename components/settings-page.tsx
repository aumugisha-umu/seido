"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Bell, Mail, AlertTriangle, Phone } from "lucide-react"
import { PushNotificationToggle } from "@/components/push-notification-toggle"
import { InstallPWAButton } from "@/components/install-pwa-button"
import { SubscriptionSummaryCard } from "@/components/billing/subscription-summary-card"

// Lightweight error boundary for billing section
class BillingErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-muted-foreground">
              Impossible de charger les informations d&apos;abonnement. Rechargez la page.
            </p>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}

interface SettingsPageProps {
  role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
  dashboardPath?: string
  defaultLotCount?: number
}

export default function SettingsPage({ role }: SettingsPageProps) {
  const { user } = useAuth()
  const router = useRouter()

  if (!user) {
    return <div>Chargement...</div>
  }

  return (
    <div className="layout-padding">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Installation PWA */}
          <InstallPWAButton />

          {/* Notifications push */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Préférences de notifications
              </CardTitle>
              <CardDescription>
                Activez les notifications push pour recevoir des alertes en temps réel sur cet appareil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PushNotificationToggle userId={user.id} />
            </CardContent>
          </Card>

          {/* Abonnement summary (Gestionnaire only) */}
          {role === 'gestionnaire' && (
            <BillingErrorBoundary>
              <SubscriptionSummaryCard />
            </BillingErrorBoundary>
          )}

          {/* Email Settings (Gestionnaire only) */}
          {role === 'gestionnaire' && (
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push('/gestionnaire/parametres/emails')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Intégration Email
                </CardTitle>
                <CardDescription>
                  Connectez vos comptes email pour synchroniser et envoyer des messages.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* AI Phone Assistant (Gestionnaire only) */}
          {role === 'gestionnaire' && (
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push('/gestionnaire/parametres/assistant-ia')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Assistant IA Téléphonique
                </CardTitle>
                <CardDescription>
                  Activez un assistant vocal IA pour recevoir les demandes d&apos;intervention par téléphone.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
