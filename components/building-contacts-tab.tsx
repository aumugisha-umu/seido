"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import {
  Building2,
  Users,
  User,
  Home,
  Wrench,
  UserCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  X
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/services"
import { logger } from '@/lib/logger'
import type { Contact } from "@/lib/services"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import { ContactTypeDropdown } from "@/components/contact-type-dropdown"
import { assignContactToBuildingAction, removeContactFromBuildingAction, removeContactFromLotAction } from "@/app/gestionnaire/biens/immeubles/[id]/actions"
import { assignContactToLotAction } from "@/app/gestionnaire/biens/lots/nouveau/actions"

// Types
interface BuildingContact {
  id: string
  user_id: string
  building_id: string
  is_primary: boolean
  user: {
    id: string
    name: string
    email: string
    phone?: string
    role: string
    provider_category?: string
  }
}

interface LotContact {
  id: string
  user_id: string
  lot_id: string
  is_primary: boolean
  user: {
    id: string
    name: string
    email: string
    phone?: string
    role: string
  }
}

interface LotWithContacts {
  id: string
  reference: string
  category: string
  floor: number
  apartment_number?: string
  lot_contacts: LotContact[]
}

interface BuildingContactsTabProps {
  buildingId: string
  buildingName: string
  teamId: string
  lots: {
    id: string
    reference: string
    category: string
    floor: number
    apartment_number?: string
  }[]
  onContactsUpdate?: () => void
  onContactsCountUpdate?: (count: number) => void
}

/**
 * 🏢 Building Contacts Tab - Vue hiérarchique des contacts
 *
 * Affiche :
 * - Section Contacts de l'immeuble (gestionnaires, propriétaires, prestataires)
 * - Grid de lots avec leurs contacts spécifiques (locataires, etc.)
 */
export function BuildingContactsTab({
  buildingId,
  buildingName,
  teamId,
  lots: propLots,
  onContactsUpdate,
  onContactsCountUpdate
}: BuildingContactsTabProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Building contacts state
  const [buildingContacts, setBuildingContacts] = useState<BuildingContact[]>([])

  // Lots with contacts state
  const [lotsWithContacts, setLotsWithContacts] = useState<LotWithContacts[]>([])
  const [expandedLots, setExpandedLots] = useState<Record<string, boolean>>({})

  // ContactSelector reference
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Loading state for assignments
  const [isAssigning, setIsAssigning] = useState(false)

  // Selected contacts to pass to ContactSelector (for duplicate detection)
  const [selectedContactsForModal, setSelectedContactsForModal] = useState<{[contactType: string]: Contact[]}>({})
  const [currentLotId, setCurrentLotId] = useState<string | undefined>(undefined)

  // Load building and lots contacts
  useEffect(() => {
    loadAllContacts()
  }, [buildingId])

  const loadAllContacts = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createBrowserSupabaseClient()

      // 1. Load building contacts
      const { data: buildingContactsData, error: buildingError } = await supabase
        .from('building_contacts')
        .select(`
          id,
          user_id,
          building_id,
          is_primary,
          user:user_id(
            id,
            name,
            email,
            phone,
            role,
            provider_category
          )
        `)
        .eq('building_id', buildingId)
        .order('is_primary', { ascending: false })

      if (buildingError) {
        logger.error("❌ Building contacts query error:", buildingError)
        throw buildingError
      }

      setBuildingContacts(buildingContactsData as BuildingContact[] || [])
      logger.info("✅ Building contacts loaded:", buildingContactsData?.length || 0)

      // 2. Load lots with their contacts
      const { data: lotsData, error: lotsError } = await supabase
        .from('lots')
        .select(`
          id,
          reference,
          category,
          floor,
          apartment_number,
          lot_contacts(
            id,
            user_id,
            lot_id,
            is_primary,
            user:user_id(
              id,
              name,
              email,
              phone,
              role
            )
          )
        `)
        .eq('building_id', buildingId)
        .order('reference')

      if (lotsError) {
        logger.error("❌ Lots query error:", lotsError)
        logger.error("❌ Full error details:", JSON.stringify(lotsError, null, 2))
        throw lotsError
      }

      setLotsWithContacts(lotsData as LotWithContacts[] || [])
      logger.info("✅ Lots with contacts loaded:", lotsData?.length || 0)

      // Calculate and update total contacts count
      const buildingContactsCount = (buildingContactsData as BuildingContact[] || []).length
      const lotContactsCount = (lotsData as LotWithContacts[] || []).reduce((sum, lot) => sum + lot.lot_contacts.length, 0)
      const totalCount = buildingContactsCount + lotContactsCount
      onContactsCountUpdate?.(totalCount)
      logger.info("📊 Total contacts:", totalCount, `(building: ${buildingContactsCount}, lots: ${lotContactsCount})`)

    } catch (error) {
      logger.error("❌ Error loading contacts:", error)
      logger.error("❌ Error details:", JSON.stringify(error, null, 2))

      // More detailed error message
      let errorMessage = "Erreur lors du chargement des contacts"
      if (error && typeof error === 'object') {
        const err = error as any
        if (err.message) errorMessage = err.message
        if (err.details) errorMessage += ` - ${err.details}`
        if (err.hint) errorMessage += ` (Hint: ${err.hint})`
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const toggleLotExpansion = (lotId: string) => {
    setExpandedLots(prev => ({
      ...prev,
      [lotId]: !prev[lotId]
    }))
  }

  // Convert BuildingContact or LotContact user to Contact format
  const toContact = (user: any): Contact => ({
    id: user.id,
    name: user.name,
    email: user.email,
    type: user.role,
    phone: user.phone,
    speciality: user.provider_category
  })

  // Open ContactSelector for building
  const openBuildingContactModal = (contactType: string = 'provider') => {
    // Format existing building contacts for the modal
    const formattedContacts: {[key: string]: Contact[]} = {}

    buildingContacts.forEach(bc => {
      const contact = toContact(bc.user)
      const type = bc.user.role === 'gestionnaire' ? 'manager' :
                   bc.user.role === 'proprietaire' ? 'owner' :
                   bc.user.role === 'prestataire' ? 'provider' : 'other'

      if (!formattedContacts[type]) formattedContacts[type] = []
      formattedContacts[type].push(contact)
    })

    setSelectedContactsForModal(formattedContacts)
    setCurrentLotId(undefined)
    contactSelectorRef.current?.openContactModal(contactType)
  }

  // Open ContactSelector for specific lot
  const openLotContactModal = (contactType: string = 'tenant', lotId: string) => {
    // Find the lot and format its contacts for the modal
    const lot = lotsWithContacts.find(l => l.id === lotId)
    const formattedContacts: {[key: string]: Contact[]} = {}

    if (lot) {
      lot.lot_contacts.forEach(lc => {
        const contact = toContact(lc.user)
        const type = lc.user.role === 'gestionnaire' ? 'manager' :
                     lc.user.role === 'locataire' ? 'tenant' :
                     lc.user.role === 'prestataire' ? 'provider' :
                     lc.user.role === 'proprietaire' ? 'owner' : 'other'

        if (!formattedContacts[type]) formattedContacts[type] = []
        formattedContacts[type].push(contact)
      })
    }

    setSelectedContactsForModal(formattedContacts)
    setCurrentLotId(lotId)
    contactSelectorRef.current?.openContactModal(contactType, lotId)
  }

  // Handle contact selection/creation
  const handleContactSelected = async (contact: Contact, contactType: string, context?: { lotId?: string }) => {
    setIsAssigning(true)

    try {
      if (context?.lotId) {
        // Assign to lot
        logger.info(`📞 Assigning contact ${contact.name} to lot ${context.lotId}`)
        const result = await assignContactToLotAction(context.lotId, contact.id, false)

        if (result.success) {
          toast({
            title: "Contact assigné",
            description: `${contact.name} a été assigné au lot`,
            variant: "default",
          })
          await loadAllContacts()
          onContactsUpdate?.()
        } else {
          throw new Error(result.error?.message || 'Erreur lors de l\'assignation')
        }
      } else {
        // Assign to building
        logger.info(`🏢 Assigning contact ${contact.name} to building ${buildingId}`)
        const result = await assignContactToBuildingAction(buildingId, contact.id, false)

        if (result.success) {
          toast({
            title: "Contact assigné",
            description: `${contact.name} a été assigné à l'immeuble`,
            variant: "default",
          })
          await loadAllContacts()
          onContactsUpdate?.()
        } else {
          throw new Error(result.error || 'Erreur lors de l\'assignation')
        }
      }
    } catch (error) {
      logger.error("❌ Error assigning contact:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'assigner le contact",
        variant: "destructive",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  // Handle building contact removal
  const handleRemoveBuildingContact = async (buildingContactId: string, contactName: string) => {
    try {
      logger.info(`🗑️ Removing building contact ${buildingContactId}`)
      const result = await removeContactFromBuildingAction(buildingContactId)

      if (result.success) {
        toast({
          title: "Contact retiré",
          description: `${contactName} a été retiré de l'immeuble`,
          variant: "default",
        })
        await loadAllContacts()
        onContactsUpdate?.()
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      logger.error("❌ Error removing building contact:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de retirer le contact",
        variant: "destructive",
      })
    }
  }

  // Handle lot contact removal
  const handleRemoveLotContact = async (lotContactId: string, contactName: string) => {
    try {
      logger.info(`🗑️ Removing lot contact ${lotContactId}`)
      const result = await removeContactFromLotAction(lotContactId)

      if (result.success) {
        toast({
          title: "Contact retiré",
          description: `${contactName} a été retiré du lot`,
          variant: "default",
        })
        await loadAllContacts()
        onContactsUpdate?.()
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      logger.error("❌ Error removing lot contact:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de retirer le contact",
        variant: "destructive",
      })
    }
  }

  // Group building contacts by role
  const groupedBuildingContacts = {
    gestionnaires: buildingContacts.filter(c => c.user.role === 'gestionnaire'),
    proprietaires: buildingContacts.filter(c => c.user.role === 'proprietaire'),
    prestataires: buildingContacts.filter(c => c.user.role === 'prestataire'),
    autres: buildingContacts.filter(c =>
      c.user.role !== 'gestionnaire' &&
      c.user.role !== 'proprietaire' &&
      c.user.role !== 'prestataire' &&
      !c.user.provider_category
    )
  }

  // Group lot contacts by role
  const groupLotContacts = (lotContacts: LotContact[]) => {
    return {
      locataires: lotContacts.filter(c => c.user.role === 'locataire'),
      prestataires: lotContacts.filter(c => c.user.role === 'prestataire'),
      proprietaires: lotContacts.filter(c => c.user.role === 'proprietaire'),
      autres: lotContacts.filter(c =>
        c.user.role !== 'locataire' &&
        c.user.role !== 'prestataire' &&
        c.user.role !== 'proprietaire'
      )
    }
  }

  // Get badge configuration by role
  const getRoleBadge = (role: string, providerCategory?: string) => {
    if (role === 'gestionnaire') {
      return { label: 'Gestionnaire', className: 'bg-purple-100 text-purple-700 border-purple-200' }
    }
    if (role === 'locataire') {
      return { label: 'Locataire', className: 'bg-blue-100 text-blue-700 border-blue-200' }
    }
    if (role === 'proprietaire') {
      return { label: 'Propriétaire', className: 'bg-amber-100 text-amber-700 border-amber-200' }
    }
    if (role === 'prestataire') {
      return { label: 'Prestataire', className: 'bg-green-100 text-green-700 border-green-200' }
    }
    return { label: 'Autre', className: 'bg-gray-100 text-gray-700 border-gray-200' }
  }

  // Get category badge configuration
  const getCategoryBadge = (category: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      appartement: { label: 'Appartement', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      collocation: { label: 'Collocation', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      maison: { label: 'Maison', className: 'bg-green-100 text-green-700 border-green-200' },
      garage: { label: 'Garage', className: 'bg-gray-100 text-gray-700 border-gray-200' },
      local_commercial: { label: 'Local commercial', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      parking: { label: 'Parking', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      autre: { label: 'Autre', className: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
    return configs[category] || configs.autre
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const totalBuildingContacts = buildingContacts.length
  const totalLotContacts = lotsWithContacts.reduce((sum, lot) => sum + lot.lot_contacts.length, 0)

  return (
    <div className="space-y-6">
      {/* Section: Contacts de l'immeuble */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Contacts de l'immeuble</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {totalBuildingContacts}
              </Badge>
              <ContactTypeDropdown
                onTypeSelect={(contactType) => openBuildingContactModal(contactType)}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                excludeTypes={["tenant"]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gestionnaires */}
          {groupedBuildingContacts.gestionnaires.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <h4 className="font-semibold text-sm text-purple-900">
                  Gestionnaires ({groupedBuildingContacts.gestionnaires.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {groupedBuildingContacts.gestionnaires.map((contact) => {
                  const badge = getRoleBadge(contact.user.role)
                  return (
                    <Card key={contact.id} className="border-purple-200">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate">{contact.user.name}</p>
                                {contact.is_primary && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                    Principal
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 truncate">{contact.user.email}</p>
                              {contact.user.phone && (
                                <p className="text-xs text-gray-500">{contact.user.phone}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                            onClick={() => handleRemoveBuildingContact(contact.id, contact.user.name)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Propriétaires */}
          {groupedBuildingContacts.proprietaires.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-amber-600" />
                <h4 className="font-semibold text-sm text-amber-900">
                  Propriétaires ({groupedBuildingContacts.proprietaires.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {groupedBuildingContacts.proprietaires.map((contact) => (
                  <Card key={contact.id} className="border-amber-200">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Home className="h-4 w-4 text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{contact.user.name}</p>
                            <p className="text-xs text-gray-600 truncate">{contact.user.email}</p>
                            {contact.user.phone && (
                              <p className="text-xs text-gray-500">{contact.user.phone}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                          onClick={() => handleRemoveBuildingContact(contact.id, contact.user.name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Prestataires */}
          {groupedBuildingContacts.prestataires.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold text-sm text-green-900">
                  Prestataires ({groupedBuildingContacts.prestataires.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {groupedBuildingContacts.prestataires.map((contact) => (
                  <Card key={contact.id} className="border-green-200">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Wrench className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{contact.user.name}</p>
                            <p className="text-xs text-gray-600 truncate">{contact.user.email}</p>
                            {contact.user.phone && (
                              <p className="text-xs text-gray-500">{contact.user.phone}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                          onClick={() => handleRemoveBuildingContact(contact.id, contact.user.name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {totalBuildingContacts === 0 && (
            <div className="text-center py-8">
              <UserCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-4">Aucun contact assigné à cet immeuble</p>
              <ContactTypeDropdown
                onTypeSelect={(contactType) => openBuildingContactModal(contactType)}
                variant="outline"
                size="sm"
                excludeTypes={["tenant"]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section: Contacts par lot */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Contacts par lot</h3>
            <Badge variant="secondary">
              {lotsWithContacts.length} lot{lotsWithContacts.length > 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totalLotContacts} contact{totalLotContacts > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {lotsWithContacts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucun lot n'est associé à cet immeuble.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lotsWithContacts.map((lot) => {
              const isExpanded = expandedLots[lot.id]
              const groupedContacts = groupLotContacts(lot.lot_contacts)
              const totalContacts = lot.lot_contacts.length
              const categoryBadge = getCategoryBadge(lot.category)

              // Calculate if lot is occupied based on presence of tenants
              const isOccupied = lot.lot_contacts.some(c => c.user.role === 'locataire')

              return (
                <Card key={lot.id} className="border-gray-200 flex flex-col h-full">
                  <CardHeader className="pb-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{lot.reference}</h4>
                          <p className="text-xs text-gray-600">
                            Étage {lot.floor}
                            {lot.apartment_number && ` • Porte ${lot.apartment_number}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => router.push(`/gestionnaire/biens/lots/${lot.id}`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${categoryBadge.className}`}>
                          {categoryBadge.label}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${isOccupied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {isOccupied ? 'Occupé' : 'Vacant'}
                        </Badge>
                        {totalContacts > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {totalContacts} contact{totalContacts > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col flex-1">
                    {totalContacts === 0 ? (
                      <div className="space-y-2">
                        <ContactTypeDropdown
                          onTypeSelect={(contactType) => openLotContactModal(contactType, lot.id)}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                        />
                        <p className="text-xs text-gray-500 text-center py-2">Aucun contact assigné</p>
                      </div>
                    ) : (
                      <div className="space-y-2 flex flex-col flex-1">
                        {/* Add contact button */}
                        <ContactTypeDropdown
                          onTypeSelect={(contactType) => openLotContactModal(contactType, lot.id)}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                        />

                        {/* Locataires */}
                        {groupedContacts.locataires.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-blue-900">
                              {groupedContacts.locataires.length} locataire{groupedContacts.locataires.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}

                        {/* Prestataires */}
                        {groupedContacts.prestataires.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Wrench className="h-3 w-3 text-green-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-green-900">
                              {groupedContacts.prestataires.length} prestataire{groupedContacts.prestataires.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}

                        {/* Propriétaires */}
                        {groupedContacts.proprietaires.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Home className="h-3 w-3 text-amber-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-amber-900">
                              {groupedContacts.proprietaires.length} propriétaire{groupedContacts.proprietaires.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}

                        {/* Toggle expansion */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLotExpansion(lot.id)}
                          className="w-full text-xs h-7"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Masquer les détails
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Voir les détails
                            </>
                          )}
                        </Button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="space-y-2 pt-2 border-t">
                            {lot.lot_contacts.map((contact) => {
                              const badge = getRoleBadge(contact.user.role)
                              return (
                                <div key={contact.id} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded border">
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <User className="h-3 w-3 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <p className="font-medium text-xs truncate">{contact.user.name}</p>
                                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${badge.className}`}>
                                          {badge.label}
                                        </Badge>
                                      </div>
                                      <p className="text-[10px] text-gray-600 truncate">{contact.user.email}</p>
                                      {contact.user.phone && (
                                        <p className="text-[10px] text-gray-500">{contact.user.phone}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-gray-400 hover:text-red-600"
                                    onClick={() => handleRemoveLotContact(contact.id, contact.user.name)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ContactSelector Modal */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={teamId}
        displayMode="compact"
        hideUI={true}
        selectedContacts={selectedContactsForModal}
        lotId={currentLotId}
        onContactSelected={handleContactSelected}
        onContactCreated={handleContactSelected}
      />
    </div>
  )
}
