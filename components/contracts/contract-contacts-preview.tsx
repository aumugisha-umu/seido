"use client"

import { cn } from '@/lib/utils'
import { Users, User } from 'lucide-react'
import type { ContractContactWithUser, ContractContactRole } from '@/lib/types/contract.types'
import { CONTRACT_CONTACT_ROLE_LABELS } from '@/lib/types/contract.types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ContractContactsPreviewProps {
  contacts: ContractContactWithUser[]
  maxDisplay?: number
  showRoles?: boolean
  className?: string
}

const ROLE_COLORS: Record<ContractContactRole, string> = {
  locataire: 'bg-blue-100 text-blue-800 border-blue-200',
  colocataire: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  garant: 'bg-amber-100 text-amber-800 border-amber-200',
  representant_legal: 'bg-purple-100 text-purple-800 border-purple-200',
  autre: 'bg-gray-100 text-gray-800 border-gray-200'
}

export function ContractContactsPreview({
  contacts,
  maxDisplay = 3,
  showRoles = true,
  className
}: ContractContactsPreviewProps) {
  if (!contacts || contacts.length === 0) {
    return (
      <div className={cn('contract-contacts-preview text-sm text-muted-foreground flex items-center gap-1.5', className)}>
        <Users className="h-4 w-4" />
        <span>Aucun contact</span>
      </div>
    )
  }

  // Group contacts by role
  const tenants = contacts.filter(c => c.role === 'locataire' || c.role === 'colocataire')
  const guarantors = contacts.filter(c => c.role === 'garant')
  const others = contacts.filter(c => c.role !== 'locataire' && c.role !== 'colocataire' && c.role !== 'garant')

  const displayContacts = contacts.slice(0, maxDisplay)
  const remainingCount = contacts.length - maxDisplay

  const getDisplayName = (contact: ContractContactWithUser) => {
    if (contact.user.first_name && contact.user.last_name) {
      return `${contact.user.first_name} ${contact.user.last_name}`
    }
    return contact.user.name || contact.user.email || 'Contact'
  }

  const getInitials = (contact: ContractContactWithUser) => {
    if (contact.user.first_name && contact.user.last_name) {
      return `${contact.user.first_name[0]}${contact.user.last_name[0]}`.toUpperCase()
    }
    if (contact.user.name) {
      return contact.user.name.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  return (
    <TooltipProvider>
      <div className={cn('contract-contacts-preview flex items-center gap-2', className)}>
        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {displayContacts.map((contact, index) => (
            <Tooltip key={contact.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'contract-contacts-preview__avatar',
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm cursor-default',
                    ROLE_COLORS[contact.role]
                  )}
                  style={{ zIndex: displayContacts.length - index }}
                >
                  {getInitials(contact)}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <div className="font-medium">{getDisplayName(contact)}</div>
                  <div className="text-muted-foreground">
                    {CONTRACT_CONTACT_ROLE_LABELS[contact.role]}
                    {contact.is_primary && ' (Principal)'}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm cursor-default">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  {remainingCount} autre{remainingCount > 1 ? 's' : ''} contact{remainingCount > 1 ? 's' : ''}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Role summary */}
        {showRoles && (
          <div className="contract-contacts-preview__summary text-xs text-muted-foreground">
            {tenants.length > 0 && (
              <span>{tenants.length} locataire{tenants.length > 1 ? 's' : ''}</span>
            )}
            {tenants.length > 0 && guarantors.length > 0 && <span className="mx-1">•</span>}
            {guarantors.length > 0 && (
              <span>{guarantors.length} garant{guarantors.length > 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
