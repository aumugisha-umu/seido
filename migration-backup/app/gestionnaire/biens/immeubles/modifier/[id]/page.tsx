"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useManagerStats } from "@/hooks/use-manager-stats"
import { buildingService, teamService } from "@/lib/database-service"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import { BuildingInfoForm } from "@/components/building-info-form"

interface BuildingInfo {
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  constructionYear: string
  floors: string
  description: string
}

export default function EditBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const _router = useRouter()
  const resolvedParams = use(params)
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()

  // States
  const [building, setBuilding] = useState<any>(null)
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo>({
    name: "",
    address: "",
    postalCode: "",
    city: "",
    country: "Belgique",
    constructionYear: "",
    floors: "",
    description: "",
  })
  const [selectedManagerId, setSelectedManagerId] = useState<string>("")
  const [teamManagers, setTeamManagers] = useState<unknown[]>([])
  const [userTeam, setUserTeam] = useState<any>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load building data and populate form
  useEffect(() => {
    if (resolvedParams.id && user?.id) {
      loadBuildingData()
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

  const loadBuildingData = async () => {
    try {
      setLoading(true)
      setError(null)

      const buildingData = await buildingService.getById(resolvedParams.id)
      console.log("🏢 Building loaded for edit:", buildingData)
      
      setBuilding(buildingData)
      
      // Populate form with existing data
      setBuildingInfo({
        name: buildingData.name || "",
        address: buildingData.address || "",
        postalCode: buildingData.postal_code || "",
        city: buildingData.city || "",
        country: buildingData.country || "Belgique",
        constructionYear: buildingData.construction_year?.toString() || "",
        floors: buildingData.floors?.toString() || "",
        description: buildingData.description || "",
      })
      
      // TODO: Migrer vers le nouveau système de building_contacts
      // setSelectedManagerId(buildingData.manager_id || "")

    } catch (error) {
      console.error("❌ Error loading building data:", error)
      setError("Erreur lors du chargement des données de l'immeuble")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id) {
      setError("Vous devez être connecté pour modifier l'immeuble")
      return
    }

    if (!buildingInfo.name.trim()) {
      setError("Le nom de l'immeuble est requis")
      return
    }

    if (!buildingInfo.address.trim()) {
      setError("L'adresse de l'immeuble est requise")
      return
    }

    // TODO: Migrer vers le nouveau système de building_contacts
    // if (!selectedManagerId) {
    //   setError("Veuillez sélectionner un responsable")
    //   return
    // }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const updateData = {
        name: buildingInfo.name.trim(),
        address: buildingInfo.address.trim(),
        city: buildingInfo.city.trim() || "Non spécifié",
        country: buildingInfo.country.trim() || "Belgique",
        postal_code: buildingInfo.postalCode.trim() || "",
        description: buildingInfo.description.trim(),
        construction_year: buildingInfo.constructionYear ? parseInt(buildingInfo.constructionYear) : undefined,
        floors: buildingInfo.floors ? parseInt(buildingInfo.floors) : undefined,
        // TODO: Migrer vers le nouveau système de building_contacts
        // manager_id: selectedManagerId,
      }

      await buildingService.update(resolvedParams.id, updateData)
      
      setSuccess("Immeuble modifié avec succès!")
      
      // Redirect after success
      setTimeout(() => {
        router.push(`/gestionnaire/biens/immeubles/${resolvedParams.id}`)
      }, 2000)

    } catch (error) {
      console.error("❌ Error updating building:", error)
      setError("Erreur lors de la modification de l'immeuble")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/gestionnaire/biens/immeubles/${resolvedParams.id}`)
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
  if (error && !building) {
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
          Modifier l'immeuble
        </h1>
        <p className="text-gray-600 mt-1">
          Modifiez les informations de l'immeuble "{building?.name}"
        </p>
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
            <CardTitle>Informations de l'immeuble</CardTitle>
          </CardHeader>
          <CardContent>
            {/* TODO: Migrer vers le nouveau système de building_contacts */}
            <BuildingInfoForm
              buildingInfo={buildingInfo}
              setBuildingInfo={setBuildingInfo}
              selectedManagerId=""
              setSelectedManagerId={() => {}}
              teamManagers={[]}
              userTeam={null}
              isLoading={teamManagers.length === 0 && userTeam === null}
              showManagerSection={true}
              showAddressSection={true}
              entityType="immeuble"
              showTitle={false}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
