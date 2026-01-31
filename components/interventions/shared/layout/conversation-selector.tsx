'use client'

/**
 * ConversationSelector - Material Design chip selector for conversation threads
 *
 * Material Design 3 Guidelines:
 * - Filter chips for mutually exclusive selection
 * - Clear active state with filled background
 * - Icon + label for quick recognition
 * - Unread badge for notifications
 *
 * @example
 * <ConversationSelector
 *   threads={threads}
 *   activeThreadId={activeId}
 *   onThreadSelect={handleSelect}
 *   userRole="gestionnaire"
 * />
 */

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, Briefcase } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Thread = Database['public']['Tables']['conversation_threads']['Row'] & {
  unread_count?: number
}
type ThreadType = 'group' | 'tenant_to_managers' | 'provider_to_managers'
type UserRole = Database['public']['Enums']['user_role']

interface ConversationSelectorProps {
  threads: Thread[]
  activeThreadId: string | null
  onThreadSelect: (thread: Thread) => void
  userRole: UserRole
  className?: string
}

// Thread configuration by type
const threadConfig: Record<ThreadType, {
  label: string
  shortLabel: string
  icon: typeof Users
  activeClass: string
  inactiveClass: string
}> = {
  group: {
    label: 'Discussion générale',
    shortLabel: 'Générale',
    icon: Users,
    activeClass: 'bg-blue-600 text-white border-blue-600',
    inactiveClass: 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50'
  },
  tenant_to_managers: {
    label: 'Locataire ↔ Gestionnaires',
    shortLabel: 'Locataire',
    icon: UserCheck,
    activeClass: 'bg-emerald-600 text-white border-emerald-600',
    inactiveClass: 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
  },
  provider_to_managers: {
    label: 'Prestataire ↔ Gestionnaires',
    shortLabel: 'Prestataire',
    icon: Briefcase,
    activeClass: 'bg-purple-600 text-white border-purple-600',
    inactiveClass: 'bg-white text-slate-700 border-slate-300 hover:border-purple-400 hover:bg-purple-50'
  }
}

// Visible threads by role
const visibleThreadsByRole: Record<UserRole, ThreadType[]> = {
  gestionnaire: ['group', 'tenant_to_managers', 'provider_to_managers'],
  locataire: ['group', 'tenant_to_managers'],
  prestataire: ['group', 'provider_to_managers'],
  admin: ['group', 'tenant_to_managers', 'provider_to_managers']
}

export const ConversationSelector = ({
  threads,
  activeThreadId,
  onThreadSelect,
  userRole,
  className
}: ConversationSelectorProps) => {
  const visibleTypes = visibleThreadsByRole[userRole] || []

  // Filter threads to only show visible ones for this role
  const visibleThreads = threads.filter(
    thread => visibleTypes.includes(thread.thread_type as ThreadType)
  )

  if (visibleThreads.length === 0) {
    return null
  }

  // Don't show selector if only one thread
  if (visibleThreads.length === 1) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {visibleThreads.map((thread) => {
        const config = threadConfig[thread.thread_type as ThreadType]
        if (!config) return null

        const Icon = config.icon
        const isActive = thread.id === activeThreadId
        const unreadCount = thread.unread_count || 0

        return (
          <button
            key={thread.id}
            onClick={() => onThreadSelect(thread)}
            className={cn(
              // Base styles - Material Design chip
              'inline-flex items-center gap-2 px-3 py-2 rounded-full',
              'border text-sm font-medium',
              'transition-all duration-200',
              // Touch target minimum 48px (py-2 = 8px * 2 + content ≈ 40px, add gap)
              'min-h-[40px]',
              // Focus state for accessibility
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
              // Active/inactive states
              isActive ? config.activeClass : config.inactiveClass
            )}
            aria-pressed={isActive}
            aria-label={`${config.label}${unreadCount > 0 ? `, ${unreadCount} messages non lus` : ''}`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{config.label}</span>
            <span className="sm:hidden">{config.shortLabel}</span>

            {/* Unread badge */}
            {unreadCount > 0 && (
              <Badge
                className={cn(
                  'h-5 min-w-[20px] px-1.5 text-xs font-semibold',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-red-500 text-white'
                )}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}
