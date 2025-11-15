/**
 * Page Paramètres Admin - Mode Démo
 */

import SettingsPage from "@/components/settings-page"

export default function AdminParametresPageDemo() {
  return (
    <SettingsPage
      role="admin"
      dashboardPath="/demo/admin/dashboard"
    />
  )
}
