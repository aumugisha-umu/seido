import React, { useState } from "react"
import Image from "next/image"
import {
  FileText,
  Star,
  MessageSquare,
  Calendar,
  Clock,
  User,
  Building,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
  Shield,
  Euro,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Photo {
  id: string
  url?: string
  name?: string
  [key: string]: unknown
}

interface Document {
  id: string
  name?: string
  url?: string
  [key: string]: unknown
}

interface ContextData {
  workCompletion?: {
    beforePhotos?: Photo[]
    afterPhotos?: Photo[]
    documents?: Document[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface FinalizationTabsProps {
  contextData: ContextData
  className?: string
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export const FinalizationTabs = ({
  contextData,
  className,
  activeTab = 'overview',
  onTabChange = () => {}
}: FinalizationTabsProps) => {
  const [expandedReport, setExpandedReport] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const SatisfactionStars = ({ rating }: { rating: number }) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground"
            )}
          />
        ))}
      </div>
    )
  }

  // Determine rendering mode based on className
  const isMobileTabsOnly = className?.includes('mobile-tabs-only')
  const isMobileContentOnly = className?.includes('mobile-content-only')

  // Mobile tabs only - just render the tab buttons
  if (isMobileTabsOnly) {
    return (
      <div className="grid w-full grid-cols-3 bg-gray-100/80 p-1 rounded-xl h-auto">
        <button
          onClick={() => onTabChange('overview')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 transition-all duration-200 rounded-lg",
            activeTab === 'overview'
              ? "bg-white shadow-md scale-[1.02]"
              : "hover:bg-gray-200/50"
          )}
        >
          <FileText className="h-4 w-4" />
          <span className="text-xs font-medium">Détails</span>
        </button>
        <button
          onClick={() => onTabChange('reports')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 transition-all duration-200 rounded-lg",
            activeTab === 'reports'
              ? "bg-white shadow-md scale-[1.02]"
              : "hover:bg-gray-200/50"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-xs font-medium">Rapports</span>
        </button>
        <button
          onClick={() => onTabChange('validation')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 transition-all duration-200 rounded-lg",
            activeTab === 'validation'
              ? "bg-white shadow-md scale-[1.02]"
              : "hover:bg-gray-200/50"
          )}
        >
          <Shield className="h-4 w-4" />
          <span className="text-xs font-medium">Qualité</span>
        </button>
      </div>
    )
  }


  // Mobile content only - just render the content without tabs
  if (isMobileContentOnly) {
    return (
      <div className="space-y-4">
        {/* Vue d'ensemble content */}
        {activeTab === 'overview' && (
          <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-sky-600" />
                Détails de l'intervention
              </div>
              {/* Status Badge */}
              <Badge
                variant={contextData.intervention.status === 'cloturee_par_locataire' ? "default" :
                        contextData.intervention.status === 'contestee' ? "destructive" : "secondary"}
                className={cn(
                  "px-2 py-1 text-xs",
                  contextData.intervention.status === 'cloturee_par_locataire' && "bg-green-100 text-green-800 border-green-200",
                  contextData.intervention.status === 'contestee' && "bg-red-100 text-red-800 border-red-200"
                )}
              >
                {contextData.intervention.status === 'cloturee_par_locataire' ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" />Validée</>
                ) : contextData.intervention.status === 'contestee' ? (
                  <><XCircle className="h-3 w-3 mr-1" />Contestée</>
                ) : (
                  <><Clock className="h-3 w-3 mr-1" />En cours</>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Reference and Type */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Référence</Label>
                <p className="font-mono text-sm font-semibold text-gray-900">{contextData.intervention.reference}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Type</Label>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {contextData.intervention.type}
                  </Badge>
                  {contextData.intervention.urgency === 'urgent' && (
                    <Badge variant="destructive" className="text-xs">
                      Urgent
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</Label>
              <p className="text-sm text-gray-700">{contextData.intervention.title}</p>
              {contextData.intervention.description && (
                <p className="text-xs text-gray-600 mt-1">{contextData.intervention.description}</p>
              )}
            </div>

            <Separator />

            {/* Cost Information - Compact for mobile */}
            <div className="space-y-2">
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Coût final</Label>
                <div className="flex items-center gap-1">
                  <Euro className="h-4 w-4 text-emerald-600" />
                  <span className="text-lg font-bold text-emerald-700">
                    {(contextData.intervention.final_cost || 0).toFixed(2)}€
                  </span>
                </div>
              </div>
              {contextData.intervention.estimated_cost && (
                <div className="text-xs text-gray-600">
                  Estimation: {contextData.intervention.estimated_cost.toFixed(2)}€
                  {contextData.intervention.final_cost && (
                    <span className={cn(
                      "ml-2 font-medium",
                      contextData.intervention.final_cost > contextData.intervention.estimated_cost ? "text-red-600" : "text-green-600"
                    )}>
                      ({contextData.intervention.final_cost > contextData.intervention.estimated_cost ? '+' : ''}
                      {(contextData.intervention.final_cost - contextData.intervention.estimated_cost).toFixed(2)}€)
                    </span>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Property and Tenant info - Compact */}
            <div className="space-y-2">
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Bien</Label>
                <p className="text-sm font-medium">{contextData.intervention.lot?.building?.name}</p>
                <p className="text-xs text-gray-600">{contextData.intervention.lot?.reference}</p>
              </div>
              {contextData.intervention.tenant && (
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Locataire</Label>
                  <p className="text-sm font-medium">{contextData.intervention.tenant.name}</p>
                  <p className="text-xs text-gray-600">{contextData.intervention.tenant.email}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Simple timeline for mobile */}
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Chronologie</Label>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Créée: {new Date(contextData.intervention.created_at).toLocaleDateString()}</span>
                </div>
                {contextData.intervention.scheduled_date && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-600">Planifiée: {new Date(contextData.intervention.scheduled_date).toLocaleDateString()}</span>
                  </div>
                )}
                {contextData.intervention.completed_date && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Terminée: {new Date(contextData.intervention.completed_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Rapports content */}
        {activeTab === 'reports' && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-sky-600" />
                Rapports d'intervention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Contenu des rapports pour mobile...</p>
            </CardContent>
          </Card>
        )}

        {/* Validation content */}
        {activeTab === 'validation' && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-sky-600" />
                Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Contenu de validation pour mobile...</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100/80 p-1 rounded-xl shadow-inner mb-6 h-auto">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-1.5 px-2 sm:px-4 py-2.5 sm:py-3 transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:scale-[1.02] rounded-lg"
            >
              <FileText className="h-4 w-4 text-gray-600 data-[state=active]:text-sky-600" />
              <span className="hidden lg:inline font-medium text-xs sm:text-sm">Vue d'ensemble</span>
              <span className="lg:hidden text-xs font-medium">Détails</span>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="flex items-center gap-1.5 px-2 sm:px-4 py-2.5 sm:py-3 transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:scale-[1.02] rounded-lg"
            >
              <MessageSquare className="h-4 w-4 text-gray-600 data-[state=active]:text-sky-600" />
              <span className="hidden lg:inline font-medium text-xs sm:text-sm">Rapports</span>
              <span className="lg:hidden text-xs font-medium">Rapports</span>
            </TabsTrigger>
            <TabsTrigger
              value="validation"
              className="flex items-center gap-1.5 px-2 sm:px-4 py-2.5 sm:py-3 transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:scale-[1.02] rounded-lg"
            >
              <Star className="h-4 w-4 text-gray-600 data-[state=active]:text-sky-600" />
              <span className="hidden lg:inline font-medium text-xs sm:text-sm">Validation</span>
              <span className="lg:hidden text-xs font-medium">Qualité</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Now contains intervention details */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            {/* Main Intervention Details Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600" />
                    Détails de l'intervention
                  </div>
                  {/* Status Badge */}
                  <Badge
                    variant={contextData.intervention.status === 'cloturee_par_locataire' ? "default" :
                            contextData.intervention.status === 'contestee' ? "destructive" : "secondary"}
                    className={cn(
                      "px-2 py-1 text-xs",
                      contextData.intervention.status === 'cloturee_par_locataire' && "bg-green-100 text-green-800 border-green-200",
                      contextData.intervention.status === 'contestee' && "bg-red-100 text-red-800 border-red-200"
                    )}
                  >
                    {contextData.intervention.status === 'cloturee_par_locataire' ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" />Validée</>
                    ) : contextData.intervention.status === 'contestee' ? (
                      <><XCircle className="h-3 w-3 mr-1" />Contestée</>
                    ) : (
                      <><Clock className="h-3 w-3 mr-1" />En cours</>
                    )}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Reference and Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Référence</Label>
                    <p className="font-mono text-sm font-semibold text-gray-900">{contextData.intervention.reference}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Type</Label>
                    <Badge variant="outline" className="text-xs">
                      {contextData.intervention.type}
                    </Badge>
                    {contextData.intervention.urgency === 'urgent' && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Urgent
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Title/Description */}
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</Label>
                  <p className="text-sm text-gray-700">{contextData.intervention.title}</p>
                  {contextData.intervention.description && (
                    <p className="text-xs text-gray-600 mt-1">{contextData.intervention.description}</p>
                  )}
                </div>

                <Separator />

                {/* Cost Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Coût final</Label>
                    <div className="flex items-center gap-1">
                      <Euro className="h-4 w-4 text-emerald-600" />
                      <span className="text-lg font-bold text-emerald-700">
                        {(contextData.intervention.final_cost || 0).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                  {contextData.intervention.estimated_cost && (
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Estimation</Label>
                      <p className="text-sm text-gray-600">{contextData.intervention.estimated_cost.toFixed(2)}€</p>
                    </div>
                  )}
                  {contextData.intervention.estimated_cost && contextData.intervention.final_cost && (
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Écart</Label>
                      <p className={cn(
                        "text-sm font-medium",
                        contextData.intervention.final_cost > contextData.intervention.estimated_cost ? "text-red-600" : "text-green-600"
                      )}>
                        {contextData.intervention.final_cost > contextData.intervention.estimated_cost ? (
                          <><TrendingUp className="h-3 w-3 inline mr-1" />+</>
                        ) : (
                          <><TrendingDown className="h-3 w-3 inline mr-1" /></>
                        )}
                        {Math.abs(contextData.intervention.final_cost - contextData.intervention.estimated_cost).toFixed(2)}€
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Location and Tenant Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Building/Lot Info */}
                  {contextData.intervention.lot && (
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Building className="h-3 w-3" />Localisation
                      </Label>
                      <p className="text-sm font-medium text-gray-900">
                        {contextData.intervention.lot.building?.name || 'Bâtiment'}
                      </p>
                      <p className="text-xs text-gray-600">
                        Lot {contextData.intervention.lot.reference}
                      </p>
                      {contextData.intervention.lot.building?.address && (
                        <p className="text-xs text-gray-500 mt-1">
                          {contextData.intervention.lot.building.address}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tenant Info */}
                  {contextData.intervention.tenant && (
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <User className="h-3 w-3" />Locataire
                      </Label>
                      <p className="text-sm font-medium text-gray-900">
                        {contextData.intervention.tenant.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {contextData.intervention.tenant.email}
                      </p>
                      {contextData.intervention.tenant.phone && (
                        <p className="text-xs text-gray-500">
                          {contextData.intervention.tenant.phone}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Timeline Information */}
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />Chronologie
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Créée le</span>
                      <span className="font-medium text-gray-900">
                        {format(new Date(contextData.intervention.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    {contextData.intervention.scheduled_date && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        <span className="text-gray-600">Planifiée le</span>
                        <span className="font-medium text-gray-900">
                          {format(new Date(contextData.intervention.scheduled_date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>
                    )}
                    {contextData.intervention.completed_date && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                        <span className="text-gray-600">Terminée le</span>
                        <span className="font-medium text-gray-900">
                          {format(new Date(contextData.intervention.completed_date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6 mt-6">
            {contextData.workCompletion && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold">
                        {contextData.workCompletion.provider?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {contextData.workCompletion.provider?.name || 'Prestataire'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {contextData.workCompletion.provider?.provider_category || "Prestataire"}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {contextData.workCompletion.actualDurationHours}h de travail
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                      Résumé des travaux effectués
                    </Label>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className={cn(
                        "text-sm text-gray-700 leading-relaxed whitespace-pre-wrap",
                        !expandedReport && contextData.workCompletion.workSummary.length > 300 && "line-clamp-4"
                      )}>
                        {contextData.workCompletion.workSummary}
                      </p>
                      {contextData.workCompletion.workSummary.length > 300 && (
                        <button
                          onClick={() => setExpandedReport(!expandedReport)}
                          className="text-sm text-sky-600 hover:text-sky-700 mt-3 flex items-center gap-1 font-medium"
                        >
                          {expandedReport ? (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Réduire
                            </>
                          ) : (
                            <>
                              <ChevronRight className="h-3 w-3" />
                              Lire la suite
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Additional details */}
                  {(contextData.workCompletion.materialsUsed || contextData.workCompletion.issuesEncountered || contextData.workCompletion.recommendations) && (
                    <>
                      <Separator />
                      <div className="grid gap-4">
                        {contextData.workCompletion.materialsUsed && (
                          <div>
                            <Label className="text-sm font-semibold text-gray-700">Matériaux utilisés</Label>
                            <p className="text-sm text-gray-600 mt-1">{contextData.workCompletion.materialsUsed}</p>
                          </div>
                        )}

                        {contextData.workCompletion.issuesEncountered && (
                          <div>
                            <Label className="text-sm font-semibold text-gray-700">Problèmes rencontrés</Label>
                            <p className="text-sm text-gray-600 mt-1">{contextData.workCompletion.issuesEncountered}</p>
                          </div>
                        )}

                        {contextData.workCompletion.recommendations && (
                          <div>
                            <Label className="text-sm font-semibold text-gray-700">Recommandations</Label>
                            <p className="text-sm text-gray-600 mt-1">{contextData.workCompletion.recommendations}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Photos */}
                  {((Array.isArray(contextData.workCompletion.beforePhotos) && contextData.workCompletion.beforePhotos.length > 0) ||
                    (Array.isArray(contextData.workCompletion.afterPhotos) && contextData.workCompletion.afterPhotos.length > 0)) && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Photos des travaux
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {Array.isArray(contextData.workCompletion.beforePhotos) && contextData.workCompletion.beforePhotos.map((photo: Photo, index: number) => (
                            <button
                              key={`before-${index}`}
                              onClick={() => setSelectedImage(photo.url)}
                              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-sky-500 transition-all duration-200 hover:shadow-md group"
                            >
                              <Image
                                src={photo.url || ''}
                                alt={`Avant ${index + 1}`}
                                width={200}
                                height={150}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs py-2 px-2">
                                <span className="font-medium">Avant</span>
                              </div>
                            </button>
                          ))}
                          {Array.isArray(contextData.workCompletion.afterPhotos) && contextData.workCompletion.afterPhotos.map((photo: Photo, index: number) => (
                            <button
                              key={`after-${index}`}
                              onClick={() => setSelectedImage(photo.url)}
                              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-sky-500 transition-all duration-200 hover:shadow-md group"
                            >
                              <Image
                                src={photo.url || ''}
                                alt={`Après ${index + 1}`}
                                width={200}
                                height={150}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs py-2 px-2">
                                <span className="font-medium">Après</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Documents */}
                  {Array.isArray(contextData.workCompletion.documents) && contextData.workCompletion.documents.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documents joints
                        </Label>
                        <div className="space-y-2">
                          {contextData.workCompletion.documents.map((doc: Document, index: number) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                              <FileText className="h-5 w-5 text-sky-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {doc.name || `Document ${index + 1}`}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {doc.type || 'Document'}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-shrink-0"
                                onClick={() => window.open(doc.url, '_blank')}
                              >
                                Ouvrir
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-6 mt-6">
            {contextData.tenantValidation ? (
              <Card className={cn(
                "shadow-sm",
                contextData.tenantValidation.validationType === 'approve'
                  ? "ring-2 ring-green-200 bg-green-50/30"
                  : "ring-2 ring-red-200 bg-red-50/30"
              )}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-600" />
                      Validation du locataire
                    </CardTitle>
                    <Badge
                      variant={contextData.tenantValidation.validationType === 'approve' ? "default" : "destructive"}
                      className={cn(
                        "px-3 py-1.5",
                        contextData.tenantValidation.validationType === 'approve'
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      )}
                    >
                      {contextData.tenantValidation.validationType === 'approve' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          Travaux validés
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Travaux contestés
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Satisfaction */}
                  {contextData.tenantValidation.satisfaction && typeof contextData.tenantValidation.satisfaction === 'object' && (
                    <div className="p-4 bg-white rounded-lg border">
                      <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                        Satisfaction globale
                      </Label>
                      <div className="flex items-center gap-4">
                        <SatisfactionStars rating={contextData.tenantValidation.satisfaction.overall || 0} />
                        <span className="text-2xl font-bold text-gray-900">
                          {contextData.tenantValidation.satisfaction.overall}/5
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  {contextData.tenantValidation.recommendProvider !== undefined && (
                    <div className="p-4 bg-white rounded-lg border">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-700">
                          Recommande le prestataire
                        </Label>
                        <Badge variant={contextData.tenantValidation.recommendProvider ? "default" : "secondary"}>
                          {contextData.tenantValidation.recommendProvider ? "Oui" : "Non"}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  {contextData.tenantValidation.comments && (
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                        Commentaires du locataire
                      </Label>
                      <div className="p-4 bg-white rounded-lg border">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {contextData.tenantValidation.comments}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Issues if contested */}
                  {contextData.tenantValidation.validationType === 'contest' && contextData.tenantValidation.issues && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-red-900 mb-2">
                            Problèmes signalés
                          </h4>
                          <p className="text-sm text-red-800 leading-relaxed">
                            {typeof contextData.tenantValidation.issues === 'object'
                              ? contextData.tenantValidation.issues.description
                              : contextData.tenantValidation.issues}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional comments */}
                  {contextData.tenantValidation.additionalComments && (
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                        Commentaires additionnels
                      </Label>
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {contextData.tenantValidation.additionalComments}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Aucune validation locataire</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Le locataire n'a pas encore validé les travaux
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Image Lightbox */}
        {selectedImage && (
          <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-2">
              <DialogHeader className="px-4 py-2">
                <DialogTitle>Aperçu de l'image</DialogTitle>
              </DialogHeader>
              <div className="px-4 pb-4">
                <Image
                  src={selectedImage || ''}
                  alt="Image agrandie"
                  width={800}
                  height={600}
                  className="w-full h-auto max-h-[75vh] object-contain rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
}
