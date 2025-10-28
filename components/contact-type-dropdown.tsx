"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Users, Home, User, Wrench, MoreHorizontal, Plus } from "lucide-react"

export interface ContactTypeOption {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

export const contactTypeOptions: ContactTypeOption[] = [
  {
    key: "manager",
    label: "Gestionnaire",
    icon: Users,
    description: "Gestionnaire de l'immeuble ou du lot",
  },
  {
    key: "owner",
    label: "Propriétaire",
    icon: Home,
    description: "Propriétaire du bien immobilier",
  },
  {
    key: "tenant",
    label: "Locataire",
    icon: User,
    description: "Personne qui occupe le logement",
  },
  {
    key: "provider",
    label: "Prestataire",
    icon: Wrench,
    description: "Prestataire pour les interventions",
  },
  {
    key: "other",
    label: "Autre",
    icon: MoreHorizontal,
    description: "Autre type de contact",
  },
]

interface ContactTypeDropdownProps {
  onTypeSelect: (contactType: string) => void
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
  buttonLabel?: string
  disabled?: boolean
  excludeTypes?: string[]
}

/**
 * 📋 Contact Type Dropdown
 *
 * Dropdown menu pour sélectionner le type de contact avant d'ouvrir le ContactSelector.
 * Affiche les 5 types disponibles : Gestionnaire, Propriétaire, Locataire, Prestataire, Autre.
 */
export function ContactTypeDropdown({
  onTypeSelect,
  variant = "outline",
  size = "sm",
  className = "",
  buttonLabel = "Ajouter un contact",
  disabled = false,
  excludeTypes = [],
}: ContactTypeDropdownProps) {
  // Filter out excluded types
  const availableTypes = contactTypeOptions.filter(type => !excludeTypes.includes(type.key))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Type de contact</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableTypes.map((type) => {
          const Icon = type.icon
          return (
            <DropdownMenuItem
              key={type.key}
              onClick={() => onTypeSelect(type.key)}
              className="cursor-pointer"
            >
              <Icon className="h-4 w-4 mr-3 text-gray-600" />
              <span className="font-medium">{type.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
