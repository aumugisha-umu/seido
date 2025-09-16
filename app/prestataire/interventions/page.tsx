"use client"

import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  FileText,
  Calendar,
  Settings
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { usePrestataireData } from "@/hooks/use-prestataire-data"
import InterventionsList from "@/components/interventions/interventions-list"

// Configuration des onglets pour les prestataires
const providerTabsConfig = [
  {
    id: "demande_de_devis",
    label: "Devis à fournir", 
    icon: FileText,
    statuses: ['demande_de_devis']
  },
  {
    id: "planification",
    label: "Planification",
    icon: Calendar,
    statuses: ['planification']
  },
  {
    id: "planifiee",
    label: "Planifiées",
    icon: Clock,
    statuses: ['planifiee']
  },
  {
    id: "en_cours",
    label: "En cours",
    icon: Settings,
    statuses: ['en_cours']
  },
  {
    id: "terminees",
    label: "Terminées",
    icon: CheckCircle,
    statuses: ['cloturee_par_prestataire']
  }
]

export default function PrestatairInterventionsPage() {
  const { user } = useAuth()
  const { interventions, loading, error } = usePrestataireData(user?.id || '')

  // Actions spécifiques aux prestataires selon le statut
  const renderProviderActions = (intervention: any) => {
    const actions = []
    
    switch (intervention.status) {
      case "demande_de_devis":
        actions.push({
          label: "Créer un devis",
          icon: FileText,
          onClick: () => console.log("Créer devis pour", intervention.id)
        })
        break
      case "planification":
        actions.push({
          label: "Proposer créneaux",
          icon: Calendar,
          onClick: () => console.log("Proposer créneaux pour", intervention.id)
        })
        break
      case "planifiee":
        actions.push({
          label: "Commencer travaux",
          icon: AlertTriangle,
          onClick: () => console.log("Commencer travaux pour", intervention.id)
        })
        break
      case "en_cours":
        actions.push({
          label: "Marquer terminé",
          icon: CheckCircle,
          onClick: () => console.log("Marquer terminé pour", intervention.id)
        })
        break
    }
    
    return actions
  }

  // Configuration pour l'état vide
  const emptyStateConfig = {
    title: "Aucune intervention",
    description: "Les interventions qui vous sont assignées apparaîtront ici"
  }

  return (
    <div className="py-2">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Interventions</h1>
        <p className="text-gray-600">Gérez les interventions qui vous sont assignées</p>
      </div>

      <InterventionsList
        interventions={interventions}
        userRole="provider"
        loading={loading}
        error={error}
        tabsConfig={providerTabsConfig}
        displayMode="list"
        showActions={true}
        renderActions={renderProviderActions}
        emptyStateConfig={emptyStateConfig}
      />
    </div>
  )
}
