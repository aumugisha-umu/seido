'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Lazy-loaded InterventionChatTab with chat skeleton.
 * Shared across gestionnaire, prestataire, and locataire intervention detail views.
 * Reduces initial bundle size — loaded on demand only when the chat tab is active.
 */
export const LazyInterventionChatTab = dynamic(
  () => import('@/components/interventions/intervention-chat-tab').then(mod => ({ default: mod.InterventionChatTab })),
  {
    loading: () => (
      <div className="flex-1 flex flex-col p-4 space-y-4">
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="flex-1 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} rounded-lg`} />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    ),
    ssr: false
  }
)
