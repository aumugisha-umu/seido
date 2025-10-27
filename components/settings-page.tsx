"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Smartphone } from "lucide-react"
import { PushNotificationToggle } from "@/components/push-notification-toggle"
import { TestNotificationsPanel } from "@/components/test-notifications-panel"
import { InstallPWAButton } from "@/components/install-pwa-button"

interface SettingsPageProps {
  role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
  dashboardPath: string
}

export default function SettingsPage({ role, dashboardPath }: SettingsPageProps) {
  const { user } = useAuth()
  const router = useRouter()

  const handleBack = () => {
    router.push(dashboardPath)
  }

  if (!user) {
    return <div>Chargement...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Paramètres</h1>
        </div>

        <div className="space-y-6">
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

          {/* Test notifications push */}
          <TestNotificationsPanel />

          {/* Installation PWA */}
          <InstallPWAButton />
        </div>
      </div>
    </div>
  )
}
