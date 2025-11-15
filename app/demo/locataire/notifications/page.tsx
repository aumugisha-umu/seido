/**
 * Page Notifications Locataire - Mode Démo
 */

'use client'

import NotificationsPageComponent from '@/components/notifications-page'
import { useDemoNotificationsWrapper } from '@/hooks/demo/use-demo-notifications-wrapper'
import { useDemoActivityLogsWrapper } from '@/hooks/demo/use-demo-activity-logs-wrapper'
import { useDemoContext } from '@/lib/demo/demo-context'

export default function LocataireNotificationsPageDemo() {
  const { getCurrentUser } = useDemoContext()
  const user = getCurrentUser()

  const getUserTeam = () => {
    if (!user?.team_id) return null
    return { id: user.team_id }
  }

  return (
    <NotificationsPageComponent
      role="locataire"
      dashboardPath="/demo/locataire/dashboard"
      useNotificationsHook={useDemoNotificationsWrapper}
      useActivityLogsHook={useDemoActivityLogsWrapper}
      getUserTeam={getUserTeam}
      teamStatus="verified"
    />
  )
}
