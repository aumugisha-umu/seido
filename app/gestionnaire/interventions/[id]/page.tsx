"use client"

import { use } from "react"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  FileText,
  Users,
  MapPin,
  MessageSquare,
  Phone,
  Mail,
  Eye,
  Download,
  Edit,
  User,
  CalendarDays,
  UserPlus,
  UserMinus,
  ChevronDown,
  ChevronRight,
  Receipt,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { interventionService, contactService } from "@/lib/database-service"
import { useAuth } from "@/hooks/use-auth"

// Fonctions utilitaires pour gérer les interventions lot vs bâtiment
const getInterventionLocationText = (intervention: InterventionDetail): string => {
  if (intervention.lot) {
    return `Lot ${intervention.lot.reference} - ${intervention.lot.building.name}`
  } else if (intervention.building) {
    return `Bâtiment entier - ${intervention.building.name}`
  }
  return "Localisation non spécifiée"
}

const getInterventionLocationShort = (intervention: InterventionDetail): string => {
  if (intervention.lot) {
    return `Lot ${intervention.lot.reference}`
  } else if (intervention.building) {
    return "Bâtiment entier"
  }
  return "Non spécifié"
}

const isBuildingWideIntervention = (intervention: InterventionDetail): boolean => {
  return !!(intervention.building && !intervention.lot)
}

// Types basés sur la structure de la base de données
interface DatabaseContact {
  id: string
  name: string
  email: string
  phone: string | null
  contact_type: string
  company?: string | null
  speciality?: string | null
  inChat?: boolean // Ajouté pour la fonctionnalité chat
}

interface InterventionDetail {
  id: string
  title: string
  description: string
  type: string
  urgency: string
  status: string
  createdAt: string
  createdBy: string
  reference: string
  requestedDate?: string
  scheduledDate?: string
  estimatedCost?: number
  finalCost?: number
  // Support des interventions lot ET bâtiment
  lot?: {
    id: string
    reference: string
    building: {
      id: string
      name: string
      address: string
      city: string
      postal_code: string
    }
    floor?: number
    apartment_number?: string
  }
  building?: {
    id: string
    name: string
    address: string
    city: string
    postal_code: string
  }
  tenant?: {
    id: string
    name: string
    email: string
    phone?: string
  }
  manager?: {
    id: string
    name: string
    email: string
    phone?: string
  }
  assignedContact?: {
    id: string
    name: string
    email: string
    phone?: string
    speciality?: string
  }
  contacts: {
    locataires: DatabaseContact[]
    proprietaires: DatabaseContact[]
    syndics: DatabaseContact[]
    autres: DatabaseContact[]
  }
  // Données statiques pour maintenir la compatibilité avec l'UI existante
  scheduling: {
    type: "fixed" | "slots" | "tbd"
    fixedDate?: string
    fixedTime?: string
    slots?: Array<{
      date: string
      startTime: string
      endTime: string
    }>
  }
  instructions: {
    type: "group" | "individual"
    groupMessage?: string
    individualMessages?: Array<{
      contactId: string
      message: string
    }>
  }
  attachments: Array<{
    name: string
    size: string
    type: string
  }>
  availabilities: Array<{
    person: string
    role: string
    date: string
    startTime: string
    endTime: string
  }>
}

export default function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const { user } = useAuth()
  const [intervention, setIntervention] = useState<InterventionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [expandedCategories, setExpandedCategories] = useState({
    locataires: true, // Locataires visible par défaut
    proprietaires: false, // Autres catégories cachées par défaut
    syndics: false,
    autres: false,
  })

  // Fonction pour récupérer les données réelles depuis la DB
  const fetchInterventionData = async () => {
    if (!resolvedParams.id) return

    setLoading(true)
    setError(null)

    try {
      console.log('🔍 Fetching intervention details for ID:', resolvedParams.id)
      
      // 1. Récupérer l'intervention avec les données relationnelles
      const interventionData = await interventionService.getById(resolvedParams.id)
      
      if (!interventionData) {
        throw new Error('Intervention non trouvée')
      }

      console.log('✅ Intervention data loaded:', interventionData)

      // 2. Récupérer tous les contacts selon le type d'intervention (lot ou bâtiment)
      let contacts = []
      if (interventionData.lot_id) {
        // Intervention sur lot spécifique
        contacts = await contactService.getLotContacts(interventionData.lot_id)
        console.log('✅ Lot contacts loaded:', contacts.length)
      } else if (interventionData.building_id) {
        // Intervention sur bâtiment entier - récupérer tous les contacts du bâtiment
        contacts = await contactService.getBuildingContacts(interventionData.building_id)
        console.log('✅ Building contacts loaded:', contacts.length)
      }
      
      console.log('✅ Contacts loaded:', contacts.length)

      // 3. Organiser les contacts par type
      const organizedContacts = {
        locataires: contacts.filter((contact: any) => 
          contact.contact_type === 'locataire' || contact.lot_contact_type === 'locataire'
        ).map((contact: any) => ({
          ...contact,
          inChat: false // Par défaut, pas dans le chat (sera géré plus tard)
        })),
        proprietaires: contacts.filter((contact: any) => 
          contact.contact_type === 'proprietaire' || contact.lot_contact_type === 'proprietaire'
        ).map((contact: any) => ({
          ...contact,
          inChat: false
        })),
        syndics: contacts.filter((contact: any) => 
          contact.contact_type === 'syndic' || contact.lot_contact_type === 'syndic'
        ).map((contact: any) => ({
          ...contact,
          inChat: false
        })),
        autres: contacts.filter((contact: any) => 
          !['locataire', 'proprietaire', 'syndic'].includes(contact.contact_type || contact.lot_contact_type)
        ).map((contact: any) => ({
          ...contact,
          inChat: false
        }))
      }

      // 4. Transformer les données au format attendu par l'interface
      const transformedIntervention: InterventionDetail = {
        id: interventionData.id,
        title: interventionData.title,
        description: interventionData.description,
        type: interventionData.type,
        urgency: interventionData.urgency,
        status: interventionData.status,
        createdAt: interventionData.created_at,
        createdBy: interventionData.manager?.name || 'Gestionnaire',
        reference: interventionData.reference,
        requestedDate: interventionData.requested_date,
        scheduledDate: interventionData.scheduled_date,
        estimatedCost: interventionData.estimated_cost,
        finalCost: interventionData.final_cost,
        // Support des interventions lot ET bâtiment
        lot: interventionData.lot ? {
          id: interventionData.lot.id,
          reference: interventionData.lot.reference,
          building: {
            id: interventionData.lot.building.id,
            name: interventionData.lot.building.name,
            address: interventionData.lot.building.address,
            city: interventionData.lot.building.city,
            postal_code: interventionData.lot.building.postal_code
          },
          floor: interventionData.lot.floor,
          apartment_number: interventionData.lot.apartment_number
        } : undefined,
        building: interventionData.building ? {
          id: interventionData.building.id,
          name: interventionData.building.name,
          address: interventionData.building.address,
          city: interventionData.building.city,
          postal_code: interventionData.building.postal_code
        } : undefined,
        tenant: interventionData.tenant ? {
          id: interventionData.tenant_id,
          name: interventionData.tenant.name,
          email: interventionData.tenant.email,
          phone: interventionData.tenant.phone
        } : undefined,
        manager: interventionData.manager ? {
          id: interventionData.manager_id,
          name: interventionData.manager.name,
          email: interventionData.manager.email,
          phone: interventionData.manager.phone
        } : undefined,
        assignedContact: interventionData.assigned_contact ? {
          id: interventionData.assigned_contact_id,
          name: interventionData.assigned_contact.name,
          email: interventionData.assigned_contact.email,
          phone: interventionData.assigned_contact.phone,
          speciality: interventionData.assigned_contact.speciality
        } : undefined,
        contacts: organizedContacts,
        // Données statiques pour maintenir la compatibilité (à enrichir plus tard)
        scheduling: {
          type: interventionData.scheduled_date ? "fixed" : "tbd",
          fixedDate: interventionData.scheduled_date ? new Date(interventionData.scheduled_date).toISOString().split('T')[0] : undefined,
          fixedTime: interventionData.scheduled_date ? new Date(interventionData.scheduled_date).toTimeString().slice(0, 5) : undefined
        },
        instructions: {
          type: "individual",
          individualMessages: [] // À implémenter selon les besoins
        },
        attachments: [], // À implémenter selon les besoins
        availabilities: [] // À implémenter selon les besoins
      }

      console.log('✅ Transformed intervention data:', transformedIntervention)
      setIntervention(transformedIntervention)

    } catch (error) {
      console.error('❌ Error fetching intervention data:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement de l\'intervention')
    } finally {
      setLoading(false)
    }
  }

  // Charger les données réelles au montage du composant
  useEffect(() => {
    fetchInterventionData()
  }, [resolvedParams.id])

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des détails de l'intervention...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchInterventionData()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (!intervention) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Intervention non trouvée</h2>
          <p className="text-gray-600 mb-4">L'intervention demandée n'existe pas ou n'est plus accessible.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "normale":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "faible":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "en attente":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "en cours":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "terminé":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const findCommonSlots = () => {
    if (intervention.scheduling.type !== "slots" || !intervention.availabilities.length) {
      return []
    }

    const commonSlots = []
    for (const slot of intervention.scheduling.slots || []) {
      const availablePeople = []

      for (const availability of intervention.availabilities) {
        if (slot.date === availability.date) {
          const slotStart = new Date(`${slot.date}T${slot.startTime}:00`)
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`)
          const availStart = new Date(`${availability.date}T${availability.startTime}:00`)
          const availEnd = new Date(`${availability.date}T${availability.endTime}:00`)

          if (availStart <= slotStart && availEnd >= slotEnd) {
            availablePeople.push({
              name: availability.person,
              role: availability.role,
            })
          }
        }
      }

      if (availablePeople.length > 1) {
        commonSlots.push({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          availablePeople,
        })
      }
    }
    return commonSlots
  }

  const commonSlots = findCommonSlots()

  const toggleContactInChat = (category: keyof typeof intervention.contacts, contactId: string) => {
    if (!intervention) return

    setIntervention((prev) => {
      if (!prev) return prev

      const updatedContacts = { ...prev.contacts }
      updatedContacts[category] = updatedContacts[category].map((contact) =>
        contact.id === contactId ? { ...contact, inChat: !contact.inChat } : contact,
      )

      return {
        ...prev,
        contacts: updatedContacts,
      }
    })
  }

  const toggleCategory = (category: keyof typeof expandedCategories) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{intervention.title}</h1>
              <Badge className={getUrgencyColor(intervention.urgency)}>{intervention.urgency}</Badge>
              <Badge className={getStatusColor(intervention.status)}>{intervention.status}</Badge>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1 text-gray-500">
                <User className="h-3 w-3" />
                <span>{intervention.createdBy}</span>
              </div>
              <div className="flex items-center space-x-1 text-gray-500">
                <CalendarDays className="h-3 w-3" />
                <span>
                  {new Date(intervention.createdAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>

          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Ouvrir le chat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Détails de l'intervention */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Détails de l'intervention</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{intervention.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Type</h4>
                  <p className="text-gray-700">{intervention.type}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Priorité</h4>
                  <Badge className={getUrgencyColor(intervention.urgency)}>{intervention.urgency}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logement concerné */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <span>Localisation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {isBuildingWideIntervention(intervention) ? (
                      <Building2 className="h-4 w-4 text-blue-600" />
                    ) : (
                      <MapPin className="h-4 w-4 text-blue-600" />
                    )}
                    <h4 className="font-medium text-gray-900">
                      {getInterventionLocationShort(intervention)}
                    </h4>
                    {isBuildingWideIntervention(intervention) && (
                      <Badge variant="secondary" className="text-xs">
                        Bâtiment entier
                      </Badge>
                    )}
                  </div>
                  
                  {intervention.lot ? (
                    <>
                      <p className="text-gray-600">
                        {intervention.lot.building.address}, {intervention.lot.building.city} {intervention.lot.building.postal_code}
                      </p>
                      <p className="text-sm text-gray-500">{intervention.lot.building.name}</p>
                      {intervention.lot.floor && (
                        <p className="text-sm text-gray-500">Étage {intervention.lot.floor}</p>
                      )}
                      {intervention.lot.apartment_number && (
                        <p className="text-sm text-gray-500">Appartement {intervention.lot.apartment_number}</p>
                      )}
                    </>
                  ) : intervention.building ? (
                    <>
                      <p className="text-gray-600">
                        {intervention.building.address}, {intervention.building.city} {intervention.building.postal_code}
                      </p>
                      <p className="text-sm text-gray-500">{intervention.building.name}</p>
                      <p className="text-sm text-yellow-600 font-medium">
                        Intervention sur l'ensemble du bâtiment
                      </p>
                    </>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (intervention.lot) {
                      router.push(`/gestionnaire/biens/lots/${intervention.lot.id}`)
                    } else if (intervention.building) {
                      router.push(`/gestionnaire/biens/immeubles/${intervention.building.id}`)
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {isBuildingWideIntervention(intervention) ? "Voir le bâtiment" : "Voir le lot"}
                </Button>
              </div>

              {intervention.contacts.locataires.length > 0 && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => toggleCategory("locataires")}
                    className="w-full flex items-center justify-between mb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span>Locataires ({intervention.contacts.locataires.length})</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        Participants par défaut
                      </Badge>
                    </h5>
                    {expandedCategories.locataires ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  {expandedCategories.locataires && (
                    <div className="space-y-2">
                      {intervention.contacts.locataires.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          {/* ... existing contact content ... */}
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h6 className="font-medium text-gray-900">{contact.name}</h6>
                              <div className="flex items-center space-x-3 text-xs text-gray-600">
                                <span className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{contact.email}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{contact.phone}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {contact.inChat && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                Dans la conversation de groupe
                              </Badge>
                            )}
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                title="Chat individuel"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleContactInChat("locataires", contact.id)}
                                className={
                                  contact.inChat
                                    ? "text-red-600 hover:text-red-700"
                                    : "text-green-600 hover:text-green-700"
                                }
                              >
                                {contact.inChat ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {intervention.contacts.proprietaires.length > 0 && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => toggleCategory("proprietaires")}
                    className="w-full flex items-center justify-between mb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                      <User className="h-4 w-4 text-purple-600" />
                      <span>Propriétaires ({intervention.contacts.proprietaires.length})</span>
                    </h5>
                    {expandedCategories.proprietaires ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  {expandedCategories.proprietaires && (
                    <div className="space-y-2">
                      {intervention.contacts.proprietaires.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          {/* ... existing contact content ... */}
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <h6 className="font-medium text-gray-900">{contact.name}</h6>
                              <div className="flex items-center space-x-3 text-xs text-gray-600">
                                <span className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{contact.email}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{contact.phone}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {contact.inChat && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                Dans la conversation de groupe
                              </Badge>
                            )}
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                title="Chat individuel"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleContactInChat("proprietaires", contact.id)}
                                className={
                                  contact.inChat
                                    ? "text-red-600 hover:text-red-700"
                                    : "text-green-600 hover:text-green-700"
                                }
                              >
                                {contact.inChat ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {intervention.contacts.syndics.length > 0 && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => toggleCategory("syndics")}
                    className="w-full flex items-center justify-between mb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      <span>Syndics ({intervention.contacts.syndics.length})</span>
                    </h5>
                    {expandedCategories.syndics ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  {expandedCategories.syndics && (
                    <div className="space-y-2">
                      {intervention.contacts.syndics.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          {/* ... existing contact content ... */}
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h6 className="font-medium text-gray-900">{contact.name}</h6>
                                {contact.company && (
                                  <Badge
                                    variant="outline"
                                    className="bg-orange-50 text-orange-700 border-orange-200 text-xs"
                                  >
                                    {contact.company}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-gray-600">
                                <span className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{contact.email}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{contact.phone}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {contact.inChat && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                Dans la conversation de groupe
                              </Badge>
                            )}
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                title="Chat individuel"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleContactInChat("syndics", contact.id)}
                                className={
                                  contact.inChat
                                    ? "text-red-600 hover:text-red-700"
                                    : "text-green-600 hover:text-green-700"
                                }
                              >
                                {contact.inChat ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {intervention.contacts.autres.length > 0 && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => toggleCategory("autres")}
                    className="w-full flex items-center justify-between mb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span>Autres contacts ({intervention.contacts.autres.length})</span>
                    </h5>
                    {expandedCategories.autres ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  {expandedCategories.autres && (
                    <div className="space-y-2">
                      {intervention.contacts.autres.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          {/* ... existing contact content ... */}
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h6 className="font-medium text-gray-900">{contact.name}</h6>
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
                                  {contact.contact_type}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-gray-600">
                                <span className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{contact.email}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{contact.phone}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {contact.inChat && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                Dans la conversation de groupe
                              </Badge>
                            )}
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                title="Chat individuel"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleContactInChat("autres", contact.id)}
                                className={
                                  contact.inChat
                                    ? "text-red-600 hover:text-red-700"
                                    : "text-green-600 hover:text-green-700"
                                }
                              >
                                {contact.inChat ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personnes assignées */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span>Personnes assignées</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Gestionnaire assigné */}
                {intervention.manager && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{intervention.manager.name}</h4>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Gestionnaire
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{intervention.manager.email}</span>
                          </span>
                          {intervention.manager.phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{intervention.manager.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prestataire assigné */}
                {intervention.assignedContact && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{intervention.assignedContact.name}</h4>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Prestataire
                          </Badge>
                          {intervention.assignedContact.speciality && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600">
                              {intervention.assignedContact.speciality}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{intervention.assignedContact.email}</span>
                          </span>
                          {intervention.assignedContact.phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{intervention.assignedContact.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!intervention.manager && !intervention.assignedContact && (
                  <div className="text-center py-4 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Aucune personne assignée pour le moment</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                <span>Instructions communiquées</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {intervention.instructions.type === "group" ? (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Message au groupe</h4>
                  <p className="text-blue-800">{intervention.instructions.groupMessage}</p>
                  <p className="text-xs text-blue-600 mt-2">Ces instructions ne sont pas vues par le locataire</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Messages individuels</h4>
                  {intervention.instructions.individualMessages?.map((msg, index) => {
                    // Rechercher le contact dans les assignés (manager ou prestataire)
                    let contact = null
                    if (intervention.manager && intervention.manager.id === msg.contactId) {
                      contact = intervention.manager
                    } else if (intervention.assignedContact && intervention.assignedContact.id === msg.contactId) {
                      contact = intervention.assignedContact
                    }
                    
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-1">Pour {contact?.name || 'Contact non trouvé'}</h5>
                        <p className="text-gray-700">{msg.message}</p>
                      </div>
                    )
                  })}
                  <p className="text-xs text-gray-500">Seule la personne concernée peut voir ses instructions</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-green-600" />
                <span>Devis (2)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Devis 1 */}
                <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Thomas Blanc</h4>
                        <p className="text-sm text-gray-600">Prestataire • Plomberie</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Accepté
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Il y a 2h</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Montant</p>
                      <p className="font-semibold text-lg text-green-700">285,00 €</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Délai d'intervention</p>
                      <p className="font-medium">24-48h</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    Réparation fuite robinet + remplacement joint défectueux. Matériel inclus.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Voir détails
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Télécharger
                    </Button>
                  </div>
                </div>

                {/* Devis 2 */}
                <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Plomberie Express</h4>
                        <p className="text-sm text-gray-600">Prestataire • Plomberie</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        En attente
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Il y a 4h</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Montant</p>
                      <p className="font-semibold text-lg text-gray-900">320,00 €</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Délai d'intervention</p>
                      <p className="font-medium">48-72h</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    Diagnostic complet + réparation fuite + garantie 2 ans. Déplacement inclus.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Voir détails
                    </Button>
                    <Button size="sm" variant="default">
                      <Check className="h-4 w-4 mr-1" />
                      Accepter
                    </Button>
                    <Button size="sm" variant="outline">
                      <X className="h-4 w-4 mr-1" />
                      Refuser
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Planification & Disponibilités</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {intervention.scheduling.type === "fixed" && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Date et heure fixe</h4>
                  <div className="flex items-center space-x-2 text-blue-800">
                    <Calendar className="h-4 w-4" />
                    <span>{intervention.scheduling.fixedDate}</span>
                    <Clock className="h-4 w-4 ml-2" />
                    <span>{intervention.scheduling.fixedTime}</span>
                  </div>
                </div>
              )}

              {intervention.scheduling.type === "slots" && (
                <div className="space-y-4">
                  {/* Common slots highlighted */}
                  {commonSlots.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2 flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>Créneaux en commun</span>
                      </h4>
                      <div className="space-y-2">
                        {commonSlots.map((slot, index) => (
                          <div key={index} className="space-y-1">
                            <div className="text-sm text-green-800 font-medium">
                              {new Date(slot.date).toLocaleDateString("fr-FR")} de {slot.startTime} à {slot.endTime}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {slot.availablePeople.map((person, personIndex) => (
                                <span
                                  key={personIndex}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                                >
                                  {person.name} ({person.role})
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Proposed slots */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Créneaux proposés</h4>
                    <div className="space-y-1">
                      {intervention.scheduling.slots?.map((slot, index) => (
                        <div key={index} className="p-2 bg-blue-50 rounded text-sm flex items-center space-x-2">
                          <Calendar className="h-3 w-3 text-blue-600" />
                          <span className="text-blue-800">
                            {new Date(slot.date).toLocaleDateString("fr-FR")} de {slot.startTime} à {slot.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {intervention.availabilities.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Disponibilités par personne</h4>
                      <div className="space-y-3">
                        {Object.entries(
                          intervention.availabilities.reduce((acc, availability) => {
                            const key = `${availability.person}-${availability.role}`
                            if (!acc[key]) {
                              acc[key] = {
                                person: availability.person,
                                role: availability.role,
                                slots: [],
                              }
                            }
                            acc[key].slots.push(availability)
                            return acc
                          }, {}),
                        ).map(([key, data]) => (
                          <div key={key} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <User className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-900">{data.person}</span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                {data.role}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {data.slots.map((availability, index) => (
                                <div key={index} className="p-2 bg-gray-50 rounded text-sm flex items-center space-x-2">
                                  <Clock className="h-3 w-3 text-gray-600" />
                                  <span className="text-gray-700">
                                    {new Date(availability.date).toLocaleDateString("fr-FR")} de{" "}
                                    {availability.startTime} à {availability.endTime}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {intervention.scheduling.type === "tbd" && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900">Horaire à définir</h4>
                  <p className="text-sm text-yellow-800 mt-1">La planification sera définie ultérieurement</p>
                  {intervention.availabilities.length > 0 && (
                    <div className="mt-3">
                      <h5 className="font-medium text-gray-900 mb-2">Disponibilités par personne</h5>
                      <div className="space-y-3">
                        {Object.entries(
                          intervention.availabilities.reduce((acc, availability) => {
                            const key = `${availability.person}-${availability.role}`
                            if (!acc[key]) {
                              acc[key] = {
                                person: availability.person,
                                role: availability.role,
                                slots: [],
                              }
                            }
                            acc[key].slots.push(availability)
                            return acc
                          }, {}),
                        ).map(([key, data]) => (
                          <div key={key} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <User className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-900">{data.person}</span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                {data.role}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {data.slots.map((availability, index) => (
                                <div key={index} className="p-2 bg-gray-50 rounded text-sm flex items-center space-x-2">
                                  <Clock className="h-3 w-3 text-gray-600" />
                                  <span className="text-gray-700">
                                    {new Date(availability.date).toLocaleDateString("fr-FR")} de{" "}
                                    {availability.startTime} à {availability.endTime}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <span>Chats en cours</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Conversation de groupe */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-green-900 flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Conversation de groupe</span>
                  </h4>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                    3 participants
                  </Badge>
                </div>
                <p className="text-sm text-green-800 mb-2">
                  Dernier message: "J'arrive dans 10 minutes" - Thomas Blanc
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-600">Il y a 5 minutes</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-700 border-green-300 hover:bg-green-100 bg-transparent"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Ouvrir
                  </Button>
                </div>
              </div>

              {/* Conversations individuelles */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 text-sm">Conversations individuelles</h4>

                {/* Chat avec Jean Martin */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="font-medium text-blue-900 text-sm">Jean Martin</span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                        Locataire
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-blue-800 mb-2">"Merci pour l'intervention rapide !"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-600">Il y a 2 heures</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-700 border-blue-300 hover:bg-blue-100 bg-transparent"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Répondre
                    </Button>
                  </div>
                </div>

                {/* Chat avec Thomas Blanc */}
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-purple-600" />
                      </div>
                      <span className="font-medium text-purple-900 text-sm">Thomas Blanc</span>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                        Prestataire
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-purple-800 mb-2">"Intervention terminée, tout est réparé"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-600">Il y a 1 heure</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-purple-700 border-purple-300 hover:bg-purple-100 bg-transparent"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Répondre
                    </Button>
                  </div>
                </div>

                {/* Chat avec Marie Dubois */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-gray-600" />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">Marie Dubois</span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                        Gestionnaire
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 mb-2">"Notes internes: Vérifier la facture"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Il y a 30 minutes</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Répondre
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fichiers joints */}
          {intervention.attachments.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span>Fichiers joints ({intervention.attachments.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {intervention.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">{file.size}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

