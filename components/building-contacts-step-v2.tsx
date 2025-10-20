"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building, User, Users, Plus, X, ChevronDown, ChevronUp, Wrench, Home, UserCircle } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import type { User as UserType, Team, Contact } from "@/lib/services/core/service-types"
import { LotCategory } from "@/lib/lot-types"

interface BuildingInfo {
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  description: string
}

interface Lot {
  id: string
  reference: string
  floor: string
  doorNumber: string
  description: string
  category: LotCategory
}

interface BuildingContactsStepV2Props {
  buildingInfo: BuildingInfo
  teamManagers: UserType[]
  buildingManagers: UserType[] // Tous les gestionnaires de l'immeuble (minimum 1 requis)
  userProfile: {
    id: string
    email: string
    name: string
    role: string
  }
  userTeam: Team
  lots: Lot[]
  expandedLots: { [key: string]: boolean }
  buildingContacts: { [contactType: string]: Contact[] }
  lotContactAssignments: { [lotId: string]: { [contactType: string]: Contact[] } }
  assignedManagers: { [key: string]: UserType[] }
  contactSelectorRef: React.RefObject<ContactSelectorRef>
  handleContactAdd: (contact: Contact, contactType: string, context?: { lotId?: string }) => void
  handleBuildingContactRemove: (contactId: string, contactType: string) => void
  removeContactFromLot: (lotId: string, contactType: string, contactId: string) => void
  getLotContactsByType: (lotId: string, contactType: string) => Contact[]
  getAllLotContacts: (lotId: string) => Contact[]
  getAssignedManagers: (lotId: string) => UserType[]
  removeManagerFromLot: (lotId: string, managerId: string) => void
  openManagerModal: (lotId: string) => void
  openBuildingManagerModal: () => void
  removeBuildingManager: (managerId: string) => void
  toggleLotExpansion: (lotId: string) => void
}

/**
 * 📧 Contact Type Badges - Pastilles différenciées par type de contact
 *
 * Affiche des pastilles colorées pour chaque type de contact avec tooltips
 * montrant les noms des contacts au survol.
 */
interface ContactTypeBadgesProps {
  managers: UserType[]
  tenants: Contact[]
  providers: Contact[]
  owners: Contact[]
  others: Contact[]
}

function ContactTypeBadges({
  managers,
  tenants,
  providers,
  owners,
  others
}: ContactTypeBadgesProps) {
  const contactTypes = [
    {
      key: 'managers',
      contacts: managers,
      label: 'Gestionnaires',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200',
      icon: Users,
      getName: (contact: UserType) => contact.name || contact.email
    },
    {
      key: 'tenants',
      contacts: tenants,
      label: 'Locataires',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      icon: User,
      getName: (contact: Contact) => contact.name || contact.email
    },
    {
      key: 'providers',
      contacts: providers,
      label: 'Prestataires',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      icon: Wrench,
      getName: (contact: Contact) => contact.name || contact.email
    },
    {
      key: 'owners',
      contacts: owners,
      label: 'Propriétaires',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      icon: Home,
      getName: (contact: Contact) => contact.name || contact.email
    },
    {
      key: 'others',
      contacts: others,
      label: 'Autres',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      icon: UserCircle,
      getName: (contact: Contact) => contact.name || contact.email
    }
  ]

  const visibleTypes = contactTypes.filter(type => type.contacts.length > 0)

  return (
    <>
      {visibleTypes.map(type => {
        const Icon = type.icon
        return (
          <Tooltip key={type.key}>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 cursor-help ${type.bgColor} ${type.textColor} ${type.borderColor} border flex-shrink-0`}
              >
                <Icon className="w-3 h-3 mr-0.5" />
                {type.contacts.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold text-xs">{type.label} ({type.contacts.length})</p>
                <div className="space-y-0.5">
                  {type.contacts.map((contact: any, index: number) => (
                    <p key={contact.id || index} className="text-xs">
                      • {type.getName(contact)}
                    </p>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </>
  )
}

/**
 * ✨ V2 VERSION - Grid layout with container queries + Building Managers Section
 *
 * Key improvements:
 * ✅ 3-column grid on desktop (vs vertical accordion)
 * ✅ Container queries for true responsive behavior
 * ✅ Ultra-compact design (reduced padding/spacing)
 * ✅ Inline badges instead of separate sections
 * ✅ Full-width expansion when lot is opened
 * ✅ Building managers section (all equal, minimum 1 required)
 * ✅ Contact types limited to 4: tenant, provider, owner, other
 *
 * Manager Architecture:
 * - All building managers are equal (no "principal" distinction)
 * - Minimum 1 manager required (validation)
 * - Default: current user is pre-selected at creation
 * - All managers linked via building_contacts table
 * - Lot managers are additional (in lot_contacts table)
 */
export function BuildingContactsStepV2({
  buildingInfo,
  teamManagers,
  buildingManagers,
  userProfile,
  userTeam,
  lots,
  expandedLots,
  buildingContacts,
  lotContactAssignments,
  assignedManagers,
  contactSelectorRef,
  handleContactAdd,
  handleBuildingContactRemove,
  removeContactFromLot,
  getLotContactsByType,
  getAllLotContacts,
  getAssignedManagers,
  removeManagerFromLot,
  openManagerModal,
  openBuildingManagerModal,
  removeBuildingManager,
  toggleLotExpansion
}: BuildingContactsStepV2Props) {
  return (
    <div className="space-y-3 @container">
      {/* Building Information - Card unique pour l'immeuble */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-2.5 space-y-2">
          {/* En-tête immeuble */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Building className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <h2 className="text-sm font-semibold text-gray-900 truncate">
                  {buildingInfo.name || `Immeuble - ${buildingInfo.address}`}
                </h2>
              </div>
              <p className="text-gray-600 text-xs">
                {buildingInfo.address}, {buildingInfo.city}{" "}
                {buildingInfo.postalCode && `- ${buildingInfo.postalCode}`}
              </p>
            </div>
          </div>

          {/* Gestionnaires de l'immeuble */}
          <div className="border border-blue-200 rounded-lg p-2 bg-white">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-medium text-blue-900 text-xs">
                Gestionnaires de l'immeuble
              </span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
                {buildingManagers.length}
              </Badge>
            </div>

            <div className="space-y-1.5">
              {/* Tous les gestionnaires (minimum 1 requis) */}
              {buildingManagers.length > 0 ? (
                buildingManagers.map((manager) => (
                  <div
                    key={manager.user.id}
                    className="flex items-center justify-between p-1.5 bg-blue-50 rounded border border-blue-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-xs">{manager.user.name}</div>
                        <div className="text-[10px] text-gray-500">{manager.user.email}</div>
                      </div>
                    </div>
                    {buildingManagers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeBuildingManager(manager.user.id)
                        }}
                        className="text-red-500 hover:text-red-700 h-5 w-5 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-[10px] text-red-700">
                  ⚠️ Au moins 1 gestionnaire requis
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  openBuildingManagerModal()
                }}
                className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-50 h-6"
              >
                <Plus className="w-3 h-3 mr-1" />
                Ajouter gestionnaire
              </Button>

              <p className="text-[10px] text-gray-600">
                Recevront les notifications de l'immeuble et de tous les lots
              </p>
            </div>
          </div>

          {/* Contacts de l'immeuble */}
          <div className="border border-orange-200 rounded-lg p-2 bg-white">
            <ContactSelector
              ref={contactSelectorRef}
              teamId={userTeam?.id || ""}
              displayMode="compact"
              title="Contacts de l'immeuble"
              description="Disponibles pour tous les lots"
              selectedContacts={buildingContacts}
              onContactSelected={handleContactAdd}
              onContactRemoved={handleBuildingContactRemove}
              allowedContactTypes={["provider", "owner", "other"]}
              hideTitle={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lots Grid - 3 columns with container queries */}
      <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-2.5">
        {[...lots].reverse().map((lot) => {
          const lotManagers = getAssignedManagers(lot.id)
          const tenants = getLotContactsByType(lot.id, 'tenant')
          const providers = getLotContactsByType(lot.id, 'provider')
          const owners = getLotContactsByType(lot.id, 'owner')
          const others = getLotContactsByType(lot.id, 'other')
          const isExpanded = expandedLots[lot.id]

          return (
            <Card
              key={lot.id}
              className={`border-gray-200 transition-all ${
                isExpanded ? "@lg:col-span-3 @md:col-span-2" : ""
              }`}
            >
              {/* Lot Header - Always Visible */}
              <div
                className="p-2.5 cursor-pointer hover:bg-gray-50/50"
                onClick={() => toggleLotExpansion(lot.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{lot.reference}</h3>
                    <ContactTypeBadges
                      managers={lotManagers}
                      tenants={tenants}
                      providers={providers}
                      owners={owners}
                      others={others}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-gray-600 font-medium">
                      {isExpanded ? "Fermer" : "Ouvrir"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="p-2.5 pt-0 space-y-2">
                  {/* Specific Manager Section */}
                  <div className="border border-purple-200 rounded-lg p-2 bg-purple-50/30">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span className="font-medium text-purple-900 text-xs">
                        Responsables spécifiques du lot
                      </span>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">
                        {lotManagers.length}
                      </Badge>
                    </div>

                    {buildingManagers.length > 0 && (
                      <div className="mb-1.5 p-1.5 bg-purple-100/50 rounded text-[10px] text-purple-700">
                        <div className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          <span className="font-medium">
                            {buildingManagers.length} gestionnaire{buildingManagers.length > 1 ? 's' : ''} de l'immeuble
                          </span>
                        </div>
                        <div className="mt-0.5">+ Gestionnaires spécifiques ci-dessous</div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {lotManagers.length > 0 ? (
                        lotManagers.map((manager) => (
                          <div
                            key={manager.user.id}
                            className="flex items-center justify-between p-2 bg-white rounded border border-purple-200"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-medium text-xs">
                                  {manager.user.name}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  {manager.user.email}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeManagerFromLot(lot.id, manager.user.id)
                              }}
                              className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 bg-gray-50 rounded text-[10px] text-gray-600 text-center">
                          Aucun gestionnaire spécifique
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openManagerModal(lot.id)
                        }}
                        className="w-full text-xs border-purple-300 text-purple-700 hover:bg-purple-50 h-7"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Ajouter
                      </Button>

                      <p className="text-[10px] text-gray-600">
                        Recevront les notifications spécifiques à ce lot, en plus des gestionnaires de l'immeuble
                      </p>
                    </div>
                  </div>

                  {/* Contacts Section */}
                  <div className="border border-gray-200 rounded-lg p-2">
                    <ContactSelector
                      teamId={userTeam?.id || ""}
                      displayMode="compact"
                      title="Contacts assignés"
                      description="Spécifiques à ce lot"
                      selectedContacts={{
                        tenant: getLotContactsByType(lot.id, "tenant"),
                        provider: getLotContactsByType(lot.id, "provider"),
                        owner: getLotContactsByType(lot.id, "owner"),
                        other: getLotContactsByType(lot.id, "other"),
                      }}
                      onContactSelected={(contact, contactType, context) => {
                        if (context?.lotId) {
                          handleContactAdd(contact, contactType, context)
                        }
                      }}
                      onContactRemoved={(contactId, contactType, context) => {
                        if (context?.lotId) {
                          removeContactFromLot(context.lotId, contactType, contactId)
                        }
                      }}
                      onDirectContactRemove={(contactId, contactType, lotId) => {
                        if (lotId) {
                          removeContactFromLot(lotId, contactType, contactId)
                        }
                      }}
                      allowedContactTypes={["tenant", "provider", "owner", "other"]}
                      lotId={lot.id}
                      hideTitle={false}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
