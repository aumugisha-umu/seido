"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ListTodo,
  Settings,
  Archive,
} from "lucide-react"

import ContentNavigator from "@/components/content-navigator"
import { InterventionsList } from "@/components/interventions/interventions-list"

interface InterventionsNavigatorProps {
  interventions: any[]
  loading?: boolean
  emptyStateConfig?: {
    title: string
    description: string
    showCreateButton?: boolean
    createButtonText?: string
    createButtonAction?: () => void
  }
  showStatusActions?: boolean
  contactContext?: {
    contactId: string
    contactName: string
    contactRole?: string
  }
  className?: string
  searchPlaceholder?: string
  showFilters?: boolean
  actionHooks?: {
    approvalHook?: any
    planningHook?: any
    executionHook?: any
    finalizationHook?: any
  }
  userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
}

export function InterventionsNavigator({
  interventions = [],
  loading = false,
  emptyStateConfig,
  showStatusActions = true,
  contactContext,
  className = "",
  searchPlaceholder = "Rechercher par titre, description, ou lot...",
  showFilters = true,
  actionHooks,
  userContext = 'gestionnaire'
}: InterventionsNavigatorProps) {
  const [filteredInterventions, setFilteredInterventions] = useState<any[]>(interventions)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    type: "all",
    urgency: "all-urgency"
  })

  // Filter function for interventions based on tab (NOUVEAU WORKFLOW)
  const getFilteredInterventions = (tabId: string) => {
    let baseInterventions = filteredInterventions

    if (tabId === "toutes") {
      baseInterventions = interventions
    } else if (tabId === "demandes_group") {
      // Demandes : Demande, Approuvée
      baseInterventions = interventions.filter((i) => ["demande", "approuvee"].includes(i.status))
    } else if (tabId === "en_cours_group") {
      // En cours : Demande de devis, Planification, Planifiée, En cours, Clôturée par prestataire
      baseInterventions = interventions.filter((i) => ["demande_de_devis", "planification", "planifiee", "en_cours", "cloturee_par_prestataire"].includes(i.status))
    } else if (tabId === "cloturees_group") {
      // Clôturées : Clôturée par locataire, Clôturée par gestionnaire, Annulée, Rejetée
      baseInterventions = interventions.filter((i) => ["cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee", "rejetee"].includes(i.status))
    } else {
      baseInterventions = interventions.filter((i) => i.status === tabId)
    }

    // Apply search and filters
    return applySearchAndFilters(baseInterventions)
  }

  // Apply search and filters to interventions
  const applySearchAndFilters = (baseInterventions: any[]) => {
    let result = baseInterventions

    // Search filter
    if (searchTerm.trim()) {
      result = result.filter(intervention => 
        intervention.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        intervention.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        intervention.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        intervention.lot?.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        intervention.lot?.building?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Type filter
    if (filters.type !== "all") {
      result = result.filter(intervention => 
        intervention.type?.toLowerCase() === filters.type
      )
    }

    // Urgency filter
    if (filters.urgency !== "all-urgency") {
      result = result.filter(intervention => 
        intervention.urgency === filters.urgency
      )
    }

    return result
  }

  // Function to render interventions list
  const renderInterventionsList = (tabId: string) => {
    const filteredData = getFilteredInterventions(tabId)
    
    const defaultEmptyConfig = {
      title: tabId === "toutes" ? "Aucune intervention" : "Aucune intervention dans cette catégorie",
      description: tabId === "toutes" 
        ? "Les interventions apparaîtront ici"
        : "Les interventions de ce statut apparaîtront ici",
      showCreateButton: false,
      createButtonText: "Créer une intervention",
      createButtonAction: () => {}
    }

    return (
      <InterventionsList
        interventions={filteredData}
        loading={loading}
        emptyStateConfig={emptyStateConfig || defaultEmptyConfig}
        showStatusActions={showStatusActions}
        contactContext={contactContext}
        actionHooks={actionHooks}
        userContext={userContext}
      />
    )
  }

  // Tabs configuration for ContentNavigator (NOUVEAU WORKFLOW)
  const interventionsTabsConfig = [
    {
      id: "toutes",
      label: "Toutes",
      icon: ListTodo,
      count: loading ? "..." : interventions.length,
      content: renderInterventionsList("toutes")
    },
    {
      id: "demandes_group", 
      label: "Demandes",
      icon: AlertTriangle,
      count: loading ? "..." : interventions.filter((i) => 
        ["demande", "approuvee"].includes(i.status)
      ).length,
      content: renderInterventionsList("demandes_group")
    },
    {
      id: "en_cours_group",
      label: "En cours", 
      icon: Settings,
      count: loading ? "..." : interventions.filter((i) => 
        ["demande_de_devis", "planification", "planifiee", "en_cours", "cloturee_par_prestataire"].includes(i.status)
      ).length,
      content: renderInterventionsList("en_cours_group")
    },
    {
      id: "cloturees_group",
      label: "Clôturées",
      icon: Archive, 
      count: loading ? "..." : interventions.filter((i) => 
        ["cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee", "rejetee"].includes(i.status)
      ).length,
      content: renderInterventionsList("cloturees_group")
    }
  ]

  // Configuration des filtres pour les interventions
  const interventionsFiltersConfig = showFilters ? [
    {
      id: "type",
      label: "Type d'intervention",
      options: [
        { value: "all", label: "Tous les types" },
        { value: "plomberie", label: "Plomberie" },
        { value: "electricite", label: "Électricité" },
        { value: "chauffage", label: "Chauffage" },
        { value: "serrurerie", label: "Serrurerie" },
        { value: "maintenance", label: "Maintenance générale" },
        { value: "peinture", label: "Peinture" }
      ],
      defaultValue: "all"
    },
    {
      id: "urgency",
      label: "Niveau d'urgence",
      options: [
        { value: "all-urgency", label: "Tous les niveaux" },
        { value: "basse", label: "Basse" },
        { value: "normale", label: "Normale" },
        { value: "haute", label: "Haute" },
        { value: "urgente", label: "Urgente" }
      ],
      defaultValue: "all-urgency"
    }
  ] : []

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterId]: value
    }))
  }

  const handleResetFilters = () => {
    setFilters({
      type: "all",
      urgency: "all-urgency"
    })
    setSearchTerm("")
  }

  return (
    <div className={className}>
      <ContentNavigator
        tabs={interventionsTabsConfig}
        defaultTab="toutes"
        searchPlaceholder={searchPlaceholder}
        filters={interventionsFiltersConfig}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        filterValues={filters}
      />
    </div>
  )
}
