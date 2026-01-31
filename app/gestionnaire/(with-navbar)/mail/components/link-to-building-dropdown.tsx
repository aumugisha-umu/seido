'use client'

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from '@/components/ui/command'
import { Building as BuildingIcon, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Building } from './types'

interface LinkToBuildingDropdownProps {
  emailId: string
  buildings: Building[]
  currentBuildingId?: string
  currentLotId?: string
  onLink: (buildingId: string, lotId?: string) => void
}

export function LinkToBuildingDropdown({
  emailId,
  buildings,
  currentBuildingId,
  currentLotId,
  onLink
}: LinkToBuildingDropdownProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLink = async (buildingId: string, lotId?: string) => {
    setLoading(true)
    try {
      onLink(buildingId, lotId)
      toast.success('Email lié à l\'immeuble/lot')
      setOpen(false)
    } catch (error) {
      toast.error('Échec de la liaison')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Command>
      <CommandInput placeholder="Rechercher des immeubles ou lots..." />
      <CommandList>
        {buildings.map((building) => (
          <CommandGroup key={building.id} heading={building.name}>
            {/* Link to Building */}
            <CommandItem
              onSelect={() => handleLink(building.id)}
              disabled={loading}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <BuildingIcon className="h-4 w-4" />
                <div>
                  <div className="font-medium">{building.name}</div>
                  <div className="text-xs text-muted-foreground">{building.address_record?.street || ''}</div>
                </div>
              </div>
              {currentBuildingId === building.id && !currentLotId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </CommandItem>

            {/* Link to Lots */}
            {building.lots.map((lot) => (
              <CommandItem
                key={lot.id}
                onSelect={() => handleLink(building.id, lot.id)}
                disabled={loading}
                className="flex items-center justify-between"
              >
                <div className="ml-6 flex items-center gap-2">
                  <span className="text-sm">{lot.name}</span>
                  {lot.tenant_name && (
                    <span className="text-xs text-muted-foreground">
                      ({lot.tenant_name})
                    </span>
                  )}
                </div>
                {currentLotId === lot.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  )
}
