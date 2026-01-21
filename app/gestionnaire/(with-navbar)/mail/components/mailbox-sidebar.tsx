'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  Inbox,
  Send,
  FileText,
  Archive,
  Building2,
  Home,
  User,
  Wrench,
  Briefcase,
  ChevronDown,
  Settings,
  CheckCircle,
  Mail,
  Reply,
  type LucideIcon
} from 'lucide-react'
import Link from 'next/link'

// Types pour les entités liées
export interface LinkedEntity {
  id: string
  name: string
  emailCount: number
  subtitle?: string
}

export interface LinkedEntities {
  buildings: LinkedEntity[]
  lots: LinkedEntity[]
  contacts: LinkedEntity[]
  contracts: LinkedEntity[]
  interventions: LinkedEntity[]
  companies: LinkedEntity[]
}

// Types pour les email connections
export interface EmailConnection {
  id: string
  email_address: string
  provider: string
  is_active: boolean
  unread_count: number
  email_count: number
}

// Types pour les notification replies groupées par intervention
export interface NotificationReplyGroup {
  intervention: {
    id: string
    title: string
    reference?: string
  }
  unreadCount: number
  emailCount: number
}

interface MailboxSidebarProps {
  currentFolder: string
  onFolderChange: (folder: string) => void
  unreadCounts: {
    inbox: number
    processed: number
    sent: number
    drafts: number
    archive: number
  }
  linkedEntities: LinkedEntities
  onEntityClick: (type: string, entityId: string) => void
  selectedEntity?: { type: string; id: string } | null
  // New props for email boxes
  emailConnections?: EmailConnection[]
  notificationRepliesCount?: number
  selectedSource?: string | null // 'all', 'notification_replies', or connection UUID
  onSourceChange?: (source: string) => void
  // New props for notification replies by intervention
  notificationReplyGroups?: NotificationReplyGroup[]
  selectedInterventionId?: string | null
  onInterventionClick?: (interventionId: string) => void
}

// Composant pour une section collapsible
interface CollapsibleSectionProps {
  title: string
  icon: LucideIcon
  items: LinkedEntity[]
  type: string
  onItemClick: (type: string, id: string) => void
  defaultOpen?: boolean
  selectedId?: string | null
}

function CollapsibleSection({
  title,
  icon: Icon,
  items,
  type,
  onItemClick,
  defaultOpen = true,
  selectedId
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Ne pas afficher si aucun item
  if (items.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-2 py-1.5 h-auto font-medium text-muted-foreground hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">{title}</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {items.length}
            </Badge>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5">
        {items.map(item => {
          const isSelected = selectedId === item.id
          return (
            <Button
              key={item.id}
              variant={isSelected ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-between pl-8 pr-2 h-8 text-sm font-normal",
                isSelected && "bg-primary/10 text-primary font-medium"
              )}
              onClick={() => onItemClick(type, item.id)}
            >
              <span className="truncate text-left">{item.name}</span>
              {item.emailCount > 0 && (
                <Badge variant="outline" className="ml-2 h-5 px-1.5 text-xs flex-shrink-0">
                  {item.emailCount}
                </Badge>
              )}
            </Button>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function MailboxSidebar({
  currentFolder,
  onFolderChange,
  unreadCounts,
  linkedEntities,
  onEntityClick,
  selectedEntity,
  emailConnections = [],
  notificationRepliesCount = 0,
  selectedSource = 'all',
  onSourceChange,
  notificationReplyGroups = [],
  selectedInterventionId,
  onInterventionClick
}: MailboxSidebarProps) {
  const [isEmailBoxesOpen, setIsEmailBoxesOpen] = useState(true)
  const [isNotificationRepliesOpen, setIsNotificationRepliesOpen] = useState(true)

  const handleSourceClick = (source: string) => {
    onSourceChange?.(source)
  }

  const totalUnread = emailConnections.reduce((sum, conn) => sum + conn.unread_count, 0) + notificationRepliesCount

  return (
    <aside className="w-[250px] border-r flex flex-col h-full overflow-hidden flex-shrink-0">
      {/* Email Boxes Section */}
      {(emailConnections.length > 0 || notificationRepliesCount > 0) && (
        <>
          <div className="p-2 flex-shrink-0">
            <Collapsible open={isEmailBoxesOpen} onOpenChange={setIsEmailBoxesOpen} className="space-y-1">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between px-2 py-1.5 h-auto font-medium text-muted-foreground hover:text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wide">Boîtes email</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isEmailBoxesOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5">
                {/* All sources */}
                <Button
                  variant={selectedSource === 'all' ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-between pl-4 pr-2 h-8 text-sm font-normal",
                    selectedSource === 'all' && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={() => handleSourceClick('all')}
                >
                  <span className="truncate text-left">Toutes les boîtes</span>
                  {totalUnread > 0 && (
                    <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs flex-shrink-0">
                      {totalUnread}
                    </Badge>
                  )}
                </Button>

                {/* Individual email connections */}
                {emailConnections.map(conn => (
                  <Button
                    key={conn.id}
                    variant={selectedSource === conn.id ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-between pl-4 pr-2 h-8 text-sm font-normal",
                      selectedSource === conn.id && "bg-primary/10 text-primary font-medium"
                    )}
                    onClick={() => handleSourceClick(conn.id)}
                  >
                    <span className="truncate text-left">{conn.email_address}</span>
                    {conn.unread_count > 0 && (
                      <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs flex-shrink-0">
                        {conn.unread_count}
                      </Badge>
                    )}
                  </Button>
                ))}

                {/* Notification replies virtual box */}
                <Button
                  variant={selectedSource === 'notification_replies' ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-between pl-4 pr-2 h-8 text-sm font-normal",
                    selectedSource === 'notification_replies' && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={() => handleSourceClick('notification_replies')}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Reply className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                    <span className="truncate">Réponses notifs</span>
                  </div>
                  {notificationRepliesCount > 0 && (
                    <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs flex-shrink-0 bg-orange-500">
                      {notificationRepliesCount}
                    </Badge>
                  )}
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <Separator />
        </>
      )}

      {/* Folders - Fixe en haut */}
      <div className="p-2 flex-shrink-0 space-y-1">
        <Button
          variant={currentFolder === 'inbox' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onFolderChange('inbox')}
        >
          <Inbox className="mr-2 h-4 w-4" />
          Boîte de réception
          {unreadCounts.inbox > 0 && (
            <Badge className="ml-auto" variant="default">
              {unreadCounts.inbox}
            </Badge>
          )}
        </Button>

        <Button
          variant={currentFolder === 'processed' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onFolderChange('processed')}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Traités
          {unreadCounts.processed > 0 && (
            <Badge className="ml-auto" variant="secondary">
              {unreadCounts.processed}
            </Badge>
          )}
        </Button>

        <Button
          variant={currentFolder === 'sent' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onFolderChange('sent')}
        >
          <Send className="mr-2 h-4 w-4" />
          Envoyés
        </Button>

        <Button
          variant={currentFolder === 'drafts' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onFolderChange('drafts')}
        >
          <FileText className="mr-2 h-4 w-4" />
          Brouillons
          {unreadCounts.drafts > 0 && (
            <Badge className="ml-auto" variant="secondary">
              {unreadCounts.drafts}
            </Badge>
          )}
        </Button>

        <Button
          variant={currentFolder === 'archive' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onFolderChange('archive')}
        >
          <Archive className="mr-2 h-4 w-4" />
          Archives
        </Button>
      </div>

      <Separator />

      {/* Notification Replies by Intervention */}
      {notificationReplyGroups.length > 0 && (
        <>
          <div className="p-2 flex-shrink-0">
            <Collapsible open={isNotificationRepliesOpen} onOpenChange={setIsNotificationRepliesOpen} className="space-y-1">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between px-2 py-1.5 h-auto font-medium text-muted-foreground hover:text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Reply className="h-4 w-4 text-orange-500" />
                    <span className="text-xs uppercase tracking-wide">Réponses par intervention</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isNotificationRepliesOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5">
                {notificationReplyGroups.map(group => {
                  const isSelected = selectedInterventionId === group.intervention.id
                  return (
                    <Button
                      key={group.intervention.id}
                      variant={isSelected ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-between pl-4 pr-2 h-8 text-sm font-normal",
                        isSelected && "bg-primary/10 text-primary font-medium"
                      )}
                      onClick={() => onInterventionClick?.(group.intervention.id)}
                    >
                      <span className="truncate text-left">
                        {group.intervention.title || group.intervention.reference || `INT-${group.intervention.id.slice(0, 6)}`}
                      </span>
                      {group.unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs flex-shrink-0 bg-orange-500">
                          {group.unreadCount}
                        </Badge>
                      )}
                    </Button>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          </div>
          <Separator />
        </>
      )}

      {/* Entités liées - Scrollable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <CollapsibleSection
          title="Immeubles"
          icon={Building2}
          items={linkedEntities.buildings}
          type="building"
          onItemClick={onEntityClick}
          selectedId={selectedEntity?.type === 'building' ? selectedEntity.id : null}
        />

        <CollapsibleSection
          title="Lots"
          icon={Home}
          items={linkedEntities.lots}
          type="lot"
          onItemClick={onEntityClick}
          selectedId={selectedEntity?.type === 'lot' ? selectedEntity.id : null}
        />

        <CollapsibleSection
          title="Contacts"
          icon={User}
          items={linkedEntities.contacts}
          type="contact"
          onItemClick={onEntityClick}
          selectedId={selectedEntity?.type === 'contact' ? selectedEntity.id : null}
        />

        <CollapsibleSection
          title="Contrats"
          icon={FileText}
          items={linkedEntities.contracts}
          type="contract"
          onItemClick={onEntityClick}
          selectedId={selectedEntity?.type === 'contract' ? selectedEntity.id : null}
        />

        <CollapsibleSection
          title="Interventions"
          icon={Wrench}
          items={linkedEntities.interventions}
          type="intervention"
          onItemClick={onEntityClick}
          selectedId={selectedEntity?.type === 'intervention' ? selectedEntity.id : null}
        />

        <CollapsibleSection
          title="Sociétés"
          icon={Briefcase}
          items={linkedEntities.companies}
          type="company"
          onItemClick={onEntityClick}
          selectedId={selectedEntity?.type === 'company' ? selectedEntity.id : null}
        />

        {/* Message si aucune entité liée */}
        {linkedEntities.buildings.length === 0 &&
         linkedEntities.lots.length === 0 &&
         linkedEntities.contacts.length === 0 &&
         linkedEntities.contracts.length === 0 &&
         linkedEntities.interventions.length === 0 &&
         linkedEntities.companies.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucune entité liée aux emails
          </p>
        )}
      </div>

      {/* Bouton Paramètres - Sticky en bas */}
      <div className="p-2 flex-shrink-0 border-t">
        <Link href="/gestionnaire/parametres/emails">
          <Button
            variant="ghost"
            className="w-full justify-start"
          >
            <Settings className="mr-2 h-4 w-4" />
            Paramètres emails
          </Button>
        </Link>
      </div>
    </aside>
  )
}
