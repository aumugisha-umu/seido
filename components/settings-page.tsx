"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Smartphone, Mail } from "lucide-react"
import { PushNotificationToggle } from "@/components/push-notification-toggle"
import { InstallPWAButton } from "@/components/install-pwa-button"
import { SubscriptionManagementSection } from "@/components/subscription-management-section"

interface SettingsPageProps {
  role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
  dashboardPath: string
  defaultLotCount?: number
}

export default function SettingsPage({ role, dashboardPath, defaultLotCount }: SettingsPageProps) {
  const { user } = useAuth()
  const router = useRouter()

  const handleBack = () => {
    router.push(dashboardPath)
  }

  if (!user) {
    return <div>Chargement...</div>
  }

  return (
    <div className="layout-padding">
      <div className="max-w-4xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Paramètres</h1>
        </div>

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

          {/* Gestion d'abonnement (Gestionnaire only) */}
          {role === 'gestionnaire' && <SubscriptionManagementSection defaultLotCount={defaultLotCount} />}

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
        </div>
      </div>
    </div>
  )
}
