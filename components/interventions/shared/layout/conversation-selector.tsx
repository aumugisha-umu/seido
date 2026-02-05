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
 * Supports:
 * - Group threads (group, tenants_group, providers_group)
 * - Individual threads (tenant_to_managers, provider_to_managers) with participant names
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
import { Users, UserCheck, Briefcase, UsersRound, Shield } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Thread = Database['public']['Tables']['conversation_threads']['Row'] & {
  unread_count?: number
}
type ThreadType = 'group' | 'tenants_group' | 'providers_group' | 'tenant_to_managers' | 'provider_to_managers'
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
  useTitle?: boolean  // If true, use thread.title instead of label
}> = {
  group: {
    label: 'Discussion générale',
    shortLabel: 'Générale',
    icon: Users,
    activeClass: 'bg-blue-600 text-white border-blue-600',
    inactiveClass: 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50'
  },
  tenants_group: {
    label: 'Groupe locataires',
    shortLabel: 'Locataires',
    icon: UsersRound,
    activeClass: 'bg-emerald-600 text-white border-emerald-600',
    inactiveClass: 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
  },
  providers_group: {
    label: 'Groupe prestataires',
    shortLabel: 'Prestataires',
    icon: UsersRound,
    activeClass: 'bg-violet-600 text-white border-violet-600',
    inactiveClass: 'bg-white text-slate-700 border-slate-300 hover:border-violet-400 hover:bg-violet-50'
  },
  tenant_to_managers: {
    label: 'Locataire',  // Fallback if no title
    shortLabel: 'Locataire',
    icon: UserCheck,
    activeClass: 'bg-green-600 text-white border-green-600',
    inactiveClass: 'bg-white text-slate-700 border-slate-300 hover:border-green-400 hover:bg-green-50',
    useTitle: true  // Use thread.title (contains participant name)
  },
  provider_to_managers: {
    label: 'Prestataire',  // Fallback if no title
    shortLabel: 'Prestataire',
    icon: Briefcase,
    activeClass: 'bg-purple-600 text-white border-purple-600',
    inactiveClass: 'bg-white text-slate-700 border-slate-300 hover:border-purple-400 hover:bg-purple-50',
    useTitle: true  // Use thread.title (contains participant name)
  }
}

// Visible threads by role
const visibleThreadsByRole: Record<UserRole, ThreadType[]> = {
  gestionnaire: ['group', 'tenants_group', 'providers_group', 'tenant_to_managers', 'provider_to_managers'],
  locataire: ['group', 'tenants_group', 'tenant_to_managers'],
  prestataire: ['group', 'providers_group', 'provider_to_managers'],
  admin: ['group', 'tenants_group', 'providers_group', 'tenant_to_managers', 'provider_to_managers']
}

// Sort order for thread types (group threads first, then individual)
const threadSortOrder: Record<ThreadType, number> = {
  group: 1,
  tenants_group: 2,
  providers_group: 3,
  tenant_to_managers: 4,
  provider_to_managers: 5
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
  // For locataire/prestataire: only show their own individual thread (where participant_id matches)
  const visibleThreads = threads.filter(thread => {
    const threadType = thread.thread_type as ThreadType
    if (!visibleTypes.includes(threadType)) return false

    // For individual threads, check visibility based on participant_id
    // Gestionnaire/admin can see all, locataire/prestataire only sees their own
    if (threadType === 'tenant_to_managers' || threadType === 'provider_to_managers') {
      // If thread has participant_id, it's an individual thread
      // Gestionnaire/admin sees all individual threads
      // Locataire/prestataire visibility is handled by RLS (they only get their own thread from the server)
      return true
    }

    return true
  })

  // Sort threads: group threads first, then individual threads
  const sortedThreads = [...visibleThreads].sort((a, b) => {
    const orderA = threadSortOrder[a.thread_type as ThreadType] || 99
    const orderB = threadSortOrder[b.thread_type as ThreadType] || 99
    if (orderA !== orderB) return orderA - orderB
    // If same type, sort by title
    return (a.title || '').localeCompare(b.title || '')
  })

  if (sortedThreads.length === 0) {
    return null
  }

  // Don't show selector if only one thread
  if (sortedThreads.length === 1) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {sortedThreads.map((thread) => {
        const config = threadConfig[thread.thread_type as ThreadType]
        if (!config) return null

        const Icon = config.icon
        const isActive = thread.id === activeThreadId
        const unreadCount = thread.unread_count || 0

        // Use thread title for individual threads (contains participant name)
        // But for locataire/prestataire viewing their OWN thread, show "Gestionnaires" instead
        let label = config.label
        let shortLabel = config.shortLabel
        const threadType = thread.thread_type as ThreadType

        // ✅ FIX 2026-02-01: For locataire/prestataire, show who they're talking TO, not their own name
        const isOwnThread =
          (userRole === 'locataire' && threadType === 'tenant_to_managers') ||
          (userRole === 'prestataire' && threadType === 'provider_to_managers')

        if (isOwnThread) {
          // Locataire/prestataire sees their conversation with gestionnaires
          label = 'Gestionnaires'
          shortLabel = 'Gestion.'
        } else if (config.useTitle && thread.title) {
          // Gestionnaire/admin sees the participant name (for individual threads)
          // Extract name from title like "Conversation avec Jean Dupont"
          const nameMatch = thread.title.match(/Conversation avec (.+)/)
          if (nameMatch) {
            const participantName = nameMatch[1]
            label = participantName
            // Short label: first name only or truncate
            const firstName = participantName.split(' ')[0]
            shortLabel = firstName.length > 10 ? firstName.substring(0, 10) + '…' : firstName
          }
          // If regex doesn't match (legacy title format), keep config.label default ("Locataire" / "Prestataire")
        }

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
            aria-label={`${label}${unreadCount > 0 ? `, ${unreadCount} messages non lus` : ''}`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel}</span>

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
