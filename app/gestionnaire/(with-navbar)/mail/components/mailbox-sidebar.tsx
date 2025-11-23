'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Inbox, Send, FileText, Archive, Building, Settings, Star, Wrench } from 'lucide-react'
import { Building as BuildingType } from './types'

interface MailboxSidebarProps {
  currentFolder: string
  onFolderChange: (folder: string) => void
  unreadCounts: {
    inbox: number
    sent: number
    drafts: number
    archive: number
  }
  buildings: BuildingType[]
  onBuildingClick: (buildingId: string) => void
}

export function MailboxSidebar({
  currentFolder,
  onFolderChange,
  unreadCounts,
  buildings,
  onBuildingClick
}: MailboxSidebarProps) {
  return (
    <aside className="w-[250px] border-r flex flex-col h-full">
      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-2">
          {/* Standard Folders */}
          <Button
            variant={currentFolder === 'inbox' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onFolderChange('inbox')}
          >
            <Inbox className="mr-2 h-4 w-4" />
            Inbox
            {unreadCounts.inbox > 0 && (
              <Badge className="ml-auto" variant="default">
                {unreadCounts.inbox}
              </Badge>
            )}
          </Button>

          <Button
            variant={currentFolder === 'sent' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onFolderChange('sent')}
          >
            <Send className="mr-2 h-4 w-4" />
            Sent
          </Button>

          <Button
            variant={currentFolder === 'drafts' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onFolderChange('drafts')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Drafts
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
            Archive
          </Button>

          <Separator className="my-2" />

          {/* Buildings */}
          <div className="px-2 py-1">
            <h3 className="text-xs font-semibold text-muted-foreground">
              Buildings
            </h3>
          </div>

          {buildings.map((building) => (
            <Button
              key={building.id}
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => onBuildingClick(building.id)}
            >
              <Building className="mr-2 h-3 w-3" />
              <span className="truncate">{building.name}</span>
              {building.emailCount > 0 && (
                <Badge className="ml-auto" variant="outline" size="sm">
                  {building.emailCount}
                </Badge>
              )}
            </Button>
          ))}

          <Separator className="my-2" />

          {/* Labels */}
          <div className="px-2 py-1">
            <h3 className="text-xs font-semibold text-muted-foreground">
              Labels
            </h3>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={() => onFolderChange('urgent')}
          >
            <Star className="mr-2 h-3 w-3 text-amber-500" />
            Urgent
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={() => onFolderChange('intervention')}
          >
            <Wrench className="mr-2 h-3 w-3 text-blue-500" />
            Intervention
          </Button>

          <Separator className="my-2" />

          {/* Settings */}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => onFolderChange('settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </nav>
      </ScrollArea>
    </aside>
  )
}
