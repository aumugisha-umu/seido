"use client"

import { PersonalNotificationsPage } from "@/components/notifications"

/**
 * Locataire notifications page
 * Uses the shared PersonalNotificationsPage component
 */
export default function NotificationsPage() {
  return (
    <PersonalNotificationsPage
      backHref="/locataire/dashboard"
      subtitle="Vos notifications personnelles"
    />
  )
}
