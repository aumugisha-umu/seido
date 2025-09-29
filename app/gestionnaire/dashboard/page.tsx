"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, Home, Users, Euro, TrendingUp, AlertTriangle, Wrench, UserPlus, Plus, ChevronDown, PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { ContactFormModal } from "@/components/contact-form-modal"
import { useManagerStats, useContactStats } from "@/hooks/use-manager-stats"
import { useAuth } from "@/hooks/use-auth"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"
import { InterventionsList } from "@/components/interventions/interventions-list"

export default function DashboardGestionnaire() {
  const [notifications] = useState(3)
  const router = useRouter()
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const { stats, data, loading, error, refetch } = useManagerStats()
  const { contactStats, loading: contactsLoading, refetch: refetchContactStats } = useContactStats()
  const { user } = useAuth() // ✅ AJOUTÉ: Pour obtenir l'équipe utilisateur
  
  // ✅ NOUVEAU: Surveillance de session inactive sur dashboard
  useDashboardSessionTimeout()

  const handleContactSubmit = async (contactData: any) => {
    try {
      console.log("[v0] Contact created:", {
        ...contactData,
        fullName: `${contactData.firstName} ${contactData.lastName}`,
      })
      
      // ✅ NOUVELLE ARCHITECTURE: Utiliser contactInvitationService
      const { contactInvitationService, teamService } = await import('@/lib/database-service')
      
      if (!user?.id) {
        console.error("❌ [DASHBOARD] Utilisateur non authentifié")
        return
      }
      
      // 🔍 Récupérer l'équipe de l'utilisateur (comme les autres hooks)
      console.log("🔄 [DASHBOARD] Fetching user team...")
      const teams = await teamService.getUserTeams(user.id)
      
      if (!teams || teams.length === 0) {
        console.error("❌ [DASHBOARD] Aucune équipe trouvée pour l'utilisateur")
        return
      }
      
      const userTeamId = teams[0].id
      console.log("✅ [DASHBOARD] Team found:", userTeamId)
      
      console.log("🔄 [DASHBOARD] Calling contactInvitationService...")
      const result = await contactInvitationService.createContactWithOptionalInvite({
        type: contactData.type,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        address: contactData.address,
        speciality: contactData.speciality,
        notes: contactData.notes,
        inviteToApp: contactData.inviteToApp,
        teamId: userTeamId
      })
      
      console.log("✅ [DASHBOARD] Contact creation completed:", result)
      
      if (contactData.inviteToApp && result.invitationResult) {
        console.log("📧 [DASHBOARD] Invitation envoyée avec succès à:", contactData.email)
      }
      
      // Fermer le modal
      setIsContactModalOpen(false)
      
      // Recharger les statistiques pour refléter le nouveau contact
      refetch()
      refetchContactStats()
      
    } catch (error) {
      console.error("❌ [DASHBOARD] Erreur lors de la création du contact:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200"></header>

      {/* Main Content */}
      <div className="py-2">
        {/* Welcome Message and Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-bold text-gray-900 mb-[] mt-[] text-3xl">
                      Tableau de bord 
              </h1>
              
            </div>

            {/* Actions rapides */}
            <div className="flex items-center gap-3">
              {/* Menu mobile compact */}
              <div className="sm:hidden w-full">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm"
                      className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium min-h-[44px] shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Actions rapides</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent align="center" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px]">
                     <DropdownMenuItem onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")} className="flex items-center">
                       <PlusCircle className="h-4 w-4 mr-3" />
                       Ajouter une intervention
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => router.push("/gestionnaire/biens/immeubles/nouveau")} className="flex items-center">
                       <PlusCircle className="h-4 w-4 mr-3" />
                       Ajouter un immeuble
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => router.push("/gestionnaire/biens/lots/nouveau")} className="flex items-center">
                       <PlusCircle className="h-4 w-4 mr-3" />
                       Ajouter un lot
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setIsContactModalOpen(true)} className="flex items-center">
                       <PlusCircle className="h-4 w-4 mr-3" />
                       Ajouter un contact
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                </DropdownMenu>
              </div>

               {/* Boutons séparés desktop */}
               <div className="hidden sm:flex items-center gap-3">
                 {/* Action principale - Intervention (plus fréquente) */}
                 <Button
                   size="sm"
                   className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                   onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}
                 >
                   <PlusCircle className="h-4 w-4" />
                   <span>Ajouter une intervention</span>
                 </Button>

                 {/* Actions secondaires */}
                 <Button
                   size="sm"
                   variant="outline"
                   className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 font-medium"
                   onClick={() => router.push("/gestionnaire/biens/immeubles/nouveau")}
                 >
                   <PlusCircle className="h-4 w-4" />
                   <span>Ajouter un immeuble</span>
                 </Button>

                 <Button
                   size="sm"
                   variant="outline"
                   className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 font-medium"
                   onClick={() => router.push("/gestionnaire/biens/lots/nouveau")}
                 >
                   <PlusCircle className="h-4 w-4" />
                   <span>Ajouter un lot</span>
                 </Button>

                 <Button
                   size="sm"
                   variant="outline"
                   className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 font-medium"
                   onClick={() => setIsContactModalOpen(true)}
                 >
                   <PlusCircle className="h-4 w-4" />
                   <span>Ajouter un contact</span>
                 </Button>
               </div>
            </div>
          </div>

          
        </div>

        {/* Portfolio Overview */}
        <div className="mb-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Immeubles</CardTitle>
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
                <CardTitle className="text-sm font-medium">Contacts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{contactStats.totalContacts}</div>
                    <div className="space-y-1">
                      <p className="text-sm text-green-600">
                        {contactStats.totalActiveAccounts} comptes actifs
                      </p>
                      {contactStats.invitationsPending > 0 && (
                        <p className="text-sm text-orange-600">
                          {contactStats.invitationsPending} invitations en attente
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(contactStats.contactsByType)
                          .filter(([_, stats]) => stats.total > 0)
                          .slice(0, 3) // Limiter à 3 catégories pour l'affichage
                          .map(([type, stats]) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}: {stats.total}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          {/* Interventions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5" />
                  <span>Interventions</span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Button 
                    size="sm" 
                    onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}
                    className="flex items-center justify-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden min-[480px]:inline">Ajouter une intervention</span>
                    <span className="min-[480px]:hidden">Ajouter</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push("/gestionnaire/interventions")}
                    className="flex items-center justify-center"
                  >
                    <span className="hidden min-[480px]:inline">Voir toutes →</span>
                    <span className="min-[480px]:hidden">Toutes →</span>
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Affichage des stats rapides */}
              {data?.interventions && data.interventions.length > 0 && !loading && (
                <div className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">{stats.interventionsCount}</span> interventions au total
                </div>
              )}

              {/* Liste des interventions avec composant unifié */}
              <InterventionsList
                interventions={data?.interventions || []}
                loading={loading}
                compact={true}
                maxItems={3}
                emptyStateConfig={{
                  title: "Aucune intervention",
                  description: "Les interventions apparaîtront ici une fois créées",
                  showCreateButton: true,
                  createButtonText: "Ajouter une intervention",
                  createButtonAction: () => router.push("/gestionnaire/interventions/nouvelle-intervention")
                }}
                showStatusActions={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleContactSubmit}
        onSuccess={refetchContactStats}
        defaultType="locataire"
      />

    </div>
  )
}
