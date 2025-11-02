"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  Users,
  User,
  Plus,
  X,
  Wrench,
  Home,
  UserCircle,
  UserRound,
  LucideIcon
} from "lucide-react"

// Base contact interface - compatible with both Contact and UserType
interface BaseContact {
  id: string
  name: string
  email: string
  type?: string
  phone?: string | null
  speciality?: string
}

/**
 * Reusable Contact Section Component
 *
 * Used in both building and lot contact cards.
 *
 * Features:
 * ✅ Scrollable contact list (max 3 visible)
 * ✅ Sticky "Add Contact" button at bottom
 * ✅ Color-coded by contact type
 * ✅ Configurable minimum requirements
 * ✅ Responsive design
 */

type ContactSectionType = 'managers' | 'tenants' | 'providers' | 'owners' | 'others'

interface ContactSectionConfig {
  icon: LucideIcon
  label: string
  addButtonLabel: string
  emptyMessage: string
  colorScheme: {
    header: string
    headerHover: string
    iconColor: string
    textColor: string
    badgeBg: string
    itemBg: string
    itemBorder: string
    avatarBg: string
    avatarIcon: string
    buttonBorder: string
    buttonText: string
    buttonHover: string
  }
}

const SECTION_CONFIGS: Record<ContactSectionType, ContactSectionConfig> = {
  managers: {
    icon: Users,
    label: "Gestionnaires",
    addButtonLabel: "Ajouter gestionnaire",
    emptyMessage: "Aucun gestionnaire spécifique",
    colorScheme: {
      header: "bg-purple-50",
      headerHover: "hover:bg-purple-100",
      iconColor: "text-purple-600",
      textColor: "text-purple-900",
      badgeBg: "bg-purple-600",
      itemBg: "bg-purple-50/50",
      itemBorder: "border-purple-100",
      avatarBg: "bg-purple-200",
      avatarIcon: "text-purple-700",
      buttonBorder: "border-purple-300",
      buttonText: "text-purple-700",
      buttonHover: "hover:bg-purple-50"
    }
  },
  tenants: {
    icon: UserRound,
    label: "Locataires",
    addButtonLabel: "Ajouter locataire",
    emptyMessage: "Aucun locataire",
    colorScheme: {
      header: "bg-blue-50",
      headerHover: "hover:bg-blue-100",
      iconColor: "text-blue-600",
      textColor: "text-blue-900",
      badgeBg: "bg-blue-600",
      itemBg: "bg-blue-50/50",
      itemBorder: "border-blue-100",
      avatarBg: "bg-blue-200",
      avatarIcon: "text-blue-700",
      buttonBorder: "border-blue-300",
      buttonText: "text-blue-700",
      buttonHover: "hover:bg-blue-50"
    }
  },
  providers: {
    icon: Wrench,
    label: "Prestataires",
    addButtonLabel: "Ajouter prestataire",
    emptyMessage: "Aucun prestataire",
    colorScheme: {
      header: "bg-green-50",
      headerHover: "hover:bg-green-100",
      iconColor: "text-green-600",
      textColor: "text-green-900",
      badgeBg: "bg-green-600",
      itemBg: "bg-green-50/50",
      itemBorder: "border-green-100",
      avatarBg: "bg-green-200",
      avatarIcon: "text-green-700",
      buttonBorder: "border-green-300",
      buttonText: "text-green-700",
      buttonHover: "hover:bg-green-50"
    }
  },
  owners: {
    icon: Home,
    label: "Propriétaires",
    addButtonLabel: "Ajouter propriétaire",
    emptyMessage: "Aucun propriétaire",
    colorScheme: {
      header: "bg-orange-50",
      headerHover: "hover:bg-orange-100",
      iconColor: "text-orange-600",
      textColor: "text-orange-900",
      badgeBg: "bg-orange-600",
      itemBg: "bg-orange-50/50",
      itemBorder: "border-orange-100",
      avatarBg: "bg-orange-200",
      avatarIcon: "text-orange-700",
      buttonBorder: "border-orange-300",
      buttonText: "text-orange-700",
      buttonHover: "hover:bg-orange-50"
    }
  },
  others: {
    icon: UserCircle,
    label: "Autres contacts",
    addButtonLabel: "Ajouter contact",
    emptyMessage: "Aucun autre contact",
    colorScheme: {
      header: "bg-gray-50",
      headerHover: "hover:bg-gray-100",
      iconColor: "text-gray-600",
      textColor: "text-gray-900",
      badgeBg: "bg-gray-600",
      itemBg: "bg-gray-50/50",
      itemBorder: "border-gray-100",
      avatarBg: "bg-gray-200",
      avatarIcon: "text-gray-700",
      buttonBorder: "border-gray-300",
      buttonText: "text-gray-700",
      buttonHover: "hover:bg-gray-50"
    }
  }
}

interface ContactSectionProps {
  sectionType: ContactSectionType
  contacts: BaseContact[]
  onAddContact: () => void
  onRemoveContact: (contactId: string) => void

  // Optional configurations
  minRequired?: number // Minimum required contacts (e.g., 1 for building managers)
  canRemoveContact?: (contact: BaseContact) => boolean // Custom logic for remove button
  customLabel?: string // Override default label
  customAddButtonLabel?: string // Override default add button label
}

export function ContactSection({
  sectionType,
  contacts,
  onAddContact,
  onRemoveContact,
  minRequired,
  canRemoveContact,
  customLabel,
  customAddButtonLabel
}: ContactSectionProps) {
  const config = SECTION_CONFIGS[sectionType]
  const Icon = config.icon
  const { colorScheme } = config

  const label = customLabel || config.label
  const addButtonLabel = customAddButtonLabel || config.addButtonLabel

  // Determine if a contact can be removed
  const canRemove = (contact: BaseContact): boolean => {
    if (canRemoveContact) {
      return canRemoveContact(contact)
    }
    // Default: if minRequired is set, can't remove if at minimum
    if (minRequired !== undefined && contacts.length <= minRequired) {
      return false
    }
    return true
  }

  // Show warning if below minimum
  const showMinRequiredWarning = minRequired !== undefined && contacts.length < minRequired

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
      {/* Header with icon and label */}
      <div className={`w-full flex items-center gap-2 p-2.5 ${colorScheme.header}`}>
        <Icon className={`w-4 h-4 ${colorScheme.iconColor}`} />
        <span className={`font-semibold text-sm ${colorScheme.textColor}`}>
          {label}
        </span>
      </div>

      {/* Scrollable contact list - max 3 contacts visible (138px = 46px * 3) */}
      <div className="p-2 bg-white overflow-y-auto max-h-[138px] space-y-1.5 flex-1">
        {contacts.length > 0 ? (
          contacts.map((contact) => {
            const canRemoveThisContact = canRemove(contact)

            return (
              <div
                key={contact.id}
                className={`flex items-center justify-between p-2 ${colorScheme.itemBg} rounded border ${colorScheme.itemBorder}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Avatar for managers, icon for others */}
                  {sectionType === 'managers' ? (
                    <div className={`w-7 h-7 ${colorScheme.avatarBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <User className={`w-4 h-4 ${colorScheme.avatarIcon}`} />
                    </div>
                  ) : (
                    <Icon className={`w-4 h-4 ${colorScheme.iconColor} flex-shrink-0`} />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{contact.name}</div>
                    <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                  </div>
                </div>

                {/* Remove button - only show if contact can be removed */}
                {canRemoveThisContact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveContact(contact.id)
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0 flex-shrink-0"
                    title={`Retirer ${contact.name}`}
                    aria-label={`Retirer ${contact.name}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )
          })
        ) : (
          <>
            {showMinRequiredWarning ? (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 text-center">
                ⚠️ Au moins {minRequired} {minRequired === 1 ? label.toLowerCase().replace(/s$/, '') : label.toLowerCase()} requis
              </div>
            ) : (
              <p className="text-xs text-gray-500 px-2 py-1">{config.emptyMessage}</p>
            )}
          </>
        )}
      </div>

      {/* Add button - always visible at bottom */}
      <div className="p-2 pt-0 bg-white border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onAddContact()
          }}
          className={`w-full text-xs ${colorScheme.buttonBorder} ${colorScheme.buttonText} ${colorScheme.buttonHover} h-8`}
        >
          <Plus className="w-4 h-4 mr-1" />
          {addButtonLabel}
        </Button>
      </div>
    </div>
  )
}

export default ContactSection
