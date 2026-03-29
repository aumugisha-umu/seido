"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Bell, Mail, AlertTriangle, Phone, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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

interface AiStatusSummary {
  isActive: boolean
  phoneNumber: string | null
  minutesUsed: number
  minutesIncluded: number
  callsCount: number
  tier: string | null
}

interface SettingsPageProps {
  role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
  dashboardPath?: string
  defaultLotCount?: number
  aiStatus?: AiStatusSummary | null
}

export default function SettingsPage({ role, aiStatus }: SettingsPageProps) {
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

          {/* AI Assistant — compact card */}
          {role === 'gestionnaire' && (
            <AiAssistantCard aiStatus={aiStatus ?? null} onNavigate={() => router.push('/gestionnaire/parametres/assistant-ia')} />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// AI Assistant Compact Card
// ============================================================================

function AiAssistantCard({ aiStatus, onNavigate }: { aiStatus: AiStatusSummary | null; onNavigate: () => void }) {
  if (aiStatus?.isActive) {
    const usagePercent = aiStatus.minutesIncluded > 0
      ? Math.min((aiStatus.minutesUsed / aiStatus.minutesIncluded) * 100, 100)
      : 0

    return (
      <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onNavigate}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Assistant IA
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">
                Actif
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiStatus.phoneNumber && (
            <p className="text-sm font-mono text-muted-foreground">{aiStatus.phoneNumber}</p>
          )}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{aiStatus.minutesUsed} / {aiStatus.minutesIncluded} conv.</span>
              <span>{Math.round(usagePercent)}%</span>
            </div>
            <Progress value={usagePercent} className="h-1.5" />
          </div>
          <p className="text-xs text-muted-foreground">
            {aiStatus.callsCount} conversation{aiStatus.callsCount !== 1 ? 's' : ''} ce mois
          </p>
        </CardContent>
      </Card>
    )
  }

  // Not active — discovery card
  return (
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onNavigate}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Assistant IA
            </CardTitle>
            <CardDescription className="mt-1">
              Un assistant WhatsApp 24/7 pour vos locataires.{' '}
              <span className="font-medium text-foreground">A partir de 49&euro;/mois</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">Decouvrir</span>
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
