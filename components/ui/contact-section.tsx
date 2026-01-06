"use client"

import React, { useState } from "react"
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
  LucideIcon,
  Edit,
  Building,
  ChevronDown,
  ChevronUp,
  Shield
} from "lucide-react"

// Base contact interface - compatible with both Contact and UserType
interface BaseContact {
  id: string
  name: string
  email: string
  type?: string
  phone?: string | null
  company?: string | null
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

type ContactSectionType = 'managers' | 'tenants' | 'providers' | 'owners' | 'others' | 'guarantors'

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
  },
  guarantors: {
    icon: Shield,
    label: "Garants",
    addButtonLabel: "Ajouter garant",
    emptyMessage: "Aucun garant",
    colorScheme: {
      header: "bg-amber-50",
      headerHover: "hover:bg-amber-100",
      iconColor: "text-amber-600",
      textColor: "text-amber-900",
      badgeBg: "bg-amber-600",
      itemBg: "bg-amber-50/50",
      itemBorder: "border-amber-100",
      avatarBg: "bg-amber-200",
      avatarIcon: "text-amber-700",
      buttonBorder: "border-amber-300",
      buttonText: "text-amber-700",
      buttonHover: "hover:bg-amber-50"
    }
  }
}

interface ContactSectionProps {
  sectionType: ContactSectionType
  contacts: BaseContact[]
  onAddContact?: () => void
  onRemoveContact?: (contactId: string) => void

  // Optional configurations
  readOnly?: boolean // If true, hide add/remove buttons (for confirmation view)
  minRequired?: number // Minimum required contacts (e.g., 1 for building managers)
  canRemoveContact?: (contact: BaseContact) => boolean // Custom logic for remove button
  customLabel?: string // Override default label
  customAddButtonLabel?: string // Override default add button label

  // Inherited contacts (from building when viewing a lot)
  inheritedContacts?: BaseContact[] // Building-level contacts inherited by this lot
  showInheritedSummary?: boolean // If true, display inherited contact summary card
}

export function ContactSection({
  sectionType,
  contacts,
  onAddContact,
  onRemoveContact,
  readOnly = false,
  minRequired,
  canRemoveContact,
  customLabel,
  customAddButtonLabel,
  inheritedContacts = [],
  showInheritedSummary = false
}: ContactSectionProps) {
  const config = SECTION_CONFIGS[sectionType]
  const Icon = config.icon
  const { colorScheme } = config

  const label = customLabel || config.label
  const addButtonLabel = customAddButtonLabel || config.addButtonLabel

  // Local state for inherited contacts expansion
  const [isInheritedExpanded, setIsInheritedExpanded] = useState(false)

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
    <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header with icon and label */}
      <div className={`w-full flex items-center gap-2 p-2.5 ${colorScheme.header}`}>
        <Icon className={`w-4 h-4 ${colorScheme.iconColor}`} />
        <span className={`font-semibold text-sm ${colorScheme.textColor}`}>
          {label}
        </span>
      </div>

      {/* Scrollable contact list - max 3 contacts visible (138px = 46px * 3) */}
      <div className="p-2 bg-white overflow-y-auto max-h-[138px] space-y-1.5 flex-1">
        {/* Inherited contacts summary card (from building) - Collapsible */}
        {showInheritedSummary && inheritedContacts.length > 0 && (
          <div className="bg-blue-50/40 rounded border border-blue-200/60 overflow-hidden">
            {/* Summary header - clickable to expand/collapse */}
            <div
              className="p-2 flex items-center gap-2 cursor-pointer hover:bg-blue-50/60 transition-colors"
              onClick={() => setIsInheritedExpanded(!isInheritedExpanded)}
            >
              <div className="w-7 h-7 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Building className="w-4 h-4 text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-blue-900">
                  {inheritedContacts.length} {label.toLowerCase().replace(/s$/, '')}
                  {inheritedContacts.length === 1 ? ' associé' : 's associés'}
                </div>
                <div className="text-xs text-blue-700">
                  Hérité{inheritedContacts.length > 1 ? 's' : ''} de l'immeuble
                </div>
              </div>
              <div className="flex-shrink-0">
                {isInheritedExpanded ? (
                  <ChevronUp className="w-4 h-4 text-blue-700" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-blue-700" />
                )}
              </div>
            </div>

            {/* Expanded contact list */}
            {isInheritedExpanded && (
              <div className="border-t border-blue-200/60 bg-white/50">
                <div className="p-2 space-y-1.5 max-h-[138px] overflow-y-auto">
                  {inheritedContacts.map((contact, index) => (
                    <div
                      key={contact.id || `inherited-${index}`}
                      className="flex items-center gap-2 p-2 bg-white rounded border border-blue-100"
                    >
                      {/* Avatar for managers, icon for others */}
                      {sectionType === 'managers' ? (
                        <div className="w-7 h-7 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-700" />
                        </div>
                      ) : (
                        <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate text-gray-900">{contact.name}</div>
                        <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                        {contact.phone && (
                          <div className="text-xs text-gray-500 truncate">{contact.phone}</div>
                        )}
                        {contact.company && (
                          <div className="text-xs text-gray-600 truncate font-medium">🏢 {contact.company}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Separator between inherited summary and lot-specific contacts */}
        {!readOnly && showInheritedSummary && inheritedContacts.length > 0 && contacts.length === 0 && (
          <div className="border-t border-slate-200 my-1.5 pt-1.5" />
        )}

        {/* Lot-specific contacts */}
        {contacts.length > 0 ? (
          contacts.map((contact, index) => {
            const canRemoveThisContact = canRemove(contact)

            return (
              <div
                key={contact.id || `contact-${index}`}
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
                    {contact.phone && (
                      <div className="text-xs text-gray-500 truncate">{contact.phone}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : showMinRequiredWarning ? (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 text-center">
            ⚠️ Au moins {minRequired} {minRequired === 1 ? label.toLowerCase().replace(/s$/, '') : label.toLowerCase()} requis
          </div>
        ) : (
          !showInheritedSummary || inheritedContacts.length === 0 ? (
            <p className="text-xs text-gray-500 px-2 py-1">{config.emptyMessage}</p>
          ) : null
        )}
      </div>

      {/* Add/Edit button - sticky at bottom, only visible if not in readOnly mode */}
      {!readOnly && onAddContact && (
        <div className="p-2 pt-0 bg-white border-t border-slate-100 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onAddContact()
            }}
            className={`w-full text-xs ${colorScheme.buttonBorder} ${colorScheme.buttonText} ${colorScheme.buttonHover} h-8`}
          >
            {contacts.length > 0 ? (
              <>
                <Edit className="w-4 h-4 mr-1" />
                Modifier sélection
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                {addButtonLabel}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ContactSection
