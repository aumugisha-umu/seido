/**
 * Page de Test des Notifications Multi-Canal
 *
 * Permet de tester manuellement le système de notifications:
 * - Phase 1: Database notifications
 * - Phase 2: Email notifications (Resend)
 * - Phase 3: Push notifications (à venir)
 */

import { getServerAuthContext } from '@/lib/server-context'
import { TestNotificationsClient } from './test-notifications-client'

export default async function TestNotificationsPage() {
  const { user, profile, team } = await getServerAuthContext('gestionnaire')

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Test des Notifications Multi-Canal
          </h1>
          <p className="text-gray-600">
            Déclenchez manuellement les notifications pour tester chaque canal (Database, Email, Push)
          </p>
        </div>

        {/* Client Component */}
        <TestNotificationsClient
          userId={profile.id}
          userEmail={user.email || ''}
          teamId={team.id}
        />
      </div>
    </div>
  )
}
