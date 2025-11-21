"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Building2,
  Users,
  Home,
  Mail,
  Phone,
  Eye,
  MoreHorizontal,
  Edit,
  Send,
  UserPlus,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import ContentNavigator from "@/components/content-navigator"
import { createBrowserSupabaseClient } from "@/lib/services"
import { logger } from '@/lib/logger'
import { ContactTypeDropdown } from "@/components/contact-type-dropdown"
import { removeContactFromBuildingAction, removeContactFromLotAction } from "@/app/gestionnaire/biens/immeubles/[id]/actions"
import { determineAssignmentType } from '@/lib/services'
import { useToast } from "@/components/ui/use-toast"

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
    speciality?: string
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
    provider_category?: string
    speciality?: string
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

interface BuildingContactsNavigatorProps {
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
  isEmbeddedInCard?: boolean
}

export function BuildingContactsNavigator({
  buildingId,
  buildingName,
  teamId,
  lots: propLots,
  onContactsUpdate,
  onContactsCountUpdate,
  isEmbeddedInCard = false
}: BuildingContactsNavigatorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Building contacts state
  const [buildingContacts, setBuildingContacts] = useState<BuildingContact[]>([])
  
  // Lots with contacts state
  const [lotsWithContacts, setLotsWithContacts] = useState<LotWithContacts[]>([])
  const [expandedLots, setExpandedLots] = useState<Record<string, boolean>>({})

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    role: "all",
    category: "all",
    speciality: "all"
  })

  // Debounce search term
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

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
            provider_category,
            speciality
          )
        `)
        .eq('building_id', buildingId)
        .order('is_primary', { ascending: false })

      if (buildingError) {
        logger.error("❌ Building contacts query error:", buildingError)
        throw buildingError
      }

      setBuildingContacts(buildingContactsData as BuildingContact[] || [])

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
              role,
              provider_category,
              speciality
            )
          )
        `)
        .eq('building_id', buildingId)
        .order('reference')

      if (lotsError) {
        logger.error("❌ Lots query error:", lotsError)
        throw lotsError
      }

      setLotsWithContacts(lotsData as LotWithContacts[] || [])

      // Calculate and update total contacts count
      const buildingContactsCount = (buildingContactsData as BuildingContact[] || []).length
      const totalLotContacts = (lotsData as LotWithContacts[] || []).reduce(
        (sum, lot) => sum + (lot.lot_contacts?.length || 0),
        0
      )
      const totalContacts = buildingContactsCount + totalLotContacts
      onContactsCountUpdate?.(totalContacts)

      logger.info(`✅ Contacts loaded - Building: ${buildingContactsCount}, Lots: ${totalLotContacts}, Total: ${totalContacts}`)
    } catch (err) {
      logger.error("❌ Error loading contacts:", err)
      setError(err instanceof Error ? err.message : "Erreur lors du chargement des contacts")
    } finally {
      setLoading(false)
    }
  }

  // Filter contacts based on search and filters
  const getFilteredBuildingContacts = () => {
    let filtered = buildingContacts

    // Apply search
    if (debouncedSearchTerm.trim() !== "") {
      filtered = filtered.filter(contact =>
        contact.user.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contact.user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contact.user.phone?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contact.user.speciality?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    }

    // Apply role filter
    if (filters.role !== "all") {
      filtered = filtered.filter(contact => contact.user.role === filters.role)
    }

    // Apply category filter (for providers)
    if (filters.category !== "all") {
      filtered = filtered.filter(contact => contact.user.provider_category === filters.category)
    }

    // Apply speciality filter
    if (filters.speciality !== "all") {
      filtered = filtered.filter(contact => contact.user.speciality === filters.speciality)
    }

    return filtered
  }

  const getFilteredLotsWithContacts = () => {
    let filtered = lotsWithContacts

    // Apply search
    if (debouncedSearchTerm.trim() !== "") {
      filtered = filtered.filter(lot =>
        lot.reference?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        lot.lot_contacts?.some(contact =>
          contact.user.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          contact.user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          contact.user.phone?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      )
    }

    // Apply role filter (filter lots that have contacts with matching role)
    if (filters.role !== "all") {
      filtered = filtered.map(lot => ({
        ...lot,
        lot_contacts: lot.lot_contacts?.filter(contact => contact.user.role === filters.role) || []
      })).filter(lot => lot.lot_contacts.length > 0)
    }

    // Apply category filter
    if (filters.category !== "all") {
      filtered = filtered.map(lot => ({
        ...lot,
        lot_contacts: lot.lot_contacts?.filter(contact => contact.user.provider_category === filters.category) || []
      })).filter(lot => lot.lot_contacts.length > 0)
    }

    // Apply speciality filter
    if (filters.speciality !== "all") {
      filtered = filtered.map(lot => ({
        ...lot,
        lot_contacts: lot.lot_contacts?.filter(contact => contact.user.speciality === filters.speciality) || []
      })).filter(lot => lot.lot_contacts.length > 0)
    }

    return filtered
  }

  const handleRemoveBuildingContact = async (contactId: string) => {
    try {
      const result = await removeContactFromBuildingAction(contactId, buildingId)
      if (result.success) {
        toast({
          title: "Contact retiré",
          description: "Le contact a été retiré de l'immeuble avec succès."
        })
        await loadAllContacts()
        onContactsUpdate?.()
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la suppression du contact",
          variant: "destructive"
        })
      }
    } catch (err) {
      logger.error("❌ Error removing building contact:", err)
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du contact",
        variant: "destructive"
      })
    }
  }

  const handleRemoveLotContact = async (contactId: string, lotId: string) => {
    try {
      const result = await removeContactFromLotAction(contactId, lotId)
      if (result.success) {
        toast({
          title: "Contact retiré",
          description: "Le contact a été retiré du lot avec succès."
        })
        await loadAllContacts()
        onContactsUpdate?.()
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la suppression du contact",
          variant: "destructive"
        })
      }
    } catch (err) {
      logger.error("❌ Error removing lot contact:", err)
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du contact",
        variant: "destructive"
      })
    }
  }

  const getContactTypeLabel = (contact: BuildingContact | LotContact) => {
    const assignmentUser = {
      id: contact.user.id,
      role: contact.user.role,
      provider_category: contact.user.provider_category,
      speciality: contact.user.speciality
    }
    const assignmentType = determineAssignmentType(assignmentUser)

    const types: Record<string, string> = {
      'tenant': 'Locataire',
      'owner': 'Propriétaire',
      'provider': 'Prestataire',
      'manager': 'Gestionnaire',
      'other': 'Autre'
    }
    return types[assignmentType] || 'Non défini'
  }

  const getContactTypeBadgeStyle = (contact: BuildingContact | LotContact) => {
    const assignmentUser = {
      id: contact.user.id,
      role: contact.user.role,
      provider_category: contact.user.provider_category,
      speciality: contact.user.speciality
    }
    const assignmentType = determineAssignmentType(assignmentUser)

    const styles: Record<string, string> = {
      'tenant': 'bg-blue-100 text-blue-800',
      'owner': 'bg-emerald-100 text-emerald-800',
      'provider': 'bg-green-100 text-green-800',
      'manager': 'bg-purple-100 text-purple-800',
      'other': 'bg-gray-100 text-gray-600'
    }
    return styles[assignmentType] || 'bg-gray-100 text-gray-600'
  }

  const getSpecialityLabel = (speciality?: string) => {
    if (!speciality) return ""
    const specialities: Record<string, string> = {
      'plomberie': 'Plomberie',
      'electricite': 'Électricité',
      'chauffage': 'Chauffage',
      'serrurerie': 'Serrurerie',
      'peinture': 'Peinture',
      'menage': 'Ménage',
      'jardinage': 'Jardinage',
      'autre': 'Autre'
    }
    return specialities[speciality] || speciality
  }

  const filteredBuildingContacts = getFilteredBuildingContacts()
  const filteredLotsWithContacts = getFilteredLotsWithContacts()
  const totalLotContacts = filteredLotsWithContacts.reduce((sum, lot) => sum + lot.lot_contacts.length, 0)

  const contentNavigatorClasses = isEmbeddedInCard
    ? "bg-transparent border-0 shadow-none"
    : ""

  return (
    <ContentNavigator
      tabs={[
        {
          id: "building",
          label: "Contacts de l'immeuble",
          icon: Building2,
          count: loading ? "..." : filteredBuildingContacts.length,
          content: (
            <>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredBuildingContacts.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {buildingContacts.length === 0 ? "Aucun contact assigné à cet immeuble" : "Aucun contact trouvé"}
                  </h3>
                  <p className="text-slate-500 mb-4">
                    {buildingContacts.length === 0
                      ? "Ajoutez des contacts pour gérer cet immeuble."
                      : "Essayez de modifier votre recherche ou vos filtres."}
                  </p>
                  {buildingContacts.length === 0 && (
                    <ContactTypeDropdown
                      onTypeSelect={(contactType) => router.push(`/gestionnaire/contacts/nouveau?buildingId=${buildingId}&type=${contactType}`)}
                      variant="default"
                      size="default"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBuildingContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-lg">
                            {contact.user.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="font-medium text-slate-900">{contact.user.name}</h3>
                            <Badge
                              variant="secondary"
                              className={`${getContactTypeBadgeStyle(contact)} text-xs font-medium`}
                            >
                              {getContactTypeLabel(contact)}
                            </Badge>
                            {contact.is_primary && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                                Principal
                              </Badge>
                            )}
                            {contact.user.speciality && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                {getSpecialityLabel(contact.user.speciality)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{contact.user.email}</span>
                            </div>
                            {contact.user.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{contact.user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                          onClick={() => router.push(`/gestionnaire/contacts/details/${contact.user.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Détails
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="text-slate-600 hover:text-slate-700">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => router.push(`/gestionnaire/contacts/modifier/${contact.user.id}`)}
                              className="cursor-pointer"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.open(`mailto:${contact.user.email}`, '_blank')}
                              className="cursor-pointer"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Contacter
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemoveBuildingContact(contact.id)}
                              className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Retirer de l'immeuble
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        },
        {
          id: "lots",
          label: "Contacts par lot",
          icon: Home,
          count: loading ? "..." : totalLotContacts,
          content: (
            <>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredLotsWithContacts.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {lotsWithContacts.length === 0 ? "Aucun lot avec contacts" : "Aucun lot trouvé"}
                  </h3>
                  <p className="text-slate-500 mb-6">
                    {lotsWithContacts.length === 0
                      ? "Les contacts assignés aux lots apparaîtront ici"
                      : "Essayez de modifier votre recherche ou vos filtres."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLotsWithContacts.map((lot) => {
                    const isExpanded = expandedLots[lot.id] || false
                    const lotContactsCount = lot.lot_contacts.length

                    return (
                      <Card key={lot.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <CardTitle className="text-base">{lot.reference}</CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {lot.category}
                                  </Badge>
                                  {lot.floor !== undefined && (
                                    <span className="text-xs text-slate-500">Étage {lot.floor}</span>
                                  )}
                                  {lot.apartment_number && (
                                    <span className="text-xs text-slate-500">Appartement {lot.apartment_number}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                {lotContactsCount} {lotContactsCount === 1 ? 'contact' : 'contacts'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedLots(prev => ({ ...prev, [lot.id]: !isExpanded }))}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        {isExpanded && (
                          <CardContent className="pt-0 space-y-3">
                            {lot.lot_contacts.map((contact) => (
                              <div
                                key={contact.id}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">
                                      {contact.user.name?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="font-medium text-slate-900">{contact.user.name}</span>
                                      <Badge
                                        variant="secondary"
                                        className={`${getContactTypeBadgeStyle(contact)} text-xs`}
                                      >
                                        {getContactTypeLabel(contact)}
                                      </Badge>
                                      {contact.is_primary && (
                                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                                          Principal
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-3 text-xs text-slate-600">
                                      <div className="flex items-center space-x-1">
                                        <Mail className="h-3 w-3" />
                                        <span>{contact.user.email}</span>
                                      </div>
                                      {contact.user.phone && (
                                        <div className="flex items-center space-x-1">
                                          <Phone className="h-3 w-3" />
                                          <span>{contact.user.phone}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                                    onClick={() => router.push(`/gestionnaire/contacts/details/${contact.user.id}`)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemoveLotContact(contact.id, lot.id)}
                                  >
                                    Retirer
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => router.push(`/gestionnaire/contacts/nouveau?lotId=${lot.id}`)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Ajouter un contact
                            </Button>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )
        }
      ]}
      defaultTab="building"
      searchPlaceholder="Rechercher un contact..."
      filters={[
        {
          id: "role",
          label: "Rôle",
          options: [
            { value: "all", label: "Tous les rôles" },
            { value: "gestionnaire", label: "Gestionnaire" },
            { value: "locataire", label: "Locataire" },
            { value: "proprietaire", label: "Propriétaire" },
            { value: "prestataire", label: "Prestataire" }
          ],
          defaultValue: "all"
        },
        {
          id: "category",
          label: "Catégorie",
          options: [
            { value: "all", label: "Toutes les catégories" },
            { value: "prestataire", label: "Prestataire" },
            { value: "autre", label: "Autre" }
          ],
          defaultValue: "all"
        },
        {
          id: "speciality",
          label: "Spécialité",
          options: [
            { value: "all", label: "Toutes les spécialités" },
            { value: "plomberie", label: "Plomberie" },
            { value: "electricite", label: "Électricité" },
            { value: "chauffage", label: "Chauffage" },
            { value: "serrurerie", label: "Serrurerie" },
            { value: "peinture", label: "Peinture" },
            { value: "menage", label: "Ménage" },
            { value: "jardinage", label: "Jardinage" },
            { value: "autre", label: "Autre" }
          ],
          defaultValue: "all"
        }
      ]}
      onSearch={(value) => setSearchTerm(value)}
      onFilterChange={(filterId, value) => {
        setFilters(prev => {
          const newFilters = {
            ...prev,
            [filterId]: value
          }

          if (filterId === 'role' && value !== 'prestataire') {
            newFilters.category = 'all'
            newFilters.speciality = 'all'
          }

          if (filterId === 'category' && value !== 'prestataire') {
            newFilters.speciality = 'all'
          }

          return newFilters
        })
      }}
      onResetFilters={() => {
        setFilters({
          role: "all",
          category: "all",
          speciality: "all"
        })
      }}
      filterValues={filters}
      className={contentNavigatorClasses}
    />
  )
}

