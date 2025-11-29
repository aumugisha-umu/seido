'use client'

/**
 * 🔄 REALTIME WRAPPER - Client Component pour les Layouts
 *
 * Composant client qui enveloppe les children avec le RealtimeProvider.
 * Utilisé dans les layouts Server Components pour fournir le contexte Realtime
 * à toute l'application.
 *
 * @example
 * ```tsx
 * // Dans un Server Component layout
 * import { RealtimeWrapper } from '@/components/realtime-wrapper'
 *
 * export default async function Layout({ children }) {
 *   const { profile, team } = await getServerAuthContext('gestionnaire')
 *   return (
 *     <RealtimeWrapper userId={profile.id} teamId={team?.id}>
 *       {children}
 *     </RealtimeWrapper>
 *   )
 * }
 * ```
 *
 * @created 2025-11-28
 */

import { type ReactNode } from 'react'
import { RealtimeProvider } from '@/contexts/realtime-context'

interface RealtimeWrapperProps {
  /** ID de l'utilisateur connecté */
  userId: string
  /** ID de l'équipe (optionnel) */
  teamId?: string
  children: ReactNode
}

export function RealtimeWrapper({ userId, teamId, children }: RealtimeWrapperProps) {
  return (
    <RealtimeProvider userId={userId} teamId={teamId}>
      {children}
    </RealtimeProvider>
  )
}
