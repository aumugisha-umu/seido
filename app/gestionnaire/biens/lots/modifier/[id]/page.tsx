"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"



import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import { BuildingInfoForm } from "@/components/building-info-form"
import { LotCategory } from "@/lib/lot-types"

interface LotInfo {
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  constructionYear: string
  floors: string
  description: string
  floor?: string
  doorNumber?: string
  category?: LotCategory
}

export default function EditLotPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()

  // States
  const [lot, setLot] = useState<any>(null)
  const [lotInfo, setLotInfo] = useState<LotInfo>({
    name: "",
    address: "",
    postalCode: "",
    city: "",
    country: "Belgique",
    constructionYear: "",
    floors: "",
    description: "",
    floor: "",
    doorNumber: "",
    category: "appartement",
  })
  // const [selectedManagerId, setSelectedManagerId] = useState<string>("")
  const [teamManagers, setTeamManagers] = useState<any[]>([])
  const [userTeam, setUserTeam] = useState<any>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load lot data and populate form
  useEffect(() => {
    if (resolvedParams.id && user?.id) {
      loadLotData()
    }
  }, [resolvedParams.id, user?.id])

  // Load team managers
  useEffect(() => {
    const loadUserTeamAndManagers = async () => {
      if (!user?.id || teamStatus !== 'verified') {
        return
      }

      try {
        // 1. Récupérer les équipes de l'utilisateur
        const userTeams = await teamService.getUserTeams(user.id)
        
        if (userTeams.length === 0) {
          console.warn('No teams found for user')
          return
        }
        
        // 2. Prendre la première équipe
        const primaryTeam = userTeams[0]
        setUserTeam(primaryTeam)
        
        // 3. Récupérer les membres de cette équipe
        let teamMembers = []
        try {
          teamMembers = await teamService.getMembers(primaryTeam.id)
          setTeamManagers(teamMembers)
        } catch (membersError) {
          console.error("Error loading team members:", membersError)
          setTeamManagers([])
        }
        
      } catch (error) {
        console.error('Error loading team and managers:', error)
        setTeamManagers([])
      }
    }

    loadUserTeamAndManagers()
  }, [user?.id, teamStatus])

  const loadLotData = async () => {
    try {
      setLoading(true)
      setError(null)

      const lotData = await lotService.getById(resolvedParams.id)
      console.log("🏠 Lot loaded for edit:", lotData)
      
      setLot(lotData)
      
      // Populate form with existing data
      setLotInfo({
        name: lotData.reference || "",
        address: lotData.building?.address || "",
        postalCode: lotData.building?.postal_code || "",
        city: lotData.building?.city || "",
        country: lotData.building?.country || "Belgique",
        constructionYear: lotData.building?.construction_year?.toString() || "",
        floors: lotData.building?.floors?.toString() || "",
        description: lotData.description || "",
        floor: lotData.floor?.toString() || "",
        doorNumber: lotData.apartment_number || "",
        category: (lotData.category as LotCategory) || "appartement",
      })
      
      // TODO: Migrer vers le nouveau système de lot_contacts
      // setSelectedManagerId(lotData.manager_id || "")

    } catch (error) {
      console.error("❌ Error loading lot data:", error)
      setError("Erreur lors du chargement des données du lot")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id) {
      setError("Vous devez être connecté pour modifier le lot")
      return
    }

    if (!lotInfo.name.trim()) {
      setError("La référence du lot est requise")
      return
    }

    // TODO: Migrer vers le nouveau système de lot_contacts
    // if (!selectedManagerId) {
    //   setError("Veuillez sélectionner un responsable")
    //   return
    // }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const updateData = {
        reference: lotInfo.name.trim(),
        floor: lotInfo.floor ? parseInt(lotInfo.floor) : 0,
        apartment_number: lotInfo.doorNumber?.trim() || undefined,
        category: lotInfo.category,
        description: lotInfo.description.trim(),
        // TODO: Migrer vers le nouveau système de lot_contacts
        // manager_id: selectedManagerId,
      }

      await lotService.update(resolvedParams.id, updateData)
      
      setSuccess("Lot modifié avec succès!")
      
      // Redirect after success
      setTimeout(() => {
        router.push(`/gestionnaire/biens/lots/${resolvedParams.id}`)
      }, 2000)

    } catch (error) {
      console.error("❌ Error updating lot:", error)
      setError("Erreur lors de la modification du lot")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/gestionnaire/biens/lots/${resolvedParams.id}`)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button variant="ghost" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Error state
  if (error && !lot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="flex items-center space-x-2"
              disabled={saving}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Annuler</span>
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Enregistrer</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Modifier le lot
        </h1>
        <p className="text-gray-600 mt-1">
          Modifiez les informations du lot "{lot?.reference}"
        </p>
        {lot?.building && (
          <p className="text-sm text-gray-500">
            Appartient à l'immeuble "{lot.building.name}"
          </p>
        )}
      </div>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Success/Error Alerts */}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Informations du lot</CardTitle>
          </CardHeader>
          <CardContent>
            {/* TODO: Migrer vers le nouveau système de lot_contacts */}
            <BuildingInfoForm
              buildingInfo={lotInfo}
              setBuildingInfo={setLotInfo}
              selectedManagerId=""
              setSelectedManagerId={() => {}}
              teamManagers={[]}
              userTeam={null}
              isLoading={teamManagers.length === 0 && userTeam === null}
              showManagerSection={true}
              showAddressSection={false} // Les lots héritent de l'adresse du bâtiment
              entityType="lot"
              showTitle={false}
            />

            {/* Building information display */}
            {lot?.building && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Informations de l&apos;immeuble</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Nom :</strong> {lot.building.name}</p>
                  <p><strong>Adresse :</strong> {lot.building.address}</p>
                  <p><strong>Ville :</strong> {lot.building.city}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Les informations d&apos;adresse sont héritées de l&apos;immeuble parent.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
