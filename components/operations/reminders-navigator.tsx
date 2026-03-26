'use client'

import { useMemo } from 'react'
import { ListTodo, Clock, Loader2, CheckCircle } from 'lucide-react'
import ContentNavigator from '@/components/content-navigator'
import { RemindersViewContainer } from '@/components/operations/reminders-view-container'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeSwitcherV1 } from '@/components/interventions/view-mode-switcher-v1'
import type { ReminderWithRelations } from '@/lib/types/reminder.types'
import type { ReminderStatus } from '@/lib/types/reminder.types'

// ============================================================================
// TYPES
// ============================================================================

interface EmptyStateConfig {
  title: string
  description: string
  showCreateButton?: boolean
  createButtonText?: string
  createButtonAction?: () => void
}

interface RemindersNavigatorProps {
  reminders: ReminderWithRelations[]
  loading?: boolean
  className?: string
  emptyStateConfig?: EmptyStateConfig
  onStart?: (id: string) => void
  onComplete?: (id: string) => void
  onCancel?: (id: string) => void
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function RemindersEmptyState({ config }: { config?: EmptyStateConfig }) {
  if (!config) return null

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <p className="text-base font-medium text-foreground">{config.title}</p>
      <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
      {config.showCreateButton && config.createButtonAction && (
        <button
          onClick={config.createButtonAction}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          {config.createButtonText || 'Creer'}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RemindersNavigator({
  reminders,
  loading = false,
  className = '',
  emptyStateConfig,
  onStart,
  onComplete,
  onCancel,
}: RemindersNavigatorProps) {
  // View mode (cards on mobile, user choice on desktop)
  const { viewMode, setViewMode, isMobile } = useViewMode({
    defaultMode: 'cards',
    storageKey: 'reminders-view-mode',
  })
  const effectiveViewMode = isMobile ? 'cards' : viewMode

  // Filter reminders by status
  const filterByStatus = (status?: ReminderStatus) => {
    if (!status) {
      // "Toutes" = all non-deleted (deleted_at is already filtered server-side)
      return reminders.filter(
        (r) => (r.status as ReminderStatus) !== 'annule'
      )
    }
    return reminders.filter((r) => (r.status as ReminderStatus) === status)
  }

  const allActive = filterByStatus()
  const enAttente = filterByStatus('en_attente')
  const enCours = filterByStatus('en_cours')
  const terminees = filterByStatus('termine')

  // Render tab content or empty state
  const renderTabContent = (filtered: ReminderWithRelations[], tabEmptyTitle: string, tabEmptyDesc: string) => {
    if (loading) {
      return (
        <div className="animate-pulse space-y-2 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      )
    }

    if (filtered.length === 0) {
      return (
        <RemindersEmptyState
          config={{
            ...emptyStateConfig,
            title: emptyStateConfig?.title || tabEmptyTitle,
            description: emptyStateConfig?.description || tabEmptyDesc,
          }}
        />
      )
    }

    return (
      <RemindersViewContainer
        reminders={filtered}
        viewMode={effectiveViewMode}
        onStart={onStart}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    )
  }

  const tabs = useMemo(
    () => [
      {
        id: 'toutes',
        label: 'Toutes',
        icon: ListTodo,
        count: allActive.length,
        content: renderTabContent(
          allActive,
          'Aucun rappel',
          'Les rappels apparaitront ici'
        ),
      },
      {
        id: 'en_attente',
        label: 'En attente',
        icon: Clock,
        count: enAttente.length,
        content: renderTabContent(
          enAttente,
          'Aucun rappel en attente',
          'Les rappels en attente apparaitront ici'
        ),
      },
      {
        id: 'en_cours',
        label: 'En cours',
        icon: Loader2,
        count: enCours.length,
        content: renderTabContent(
          enCours,
          'Aucun rappel en cours',
          'Les rappels en cours apparaitront ici'
        ),
      },
      {
        id: 'terminees',
        label: 'Terminees',
        icon: CheckCircle,
        count: terminees.length,
        content: renderTabContent(
          terminees,
          'Aucun rappel termine',
          'Les rappels termines apparaitront ici'
        ),
      },
    ],
    // Dependencies: all data + callbacks used in renderTabContent
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reminders, loading, emptyStateConfig, onStart, onComplete, onCancel, effectiveViewMode]
  )

  return (
    <ContentNavigator
      tabs={tabs}
      defaultTab="toutes"
      searchPlaceholder="Rechercher un rappel..."
      className={`flex-1 min-h-0 ${className}`}
      rightControls={
        !isMobile ? (
          <ViewModeSwitcherV1
            value={viewMode}
            onChange={setViewMode}
            modes={['cards', 'list']}
          />
        ) : undefined
      }
    />
  )
}
