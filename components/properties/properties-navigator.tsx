"use client"

import { useState } from "react"
import { Building2, Home } from "lucide-react"

import ContentNavigator from "@/components/content-navigator"
import { PropertiesList } from "@/components/properties/properties-list"

interface PropertiesNavigatorProps {
  properties: any[]
  loading?: boolean
  emptyStateConfig?: {
    title: string
    description: string
    showCreateButtons?: boolean
    createButtonsConfig?: {
      lot?: {
        text: string
        action: () => void
      }
      building?: {
        text: string
        action: () => void
      }
    }
  }
  contactContext?: {
    contactId: string
    contactName: string
    contactRole?: string
  }
  className?: string
  searchPlaceholder?: string
  showFilters?: boolean
}

export function PropertiesNavigator({
  properties = [],
  loading = false,
  emptyStateConfig,
  contactContext,
  className = "",
  searchPlaceholder = "Rechercher par référence, nom, adresse...",
  showFilters = true
}: PropertiesNavigatorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    status: "all",
    type: "all"
  })

  // Separate properties by type
  const buildings = properties.filter(p => p.type === 'building') || []
  const lots = properties.filter(p => p.type === 'lot') || []

  // Apply search and filters to buildings
  const applySearchAndFilters = (propertiesList: any[], propertyType: 'building' | 'lot') => {
    let result = propertiesList

    // Search filter
    if (searchTerm.trim()) {
      result = result.filter(property => {
        const searchLower = searchTerm.toLowerCase()
        if (propertyType === 'building') {
          return (
            property.name?.toLowerCase().includes(searchLower) ||
            property.address?.toLowerCase().includes(searchLower) ||
            property.city?.toLowerCase().includes(searchLower)
          )
        } else {
          return (
            property.reference?.toLowerCase().includes(searchLower) ||
            property.building?.name?.toLowerCase().includes(searchLower) ||
            property.apartment_number?.toString().includes(searchLower)
          )
        }
      })
    }

    // Status filter
    if (filters.status !== "all") {
      result = result.filter(property => {
        if (propertyType === 'lot') {
          if (filters.status === "occupied") return property.is_occupied
          if (filters.status === "vacant") return !property.is_occupied
        }
        // For buildings, we could check if they have occupied lots
        // but let's keep it simple for now
        return true
      })
    }

    return result
  }

  const filteredBuildings = applySearchAndFilters(buildings, 'building')
  const filteredLots = applySearchAndFilters(lots, 'lot')

  // Function to render properties list
  const renderPropertiesList = (tabId: string) => {
    const propertiesData = tabId === "buildings" ? filteredBuildings : filteredLots
    
    const defaultEmptyConfig = {
      title: tabId === "buildings" ? "Aucun immeuble" : "Aucun lot",
      description: tabId === "buildings" 
        ? contactContext?.contactRole === 'gestionnaire' 
          ? "Ce gestionnaire ne gère aucun immeuble"
          : contactContext?.contactRole === 'prestataire'
            ? "Ce prestataire n'intervient sur aucun immeuble"
            : "Aucun immeuble lié à ce contact"
        : contactContext?.contactRole === 'locataire'
          ? "Ce locataire n'a pas de logement assigné"
          : contactContext?.contactRole === 'prestataire'
            ? "Ce prestataire n'intervient sur aucun lot"
            : contactContext?.contactRole === 'gestionnaire'
              ? "Ce gestionnaire ne gère aucun lot"
              : "Aucun lot lié à ce contact",
      showCreateButtons: false,
      createButtonsConfig: {
        lot: {
          text: "Créer un lot",
          action: () => {}
        },
        building: {
          text: "Créer un immeuble", 
          action: () => {}
        }
      }
    }

    return (
      <PropertiesList
        properties={propertiesData}
        loading={loading}
        emptyStateConfig={emptyStateConfig || defaultEmptyConfig}
        contactContext={contactContext}
      />
    )
  }

  // Tabs configuration for ContentNavigator
  const propertiesTabsConfig = [
    // Toujours afficher l'onglet Lots
    {
      id: "lots",
      label: "Lots",
      icon: Home,
      count: loading ? "..." : filteredLots.length,
      content: renderPropertiesList("lots")
    },
    // Afficher l'onglet Immeubles seulement si le contact n'est pas un locataire
    ...(contactContext?.contactRole !== 'locataire' ? [{
      id: "buildings",
      label: "Immeubles",
      icon: Building2,
      count: loading ? "..." : filteredBuildings.length,
      content: renderPropertiesList("buildings")
    }] : [])
  ]

  // Configuration des filtres pour les biens
  const propertiesFiltersConfig = showFilters ? [
    {
      id: "status",
      label: "Statut d'occupation",
      options: [
        { value: "all", label: "Tous" },
        { value: "occupied", label: "Occupés" },
        { value: "vacant", label: "Libres" }
      ],
      defaultValue: "all"
    },
    {
      id: "type",
      label: "Type de bien",
      options: [
        { value: "all", label: "Tous les types" },
        { value: "apartment", label: "Appartements" },
        { value: "house", label: "Maisons" },
        { value: "commercial", label: "Commerces" },
        { value: "office", label: "Bureaux" }
      ],
      defaultValue: "all"
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
      status: "all",
      type: "all"
    })
    setSearchTerm("")
  }

  return (
    <div className={className}>
      <ContentNavigator
        tabs={propertiesTabsConfig}
        defaultTab="lots"
        searchPlaceholder={searchPlaceholder}
        filters={propertiesFiltersConfig}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        filterValues={filters}
      />
    </div>
  )
}
