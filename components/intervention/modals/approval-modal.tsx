"use client"

import { Check, X, MapPin, User, Wrench, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
// Removed unused Textarea import
import { Badge } from "@/components/ui/badge"
// Removed unused Label import
import { type InterventionAction } from "@/lib/intervention-actions-service"
import { 
  getInterventionLocationText, 
  getInterventionLocationIcon, 
  isBuildingWideIntervention,
  getPriorityColor,
  getPriorityLabel 
} from "@/lib/intervention-utils"

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  intervention: InterventionAction | null
  action: "approve" | "reject" | null
  rejectionReason: string
  internalComment: string
  onRejectionReasonChange: (_reason: string) => void
  onInternalCommentChange: (_comment: string) => void
  onActionChange: (action: "approve" | "reject") => void
  onConfirm: (action?: "approve" | "reject") => void
}

export const ApprovalModal = ({
  isOpen,
  onClose,
  intervention,
  // action,
  // rejectionReason,
  // internalComment,
  // onRejectionReasonChange,
  // onInternalCommentChange,
  onActionChange,
  onConfirm,
}: ApprovalModalProps) => {
  if (!intervention) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold text-slate-900 leading-snug">
            Examiner la demande d'intervention
          </DialogTitle>
        </DialogHeader>
        <div className="text-base text-slate-600 leading-normal mb-6">
          Vérifiez les détails ci-dessous avant d'approuver ou de rejeter cette demande d'intervention.
        </div>

        <div className="space-y-6">
          {/* Header avec référence et urgence */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-800 leading-snug mb-1">
                  {intervention.title}
                </h3>
                <p className="text-sm text-slate-500 leading-normal">
                  Référence: #{intervention.reference}
                </p>
              </div>
              <Badge className={getPriorityColor(intervention.urgency || "")}>
                {getPriorityLabel(intervention.urgency || "")}
              </Badge>
            </div>
          </div>

          {/* Grid layout pour les informations principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logement concerné */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-sky-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-sky-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 leading-snug">Logement concerné</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-slate-700">Localisation:</span>
                  <p className="text-base text-slate-900 leading-normal mt-1 flex items-center gap-2">
                    {getInterventionLocationIcon(intervention) === "building" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    {getInterventionLocationText(intervention)}
                    {isBuildingWideIntervention(intervention) && (
                      <Badge variant="secondary" className="text-xs">
                        Bâtiment entier
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Informations complémentaires */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <User className="h-5 w-5 text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 leading-snug">Informations complémentaires</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-slate-700">Date de création:</span>
                  <p className="text-base text-slate-900 leading-normal mt-1">
                    {intervention.created_at ? 
                      new Date(intervention.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : 'Non spécifiée'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Détails du problème */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Wrench className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 leading-snug">Détails du problème</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-slate-700">Catégorie d'intervention:</span>
                  <p className="text-base text-slate-900 leading-normal mt-1">{intervention.type}</p>
                </div>
                {intervention.precise_location && (
                  <div>
                    <span className="text-sm font-medium text-slate-700">Localisation précise:</span>
                    <p className="text-base text-slate-900 leading-normal mt-1">{intervention.precise_location}</p>
                  </div>
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-slate-700">Description détaillée:</span>
                <p className="text-base text-slate-700 leading-relaxed mt-2 bg-slate-50 p-4 rounded-lg">
                  {intervention.description}
                </p>
              </div>
            </div>
          </div>


          {/* Fichiers joints */}
          {intervention.files && intervention.files.length > 0 && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <div className="h-5 w-5 text-slate-600 flex items-center justify-center">📎</div>
                </div>
                <h3 className="text-lg font-medium text-slate-800 leading-snug">Fichiers joints</h3>
              </div>
              <div className="space-y-3">
                {intervention.files.map((file, index) => {
                  const extension = file.name?.split('.').pop()?.toUpperCase() || 'FILE'
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                        <span className="text-sky-600 text-xs font-semibold">{extension}</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-base font-medium text-slate-900">{file.name}</span>
                        {file.size && <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Message d'information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 leading-snug">Prochaine étape</h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Après avoir choisi votre action, vous pourrez ajouter des commentaires et finaliser votre décision.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 pt-6 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            Fermer
          </Button>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                onActionChange("reject")
                onConfirm("reject")
              }}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              <X className="h-4 w-4 mr-2" />
              Rejeter
            </Button>
            <Button
              onClick={() => {
                onActionChange("approve")
                onConfirm("approve")
              }}
              className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Approuver l'intervention
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
