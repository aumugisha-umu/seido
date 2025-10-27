'use client'

/**
 * Add Participant Button Component
 * Allows managers to add team members to a conversation thread
 */

import { useState, useTransition } from 'react'
import { UserPlus, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { addParticipantAction } from '@/app/actions/conversation-actions'
import type { Database } from '@/lib/database.types'

type UserRole = Database['public']['Enums']['user_role']

interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url?: string
}

interface AddParticipantButtonProps {
  threadId: string
  teamMembers: TeamMember[]
  currentParticipantIds: string[]
  userRole: UserRole
  className?: string
}

// Role badge colors
const getRoleBadgeVariant = (role: UserRole) => {
  switch (role) {
    case 'gestionnaire':
      return 'default'
    case 'prestataire':
      return 'secondary'
    case 'locataire':
      return 'outline'
    default:
      return 'outline'
  }
}

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case 'gestionnaire':
      return 'Gestionnaire'
    case 'prestataire':
      return 'Prestataire'
    case 'locataire':
      return 'Locataire'
    case 'admin':
      return 'Admin'
    default:
      return role
  }
}

export function AddParticipantButton({
  threadId,
  teamMembers,
  currentParticipantIds,
  userRole,
  className
}: AddParticipantButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Only gestionnaires can add participants
  if (userRole !== 'gestionnaire') {
    return null
  }

  // Filter out current participants
  const availableMembers = teamMembers.filter(
    member => !currentParticipantIds.includes(member.id)
  )

  // Handle adding a participant
  const handleAddParticipant = (userId: string, userName: string) => {
    startTransition(async () => {
      try {
        const result = await addParticipantAction(threadId, userId)

        if (result.success) {
          toast.success(`${userName} a été ajouté à la conversation`)
          setOpen(false)
        } else {
          toast.error(result.error || 'Erreur lors de l\'ajout du participant')
        }
      } catch (error) {
        toast.error('Erreur lors de l\'ajout du participant')
      }
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          disabled={isPending || availableMembers.length === 0}
          aria-label="Ajouter un participant"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Rechercher un membre..." />
          <CommandList>
            <CommandEmpty>
              {availableMembers.length === 0
                ? 'Tous les membres sont déjà dans la conversation'
                : 'Aucun membre trouvé'}
            </CommandEmpty>
            <CommandGroup heading="Membres de l'équipe">
              {availableMembers.map((member) => (
                <CommandItem
                  key={member.id}
                  value={`${member.name} ${member.email}`}
                  onSelect={() => handleAddParticipant(member.id, member.name)}
                  disabled={isPending}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback>
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.email}
                    </p>
                  </div>
                  <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                    {getRoleLabel(member.role)}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
