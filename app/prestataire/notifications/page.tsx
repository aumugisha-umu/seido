"use client"

import { PersonalNotificationsPage } from "@/components/notifications"

/**
 * Prestataire notifications page
 * Uses the shared PersonalNotificationsPage component
 */
export default function NotificationsPage() {
  return (
    <PersonalNotificationsPage
      backHref="/prestataire/dashboard"
      subtitle="Vos missions et notifications"
    />
  )
}
