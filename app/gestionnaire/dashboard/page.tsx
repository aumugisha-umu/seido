"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Home, Users, Euro, TrendingUp, AlertTriangle, Wrench, BarChart3, UserPlus, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { ContactFormModal } from "@/components/contact-form-modal"
import { useManagerStats } from "@/hooks/use-manager-stats"

export default function DashboardGestionnaire() {
  const [notifications] = useState(3)
  const router = useRouter()
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const { stats, loading, error, refetch } = useManagerStats()

  const handleContactSubmit = (contactData: any) => {
    console.log("[v0] Contact created:", {
      ...contactData,
      fullName: `${contactData.firstName} ${contactData.lastName}`,
    })
    
    if (contactData.inviteToApp) {
      console.log("📧 Une invitation sera envoyée à:", contactData.email)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200"></header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message and Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-bold text-gray-900 mb-[] mt-[] text-3xl">
                      Tableau de bord 
              </h1>
              
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
                onClick={() => router.push("/gestionnaire/nouveau-batiment")}
              >
                <Building2 className="h-4 w-4" />
                <span>Nouveau bâtiment</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
                onClick={() => router.push("/gestionnaire/nouveau-lot")}
              >
                <Home className="h-4 w-4" />
                <span>Nouveau lot</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-transparent"
                onClick={() => setIsContactModalOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                <span>Inviter contact</span>
              </Button>

              <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                <Wrench className="h-4 w-4" />
                <span>Créer intervention</span>
              </Button>
            </div>
          </div>

          
        </div>

        {/* Portfolio Overview */}
        <div className="mb-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bâtiments</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-8" />
                ) : (
                  <div className="text-2xl font-bold">{stats.buildingsCount}</div>
                )}
                <p className="text-xs text-muted-foreground">Propriétés gérées</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lots</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-8" />
                ) : (
                  <div className="text-2xl font-bold">{stats.lotsCount}</div>
                )}
                <p className="text-xs text-muted-foreground">Logements totaux</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupés</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-2 w-full" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.occupiedLotsCount}/{stats.lotsCount}</div>
                    <div className="flex items-center space-x-2">
                      <Progress value={stats.occupancyRate} className="flex-1" />
                      <span className="text-sm font-medium text-gray-600">{stats.occupancyRate}%</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0€</div>
                <p className="text-sm text-gray-600">Aucun revenu à afficher</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Occupation Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Tendances d'occupation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-300 mx-auto mb-4 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-400">0%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Aucune donnée d'occupation</p>
                  <p className="text-xs text-gray-400">Ajoutez des biens pour voir les statistiques</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interventions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5" />
                  <span>Interventions</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/gestionnaire/interventions")}>
                  Voir toutes →
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune intervention</h3>
                <p className="text-gray-600 mb-4">Les interventions apparaîtront ici une fois créées</p>
                <Button onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une intervention
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleContactSubmit}
        defaultType="locataire"
      />
    </div>
  )
}
