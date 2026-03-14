"use client"

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { User, Building2, Mail } from 'lucide-react'
import type { ContactData, InvitationData, CompanyData } from '@/config/table-configs/contacts.config'
import { cn } from '@/lib/utils'

// --- Contact Card ---

interface ContactCardMobileProps {
  contact: ContactData
}

const ROLE_LABELS: Record<string, string> = {
  locataire: 'Locataire',
  prestataire: 'Prestataire',
  gestionnaire: 'Gestionnaire',
}

const INVITATION_STYLES: Record<string, string> = {
  accepted: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

export function ContactCardMobile({ contact }: ContactCardMobileProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/gestionnaire/contacts/details/${contact.id}`)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card active:bg-muted/50 cursor-pointer transition-colors"
    >
      {/* Avatar/Initials */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex-shrink-0 text-sm font-medium">
        {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || <User className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{contact.name}</span>
          {contact.invitationStatus && (
            <Badge className={cn("text-[10px] flex-shrink-0", INVITATION_STYLES[contact.invitationStatus] || 'bg-slate-100 text-slate-500')}>
              {contact.invitationStatus === 'accepted' ? 'Connecté' : contact.invitationStatus === 'pending' ? 'Invité' : contact.invitationStatus}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {contact.role && <span>{ROLE_LABELS[contact.role] || contact.role}</span>}
          {contact.email && (
            <>
              <span>•</span>
              <span className="truncate">{contact.email}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Invitation Card ---

interface InvitationCardMobileProps {
  invitation: InvitationData
}

export function InvitationCardMobile({ invitation }: InvitationCardMobileProps) {
  const statusLabel = invitation.effectiveStatus || invitation.status || 'pending'
  const statusStyle = INVITATION_STYLES[statusLabel] || 'bg-slate-100 text-slate-500'

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex-shrink-0">
        <Mail className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{invitation.name || invitation.email}</span>
          <Badge className={cn("text-[10px] flex-shrink-0", statusStyle)}>
            {statusLabel === 'pending' ? 'En attente' : statusLabel === 'expired' ? 'Expiré' : statusLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {invitation.role && <span>{ROLE_LABELS[invitation.role] || invitation.role}</span>}
          {invitation.email && invitation.name && (
            <>
              <span>•</span>
              <span className="truncate">{invitation.email}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Company Card ---

interface CompanyCardMobileProps {
  company: CompanyData
}

export function CompanyCardMobile({ company }: CompanyCardMobileProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/gestionnaire/contacts/societes/${company.id}`)
  }

  const location = [company.city, company.postal_code].filter(Boolean).join(' ')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card active:bg-muted/50 cursor-pointer transition-colors"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
        <Building2 className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{company.name}</span>
          {!company.is_active && (
            <Badge variant="outline" className="text-[10px] text-slate-400 flex-shrink-0">Inactive</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {company.vat_number && <span>{company.vat_number}</span>}
          {location && (
            <>
              {company.vat_number && <span>•</span>}
              <span className="truncate">{location}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
