"use client"

import React, { useState, useEffect, use, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  Eye,
  User,
  Wrench,
  Plus,
  AlertCircle,
  Home
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"




import {
  determineAssignmentType,
  createServerContactService,
  createServerBuildingService,
  createServerLotService,
  createServerInterventionService,
  type Contact as ContactType,
  type Intervention as InterventionType,
  type Lot as LotType,
  type Building as BuildingType
} from '@/lib/services'
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { PropertiesNavigator } from "@/components/properties/properties-navigator"
import { ContactDetailHeader } from "@/components/contact-detail-header"

interface ContactData {
  id: string
  name: string
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  role: string
  provider_category?: string
  speciality?: string
  notes?: string
  team_id?: string
  created_at?: string
  created_by?: string
}

// Rôles et catégories pour l'affichage
const userRoles = [
  { value: "locataire", label: "Locataire", color: "bg-blue-100 text-blue-800" },
  { value: "gestionnaire", label: "Gestionnaire", color: "bg-purple-100 text-purple-800" },
  { value: "prestataire", label: "Prestataire", color: "bg-green-100 text-green-800" }
]

const providerCategories = [
  { value: "prestataire", label: "Service général" },
  { value: "syndic", label: "Syndic" },
  { value: "notaire", label: "Notaire" },
  { value: "assurance", label: "Assurance" },
  { value: "proprietaire", label: "Propriétaire" },
  { value: "autre", label: "Autre" }
]

const specialities = [
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "chauffage", label: "Chauffage" },
  { value: "serrurerie", label: "Serrurerie" },
  { value: "peinture", label: "Peinture" },
  { value: "menage", label: "Ménage" },
  { value: "jardinage", label: "Jardinage" },
  { value: "autre", label: "Autre" }
]

export default function ContactDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()
  const resolvedParams = use(params)
  const { user } = useAuth()

  // State pour les données
  const [contact, setContact] = useState<ContactData | null>(null)
  const [interventions, setInterventions] = useState<InterventionType[]>([])
  const [properties, setProperties] = useState<Array<(LotType & { type: 'lot' }) | (BuildingType & { type: 'building' })>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // States pour la gestion des invitations (récupérés de la page modifier)
  const [invitationStatus, setInvitationStatus] = useState<string | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(false)

  // Fonctions de gestion des actions du header
  const handleBack = () => {
    router.push("/gestionnaire/contacts")
  }

  const handleEdit = () => {
    router.push(`/gestionnaire/contacts/modifier/${resolvedParams.id}`)
  }

  const handleArchive = () => {
    console.log("Archive contact:", contact?.id)
    // TODO: Implémenter la logique d'archivage
  }

  const handleInvitationAction = async (action: string) => {
    if (!contact?.id) return
    
    console.log("Invitation action:", action, "for contact:", contact.id)
    
    switch (action) {
      case "open-chat":
        console.log("Opening chat with contact:", contact.id)
        // TODO: Implémenter l'ouverture du chat
        break
      case "send-invitation":
        await handleSendInvitation()
        break
      case "resend-invitation":
        await handleResendInvitation()
        break
      case "revoke-invitation":
        await handleRevokeInvitation()
        break
      default:
        console.log("Unknown invitation action:", action)
    }
  }

  const handleSendInvitation = async () => {
    if (!contact?.email || !user?.team_id) return

    try {
      setInvitationLoading(true)
      console.log("🔄 Sending invitation to:", contact.email)

      const response = await fetch("/api/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: contact.email,
          role: contact.role,
          teamId: user.team_id,
        }),
      })

      if (response.ok) {
        console.log("✅ Invitation sent successfully")
        await loadInvitationStatus() // Recharger le statut
      } else {
        console.error("❌ Failed to send invitation")
      }
    } catch (error) {
      console.error("❌ Error sending invitation:", error)
    } finally {
      setInvitationLoading(false)
    }
  }

  const handleResendInvitation = async () => {
    if (!contact?.email) return

    try {
      setInvitationLoading(true)
      console.log("🔄 Resending invitation to:", contact.email)

      const response = await fetch("/api/resend-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: contact.email }),
      })

      if (response.ok) {
        console.log("✅ Invitation resent successfully")
        await loadInvitationStatus() // Recharger le statut
      } else {
        console.error("❌ Failed to resend invitation")
      }
    } catch (error) {
      console.error("❌ Error resending invitation:", error)
    } finally {
      setInvitationLoading(false)
    }
  }

  const handleRevokeInvitation = async () => {
    if (!contact?.email) return

    try {
      setInvitationLoading(true)
      console.log("🔄 Revoking invitation for:", contact.email)

      const response = await fetch("/api/revoke-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: contact.email }),
      })

      if (response.ok) {
        console.log("✅ Invitation revoked successfully")
        await loadInvitationStatus() // Recharger le statut
      } else {
        console.error("❌ Failed to revoke invitation")
      }
    } catch (error) {
      console.error("❌ Error revoking invitation:", error)
    } finally {
      setInvitationLoading(false)
    }
  }

  // Initialize services
  const [contactService] = useState(() => createServerContactService())
  const [buildingService] = useState(() => createServerBuildingService())
  const [lotService] = useState(() => createServerLotService())
  const [interventionService] = useState(() => createServerInterventionService())

  // Define helper functions first
  const loadInvitationStatus = useCallback(async () => {
    try {
      setInvitationLoading(true)
      console.log("🔍 Loading invitation status for contact:", resolvedParams.id)

      const response = await fetch(`/api/contact-invitation-status?contactId=${resolvedParams.id}`)

      if (response.ok) {
        const { status } = await response.json()
        setInvitationStatus(status)
        console.log("✅ Invitation status loaded:", status)
      } else {
        console.log("ℹ️ No invitation found for this contact")
        setInvitationStatus(null)
      }

    } catch (error) {
      console.error("❌ Error loading invitation status:", error)
      setInvitationStatus(null)
    } finally {
      setInvitationLoading(false)
    }
  }, [resolvedParams.id])

  // Fonction pour récupérer les interventions d&apos;un contact
  const getContactInterventions = useCallback(async (contactId: string, contactData?: ContactType | ContactData) => {
    try {
      const contactToUse = contactData || contact
      console.log("🔧 Getting interventions for contact role:", contactToUse?.role)

      // Pour un prestataire : interventions assignées
      if (contactToUse?.role === 'prestataire') {
        console.log("🔧 Fetching interventions assigned to provider:", contactId)
        // Chercher les interventions où assigned_contact_id correspond à ce contact
        const allInterventions = await interventionService.getAll()
        const assignedInterventions = allInterventions?.filter(intervention => 
          intervention.assigned_contact_id === contactId &&
          intervention.lot?.building?.team_id === (contactToUse.team_id || user?.team_id)
        ) || []
        console.log("🔧 Found assigned interventions:", assignedInterventions.length)
        return assignedInterventions
      }
      // Pour un locataire : interventions des lots où il habite
      else if (contactToUse?.role === 'locataire') {
        console.log("🔧 Fetching interventions for tenant:", contactId)
        
        // D'abord trouver les lots du locataire via lot_contacts
        const allLots = await lotService.getAll()
        const tenantLots = allLots?.filter(lot => {
          if (!lot.lot_contacts) return false
          return lot.lot_contacts.some(contact => 
            contact.user.id === contactId && 
            (contact.user.role === 'locataire' || determineAssignmentType(contact.user) === 'tenant')
          )
        }) || []
        
        console.log("🔧 Found tenant lots for interventions:", tenantLots.length)
        const tenantLotIds = tenantLots.map(lot => lot.id)
        
        // Puis récupérer les interventions de ces lots
        const allInterventions = await interventionService.getAll()
        const lotInterventions = allInterventions?.filter(intervention => 
          tenantLotIds.includes(intervention.lot_id)
        ) || []
        
        console.log("🔧 Found tenant interventions:", lotInterventions.length)
        return lotInterventions
      }
      // Pour un gestionnaire : toutes les interventions de son équipe
      else if (contactToUse?.role === 'gestionnaire') {
        console.log("🔧 Fetching all team interventions for manager:", contactToUse.team_id || user?.team_id)
        const allInterventions = await interventionService.getAll()
        const teamInterventions = allInterventions?.filter(intervention => 
          intervention.lot?.building?.team_id === (contactToUse.team_id || user?.team_id)
        ) || []
        console.log("🔧 Found team interventions:", teamInterventions.length)
        return teamInterventions
      }
      
      console.log("🔧 No interventions found for contact role:", contactToUse?.role)
      return []
    } catch (error) {
      console.error("❌ Error loading contact interventions:", error)
      return []
    }
  }, [contact, user?.team_id, interventionService, lotService])

  // Fonction pour récupérer les biens liés à un contact
  const getContactProperties = useCallback(async (contactId: string, contactData?: ContactType | ContactData) => {
    try {
      const contactToUse = contactData || contact
      const properties = []
      console.log("🏠 Getting properties for contact role:", contactToUse?.role)
      
      // Pour un locataire : lots où il habite (via lot_contacts)
      if (contactToUse?.role === 'locataire') {
        console.log("🏠 Fetching lots for tenant:", contactId)
        const allLots = await lotService.getAll()
        console.log("🏠 Total lots retrieved:", allLots?.length || 0)
        
        // Filtrer les lots où ce contact est présent dans lot_contacts comme locataire
        const tenantLots = allLots?.filter(lot => {
          if (!lot.lot_contacts) return false
          
          // Vérifier si ce contact est dans lot_contacts avec le rôle de locataire
          return lot.lot_contacts.some(contact => 
            contact.user.id === contactId && 
            (contact.user.role === 'locataire' || determineAssignmentType(contact.user) === 'tenant')
          )
        }) || []
        
        console.log("🏠 Found tenant lots:", tenantLots.length)
        console.log("🏠 Tenant lots details:", tenantLots.map(lot => ({
          id: lot.id, 
          reference: lot.reference,
          contacts: lot.lot_contacts?.length || 0
        })))
        
        for (const lot of tenantLots) {
          properties.push({
            ...lot,
            type: 'lot'
          })
        }
      }
      
      // Pour un prestataire : biens où il intervient
      else if (contactToUse?.role === 'prestataire') {
        console.log("🏠 Fetching properties where provider works:", contactId)
        // Récupérer les interventions du prestataire pour connaître les biens
        const allInterventions = await interventionService.getAll()
        const providerInterventions = allInterventions?.filter(intervention => 
          intervention.assigned_contact_id === contactId &&
          intervention.lot?.building?.team_id === (contactToUse.team_id || user?.team_id)
        ) || []
        
        // Récupérer les lots uniques de ces interventions
        const uniqueLotIds = [...new Set(providerInterventions.map(i => i.lot_id).filter(Boolean))]
        console.log("🏠 Found unique lot IDs:", uniqueLotIds.length)
        
        const allLots = await lotService.getAll()
        const relatedLots = allLots?.filter(lot => 
          uniqueLotIds.includes(lot.id) &&
          lot.building?.team_id === (contactToUse.team_id || user?.team_id)
        ) || []
        
        for (const lot of relatedLots) {
          properties.push({
            ...lot,
            type: 'lot'
          })
        }
      }
      
      // Pour un gestionnaire : tous les biens de son équipe
      else if (contactToUse?.role === 'gestionnaire') {
        console.log("🏠 Fetching all team properties for manager:", contactToUse.team_id || user?.team_id)
        
        // Récupérer tous les immeubles de l'équipe
        const buildings = await buildingService.getAll()
        const teamBuildings = buildings?.filter(building => 
          building.team_id === (contactToUse.team_id || user?.team_id)
        ) || []
        console.log("🏠 Found team buildings:", teamBuildings.length)
        
        for (const building of teamBuildings) {
          properties.push({
            ...building,
            type: 'building'
          })
        }
        
        // Récupérer tous les lots de l'équipe
        const lots = await lotService.getAll()
        const teamLots = lots?.filter(lot => 
          lot.building?.team_id === (contactToUse.team_id || user?.team_id)
        ) || []
        console.log("🏠 Found team lots:", teamLots.length)
        
        for (const lot of teamLots) {
          properties.push({
            ...lot,
            type: 'lot'
          })
        }
      }
      
      console.log("🏠 Total properties found:", properties.length)
      return properties
    } catch (error) {
      console.error("❌ Error loading contact properties:", error)
      return []
    }
  }, [contact, user?.team_id, interventionService, lotService, buildingService])

  // Load contact data function
  const loadContactData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("👤 Loading contact data for ID:", resolvedParams.id)

      // 1. Charger les données du contact
      const contactData = await contactService.getById(resolvedParams.id)
      console.log("👤 Contact loaded:", contactData)
      setContact(contactData as ContactData)

      // 2. Charger le statut d&apos;invitation
      await loadInvitationStatus()

      // 3. Charger les interventions liées au contact (passer les données du contact)
      const interventionsData = await getContactInterventions(resolvedParams.id, contactData)
      console.log("🔧 Interventions loaded:", interventionsData?.length || 0)
      setInterventions(interventionsData || [])

      // 4. Charger les biens liés au contact (passer les données du contact)
      const propertiesData = await getContactProperties(resolvedParams.id, contactData)
      console.log("🏠 Properties loaded:", propertiesData?.length || 0)
      setProperties(propertiesData || [])

    } catch (error) {
      console.error("❌ Error loading contact data:", error)
      setError("Erreur lors du chargement des données du contact")
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id, contactService, loadInvitationStatus, getContactInterventions, getContactProperties])

  // Charger les données du contact
  useEffect(() => {
    if (resolvedParams.id && user?.id) {
      loadContactData()
    }
  }, [resolvedParams.id, user?.id, loadContactData])

  // Fonction pour obtenir le badge du statut d&apos;invitation
  const getInvitationStatusBadge = () => {
    if (invitationLoading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-slate-500">Vérification...</span>
        </div>
      )
    }

    if (!invitationStatus) {
      return (
        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
          Pas de compte
        </Badge>
      )
    }

    const statusConfig = {
      pending: { label: 'Invitation envoyée', class: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Actif', class: 'bg-green-100 text-green-800' },
      expired: { label: 'Invitation expirée', class: 'bg-amber-100 text-amber-800' },
      cancelled: { label: 'Invitation annulée', class: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[invitationStatus as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <Badge variant="secondary" className={`${config.class} font-medium`}>
        {config.label}
      </Badge>
    )
  }

  // Calculer les statistiques
  const getStats = () => {
    const interventionStats = {
      total: interventions.length,
      pending: interventions.filter(i => i.status === 'pending').length,
      inProgress: interventions.filter(i => i.status === 'in_progress' || i.status === 'assigned').length,
      completed: interventions.filter(i => i.status === 'completed').length
    }

    return {
      interventionStats,
      totalProperties: properties.length,
      totalLots: properties.filter(p => p.type === 'lot').length,
      totalBuildings: properties.filter(p => p.type === 'building').length
    }
  }

  const stats = getStats()

  // Configuration des onglets
  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye, count: null },
    { id: "interventions", label: "Interventions", icon: Wrench, count: stats.interventionStats.total },
    { id: "properties", label: "Biens", icon: Home, count: stats.totalProperties }
  ]

  // États de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => router.push("/gestionnaire/contacts")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour aux contacts</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/gestionnaire/contacts")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour aux contacts</span>
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  // Vérifier que le contact existe
  if (!contact) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/gestionnaire/contacts")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour aux contacts</span>
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Contact non trouvé</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  const getRoleConfig = (role: string) => {
    return userRoles.find(r => r.value === role) || userRoles[0]
  }

  const getProviderCategoryLabel = (category: string) => {
    return providerCategories.find(c => c.value === category)?.label || category
  }

  const getSpecialityLabel = (speciality: string) => {
    return specialities.find(s => s.value === speciality)?.label || speciality
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header amélioré */}
      <ContactDetailHeader
        contact={{
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          role: contact.role,
          provider_category: contact.provider_category,
          speciality: contact.speciality,
          createdAt: contact.created_at || new Date().toISOString(),
          createdBy: contact.created_by,
        }}
        invitationStatus={invitationStatus}
        invitationLoading={invitationLoading}
        onBack={handleBack}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onInvitationAction={handleInvitationAction}
        customActions={[]}
      />

      {/* Tabs Navigation avec shadcn/ui */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-100">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center space-x-2 text-slate-600 data-[state=active]:text-sky-600 data-[state=active]:bg-white"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {tab.count !== null && (
                    <Badge variant="secondary" className="ml-1 text-xs bg-slate-200 text-slate-700 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800">
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <div className="py-8">
            {/* Tab Content sera ajouté dans les prochaines parties */}
            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Informations Personnelles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-slate-800">
                      <User className="h-5 w-5 text-slate-500" />
                      <span>Informations Personnelles</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">Nom complet</span>
                      <span className="font-medium text-slate-900">{contact.name}</span>
                    </div>
                    {contact.first_name && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Prénom</span>
                        <span className="font-medium text-slate-900">{contact.first_name}</span>
                      </div>
                    )}
                    {contact.last_name && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Nom de famille</span>
                        <span className="font-medium text-slate-900">{contact.last_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">Email</span>
                      <span className="font-medium text-slate-900 text-sm">{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Téléphone</span>
                        <span className="font-medium text-slate-900">{contact.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">Rôle</span>
                      <Badge variant="secondary" className={getRoleConfig(contact.role).color}>
                        {getRoleConfig(contact.role).label}
                      </Badge>
                    </div>
                    {contact.provider_category && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Catégorie</span>
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                          {getProviderCategoryLabel(contact.provider_category)}
                        </Badge>
                      </div>
                    )}
                    {contact.speciality && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Spécialité</span>
                        <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                          {getSpecialityLabel(contact.speciality)}
                        </Badge>
                      </div>
                    )}
                    {contact.notes && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-600 text-sm">Notes</span>
                        <p className="text-sm font-medium mt-1 text-slate-900">{contact.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Statut d'Accès */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-slate-800">
                      <AlertCircle className="h-5 w-5 text-slate-500" />
                      <span>Statut d&apos;Accès</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Statut d&apos;invitation</span>
                      {getInvitationStatusBadge()}
                    </div>

                    {/* Informations contextuelles selon le statut */}
                    {invitationStatus === 'accepted' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          ✅ Ce contact a accès à l&apos;application et peut se connecter
                        </p>
                      </div>
                    )}
                    
                    {invitationStatus === 'pending' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          📧 Une invitation a été envoyée à ce contact. Il doit cliquer sur le lien reçu par email pour activer son accès.
                        </p>
                      </div>
                    )}
                    
                    {invitationStatus === 'expired' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                          ⏰ L&apos;invitation de ce contact a expiré. Vous pouvez en envoyer une nouvelle depuis la page de modification.
                        </p>
                      </div>
                    )}
                    
                    {invitationStatus === 'cancelled' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">
                          🚫 L&apos;invitation de ce contact a été annulée. Vous pouvez en envoyer une nouvelle depuis la page de modification.
                        </p>
                      </div>
                    )}
                    
                    {!invitationStatus && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-sm text-slate-600">
                          👤 Ce contact existe dans votre base mais n&apos;a pas accès à l&apos;application
                        </p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push(`/gestionnaire/contacts/modifier/${resolvedParams.id}`)}
                    >
                      Gérer l&apos;accès
                    </Button>
                  </CardContent>
                </Card>

                {/* Activité */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-slate-800">
                      <Wrench className="h-5 w-5 text-slate-500" />
                      <span>Activité</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">Interventions totales</span>
                      <span className="font-medium text-slate-900">{stats.interventionStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">En attente</span>
                      <span className="font-medium text-amber-600">{stats.interventionStats.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">En cours</span>
                      <span className="font-medium text-sky-600">{stats.interventionStats.inProgress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">Terminées</span>
                      <span className="font-medium text-emerald-600">{stats.interventionStats.completed}</span>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Biens liés</span>
                        <span className="font-medium text-slate-900">{stats.totalProperties}</span>
                      </div>
                      {stats.totalLots > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">• Lots</span>
                          <span className="text-slate-700">{stats.totalLots}</span>
                        </div>
                      )}
                      {stats.totalBuildings > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">• Immeubles</span>
                          <span className="text-slate-700">{stats.totalBuildings}</span>
                        </div>
                      )}
                    </div>

                    {(stats.interventionStats.total > 0 || stats.totalProperties > 0) && (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        {stats.interventionStats.total > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setActiveTab(&apos;interventions&apos;)}
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            Voir les interventions
                          </Button>
                        )}
                        {stats.totalProperties > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setActiveTab(&apos;properties&apos;)}
                          >
                            <Home className="h-4 w-4 mr-2" />
                            Voir les biens
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="interventions" className="mt-0">
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-blue-600">{stats.interventionStats.total}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-orange-600">{stats.interventionStats.pending}</div>
                      <div className="text-sm text-gray-600">En attente</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-yellow-600">{stats.interventionStats.inProgress}</div>
                      <div className="text-sm text-gray-600">En cours</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-green-600">{stats.interventionStats.completed}</div>
                      <div className="text-sm text-gray-600">Terminées</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interventions Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-slate-800 leading-snug flex items-center">
                    <Wrench className="h-5 w-5 mr-2 text-slate-500" />
                    Interventions liées à {contact.name} ({interventions.length})
                  </h2>
                  <Button onClick={() => router.push(&apos;/gestionnaire/interventions/nouvelle-intervention&apos;)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une intervention
                  </Button>
                </div>

                {/* Interventions Navigator */}
                <InterventionsNavigator
                  interventions={interventions}
                  loading={loading}
                  emptyStateConfig={{
                    title: "Aucune intervention",
                    description: 
                      contact.role === 'prestataire' ? 'Aucune intervention n\'a été assignée à ce prestataire.' :
                      contact.role === 'locataire' ? 'Aucune intervention n\'a été créée pour les logements de ce locataire.' :
                      'Aucune intervention n\'a été trouvée pour ce contact.',
                    showCreateButton: true,
                    createButtonText: "Créer une intervention",
                    createButtonAction: () => router.push('/gestionnaire/interventions/nouvelle-intervention')
                  }}
                  contactContext={{
                    contactId: contact.id,
                    contactName: contact.name,
                    contactRole: contact.role
                  }}
                  showStatusActions={contact.role === 'gestionnaire'}
                  searchPlaceholder={`Rechercher les interventions de ${contact.name}...`}
                  showFilters={true}
                />
              </div>
            </TabsContent>

            <TabsContent value="properties" className="mt-0">
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalProperties}</div>
                      <div className="text-sm text-gray-600">Biens totaux</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-green-600">{stats.totalLots}</div>
                      <div className="text-sm text-gray-600">Lots</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-purple-600">{stats.totalBuildings}</div>
                      <div className="text-sm text-gray-600">Immeubles</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Properties Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-slate-800 leading-snug flex items-center">
                    <Home className="h-5 w-5 mr-2 text-slate-500" />
                    Biens liés à {contact.name} ({properties.length})
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(&apos;/gestionnaire/biens/lots/nouveau&apos;)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau lot
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(&apos;/gestionnaire/biens/immeubles/nouveau&apos;)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvel immeuble
                    </Button>
                  </div>
                </div>

                {/* Properties Navigator */}
                <PropertiesNavigator
                  properties={properties}
                  loading={loading}
                  emptyStateConfig={{
                    title: "Aucun bien lié",
                    description: 
                      contact.role === 'locataire' ? 'Ce locataire n\'a pas encore de logement assigné.' :
                      contact.role === 'gestionnaire' ? 'Ce gestionnaire ne gère pas encore de biens.' :
                      'Aucun bien n\'a été trouvé pour ce contact.',
                    showCreateButtons: true,
                    createButtonsConfig: {
                      lot: {
                        text: "Créer un lot",
                        action: () => router.push('/gestionnaire/biens/lots/nouveau')
                      },
                      building: {
                        text: "Créer un immeuble", 
                        action: () => router.push('/gestionnaire/biens/immeubles/nouveau')
                      }
                    }
                  }}
                  contactContext={{
                    contactId: contact.id,
                    contactName: contact.name,
                    contactRole: contact.role
                  }}
                  searchPlaceholder={`Rechercher les biens de ${contact.name}...`}
                  showFilters={true}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
