"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building, User, Users, Home, Wrench, UserCircle, Check, ArrowLeft, Loader2 } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { User as UserType, Contact } from "@/lib/services/core/service-types"
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

interface BuildingConfirmationStepProps {
  buildingInfo: BuildingInfo
  buildingManagers: UserType[]
  buildingContacts: { [contactType: string]: Contact[] }
  lots: Lot[]
  lotContactAssignments: { [lotId: string]: { [contactType: string]: Contact[] } }
  assignedManagers: { [lotId: string]: UserType[] }
}

/**
 * Contact Type Badges - Pastilles differenciees par type de contact
 *
 * Affiche des pastilles colorees pour chaque type de contact avec tooltips
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
      label: 'Proprietaires',
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
 * Lot Category Badge Configuration
 */
const getLotCategoryConfig = (category: LotCategory) => {
  const configs = {
    appartement: {
      label: 'Appartement',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      color: 'text-blue-700'
    },
    collocation: {
      label: 'Collocation',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      color: 'text-purple-700'
    },
    maison: {
      label: 'Maison',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      color: 'text-green-700'
    },
    garage: {
      label: 'Garage',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      color: 'text-gray-700'
    },
    local_commercial: {
      label: 'Local commercial',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      color: 'text-orange-700'
    },
    parking: {
      label: 'Parking',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      color: 'text-yellow-700'
    },
    autre: {
      label: 'Autre',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      color: 'text-slate-700'
    }
  }

  return configs[category] || configs.autre
}

/**
 * Building Confirmation Step - Read-only summary
 *
 * Final step showing a comprehensive summary of the building configuration
 * before creation. Layout inspired by BuildingContactsStepV2 but in read-only mode.
 */
export function BuildingConfirmationStep({
  buildingInfo,
  buildingManagers,
  buildingContacts,
  lots,
  lotContactAssignments,
  assignedManagers
}: BuildingConfirmationStepProps) {
  // Helper functions
  const getLotContactsByType = (lotId: string, contactType: string): Contact[] => {
    return lotContactAssignments[lotId]?.[contactType] || []
  }

  const getAssignedManagers = (lotId: string): UserType[] => {
    return assignedManagers[lotId] || []
  }

  return (
    <div className="space-y-3 @container">
      {/* Building Information - Card unique pour l'immeuble */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-2.5 space-y-2">
          {/* En-tete immeuble */}
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
              {buildingInfo.description && (
                <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                  {buildingInfo.description}
                </p>
              )}
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
              {/* Tous les gestionnaires */}
              {buildingManagers.length > 0 ? (
                buildingManagers.map((manager) => (
                  <div
                    key={manager.user.id}
                    className="flex items-center gap-2 p-1.5 bg-blue-50 rounded border border-blue-200"
                  >
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-xs">{manager.user.name}</div>
                      <div className="text-[10px] text-gray-500">{manager.user.email}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-2 bg-gray-50 rounded text-[10px] text-gray-600 text-center">
                  Aucun gestionnaire
                </div>
              )}

              <p className="text-[10px] text-gray-600 pt-1">
                Recevront les notifications de l'immeuble et de tous les lots
              </p>
            </div>
          </div>

          {/* Contacts de l'immeuble */}
          {(buildingContacts.provider?.length > 0 || buildingContacts.owner?.length > 0 || buildingContacts.other?.length > 0) && (
            <div className="border border-orange-200 rounded-lg p-2 bg-white">
              <div className="flex items-center gap-1.5 mb-1.5">
                <UserCircle className="w-3.5 h-3.5 text-orange-600" />
                <span className="font-medium text-orange-900 text-xs">
                  Contacts de l'immeuble
                </span>
              </div>

              <div className="space-y-2">
                {/* Providers */}
                {buildingContacts.provider && buildingContacts.provider.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-green-600" />
                      <span className="text-xs font-medium text-green-700">Prestataires ({buildingContacts.provider.length})</span>
                    </div>
                    {buildingContacts.provider.map((contact) => (
                      <div key={contact.id} className="flex items-center gap-2 p-1.5 bg-green-50 rounded border border-green-200 ml-4">
                        <div>
                          <div className="font-medium text-xs">{contact.name}</div>
                          <div className="text-[10px] text-gray-500">{contact.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Owners */}
                {buildingContacts.owner && buildingContacts.owner.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Home className="w-3 h-3 text-orange-600" />
                      <span className="text-xs font-medium text-orange-700">Proprietaires ({buildingContacts.owner.length})</span>
                    </div>
                    {buildingContacts.owner.map((contact) => (
                      <div key={contact.id} className="flex items-center gap-2 p-1.5 bg-orange-50 rounded border border-orange-200 ml-4">
                        <div>
                          <div className="font-medium text-xs">{contact.name}</div>
                          <div className="text-[10px] text-gray-500">{contact.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Others */}
                {buildingContacts.other && buildingContacts.other.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <UserCircle className="w-3 h-3 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Autres ({buildingContacts.other.length})</span>
                    </div>
                    {buildingContacts.other.map((contact) => (
                      <div key={contact.id} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded border border-gray-200 ml-4">
                        <div>
                          <div className="font-medium text-xs">{contact.name}</div>
                          <div className="text-[10px] text-gray-500">{contact.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-gray-600">
                  Disponibles pour tous les lots
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lots Grid - 3 columns with container queries */}
      {lots.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-sm font-semibold text-gray-900">Lots configures</h3>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {lots.length}
            </Badge>
          </div>

          <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-2.5">
            {[...lots].reverse().map((lot) => {
              const lotManagers = getAssignedManagers(lot.id)
              const tenants = getLotContactsByType(lot.id, 'tenant')
              const providers = getLotContactsByType(lot.id, 'provider')
              const owners = getLotContactsByType(lot.id, 'owner')
              const others = getLotContactsByType(lot.id, 'other')
              const categoryConfig = getLotCategoryConfig(lot.category)

              return (
                <Card
                  key={lot.id}
                  className="border-gray-200"
                >
                  {/* Lot Header - Always Visible */}
                  <CardContent className="p-2.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">{lot.reference}</h3>
                          <Badge
                            variant="outline"
                            className={`${categoryConfig.bgColor} ${categoryConfig.borderColor} ${categoryConfig.color} text-[10px] px-1.5 py-0 flex-shrink-0`}
                          >
                            {categoryConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-600">Etage {lot.floor}</span>
                          {lot.doorNumber && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-600">Porte {lot.doorNumber}</span>
                            </>
                          )}
                        </div>
                        {/* Contact Badges */}
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          <ContactTypeBadges
                            managers={lotManagers}
                            tenants={tenants}
                            providers={providers}
                            owners={owners}
                            others={others}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Gestionnaires specifiques */}
                    {lotManagers.length > 0 && (
                      <div className="border border-purple-200 rounded-lg p-2 bg-purple-50/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Users className="w-3 h-3 text-purple-600" />
                          <span className="font-medium text-purple-900 text-xs">
                            Responsables specifiques
                          </span>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">
                            {lotManagers.length}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          {lotManagers.map((manager) => (
                            <div
                              key={manager.user.id}
                              className="flex items-center gap-2 p-1.5 bg-white rounded border border-purple-200"
                            >
                              <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-medium text-xs">{manager.user.name}</div>
                                <div className="text-[10px] text-gray-500">{manager.user.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contacts specifiques */}
                    {(tenants.length > 0 || providers.length > 0 || owners.length > 0 || others.length > 0) && (
                      <div className="border border-gray-200 rounded-lg p-2 bg-white">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <UserCircle className="w-3.5 h-3.5 text-gray-600" />
                          <span className="font-medium text-gray-900 text-xs">
                            Contacts assignes
                          </span>
                        </div>

                        <div className="space-y-2">
                          {/* Tenants */}
                          {tenants.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-blue-600" />
                                <span className="text-xs font-medium text-blue-700">Locataires ({tenants.length})</span>
                              </div>
                              {tenants.map((contact) => (
                                <div key={contact.id} className="flex items-center gap-2 p-1.5 bg-blue-50 rounded border border-blue-200 ml-4">
                                  <div>
                                    <div className="font-medium text-xs">{contact.name}</div>
                                    <div className="text-[10px] text-gray-500">{contact.email}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Providers */}
                          {providers.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Wrench className="w-3 h-3 text-green-600" />
                                <span className="text-xs font-medium text-green-700">Prestataires ({providers.length})</span>
                              </div>
                              {providers.map((contact) => (
                                <div key={contact.id} className="flex items-center gap-2 p-1.5 bg-green-50 rounded border border-green-200 ml-4">
                                  <div>
                                    <div className="font-medium text-xs">{contact.name}</div>
                                    <div className="text-[10px] text-gray-500">{contact.email}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Owners */}
                          {owners.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Home className="w-3 h-3 text-orange-600" />
                                <span className="text-xs font-medium text-orange-700">Proprietaires ({owners.length})</span>
                              </div>
                              {owners.map((contact) => (
                                <div key={contact.id} className="flex items-center gap-2 p-1.5 bg-orange-50 rounded border border-orange-200 ml-4">
                                  <div>
                                    <div className="font-medium text-xs">{contact.name}</div>
                                    <div className="text-[10px] text-gray-500">{contact.email}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Others */}
                          {others.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <UserCircle className="w-3 h-3 text-gray-600" />
                                <span className="text-xs font-medium text-gray-700">Autres ({others.length})</span>
                              </div>
                              {others.map((contact) => (
                                <div key={contact.id} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded border border-gray-200 ml-4">
                                  <div>
                                    <div className="font-medium text-xs">{contact.name}</div>
                                    <div className="text-[10px] text-gray-500">{contact.email}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
