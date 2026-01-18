'use client'

/**
 * EntityLinkSection - Section de liaison d'entité dans la création de contact
 *
 * Permet de lier un nouveau contact directement à :
 * - Un immeuble (pas pour les locataires)
 * - Un lot
 * - Un contrat
 * - Une intervention (non clôturée)
 *
 * Architecture:
 * - Tabs pour naviguer entre les types d'entités
 * - PropertySelector réutilisé pour immeubles/lots (avec recherche intégrée)
 * - ContractMiniSelector et InterventionMiniSelector pour contrats/interventions
 */

import { useState, useEffect, useMemo } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Link2,
  ChevronDown,
  Building2,
  Home,
  FileText,
  Zap,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PropertySelector from '@/components/property-selector'
import ContractMiniSelector from './contract-mini-selector'
import InterventionMiniSelector from './intervention-mini-selector'
import type { InterventionStatus } from '@/lib/services/core/service-types'

// Types
interface Building {
  id: string
  name: string
  address?: string | null
}

interface Lot {
  id: string
  reference: string
  building_id: string
  category?: string | null
  building?: Building | null
}

interface Contract {
  id: string
  reference?: string | null
  lot?: {
    id: string
    reference: string
    building?: {
      name: string
    } | null
  } | null
  start_date?: string | null
  status?: string | null
}

interface Intervention {
  id: string
  title: string
  status: InterventionStatus
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null
  scheduled_date?: string | null
  lot?: {
    id: string
    reference: string
    building?: {
      name: string
    } | null
  } | null
}

type EntityType = 'building' | 'lot' | 'contract' | 'intervention' | null

interface EntityLinkSectionProps {
  contactType: string
  teamId: string
  linkedEntityType: EntityType
  linkedBuildingId: string | null
  linkedLotId: string | null
  linkedContractId: string | null
  linkedInterventionId: string | null
  onFieldChange: (field: string, value: string | null) => void
  // Données pré-chargées côté serveur
  buildings: Building[]
  lots: Lot[]
}

// Statuts d'intervention à exclure (clôturées ou annulées)
const EXCLUDED_INTERVENTION_STATUSES = [
  'cloturee_par_gestionnaire',
  'cloturee_par_locataire',
  'annulee'
]

export function EntityLinkSection({
  contactType,
  teamId,
  linkedEntityType,
  linkedBuildingId,
  linkedLotId,
  linkedContractId,
  linkedInterventionId,
  onFieldChange,
  buildings,
  lots
}: EntityLinkSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [loadingInterventions, setLoadingInterventions] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('lot')

  // Filtrer les options disponibles selon le type de contact
  const showBuildingOption = contactType !== 'locataire'

  // Définir le tab par défaut
  useEffect(() => {
    if (linkedEntityType) {
      setActiveTab(linkedEntityType)
    } else if (!showBuildingOption) {
      setActiveTab('lot')
    }
  }, [linkedEntityType, showBuildingOption])

  // Charger les contrats quand on switch sur le tab "contract"
  useEffect(() => {
    if (activeTab === 'contract' && contracts.length === 0 && !loadingContracts) {
      fetchContracts()
    }
  }, [activeTab])

  // Charger les interventions quand on switch sur le tab "intervention"
  useEffect(() => {
    if (activeTab === 'intervention' && interventions.length === 0 && !loadingInterventions) {
      fetchInterventions()
    }
  }, [activeTab])

  const fetchContracts = async () => {
    setLoadingContracts(true)
    try {
      const response = await fetch(`/api/contracts/list?teamId=${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setContracts(data.contracts || [])
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoadingContracts(false)
    }
  }

  const fetchInterventions = async () => {
    setLoadingInterventions(true)
    try {
      const response = await fetch(`/api/interventions/list?teamId=${teamId}&excludeStatuses=${EXCLUDED_INTERVENTION_STATUSES.join(',')}`)
      if (response.ok) {
        const data = await response.json()
        setInterventions(data.interventions || [])
      }
    } catch (error) {
      console.error('Error fetching interventions:', error)
    } finally {
      setLoadingInterventions(false)
    }
  }

  // Handlers de sélection - clear autres + set nouvelle valeur
  const handleBuildingSelect = (buildingId: string | null) => {
    // Clear all other linked IDs
    onFieldChange('linkedLotId', null)
    onFieldChange('linkedContractId', null)
    onFieldChange('linkedInterventionId', null)
    // Set building
    onFieldChange('linkedBuildingId', buildingId)
    onFieldChange('linkedEntityType', buildingId ? 'building' : null)
  }

  const handleLotSelect = (lotId: string | null) => {
    // Clear all other linked IDs
    onFieldChange('linkedBuildingId', null)
    onFieldChange('linkedContractId', null)
    onFieldChange('linkedInterventionId', null)
    // Set lot
    onFieldChange('linkedLotId', lotId)
    onFieldChange('linkedEntityType', lotId ? 'lot' : null)
  }

  const handleContractSelect = (contractId: string | null) => {
    // Clear all other linked IDs
    onFieldChange('linkedBuildingId', null)
    onFieldChange('linkedLotId', null)
    onFieldChange('linkedInterventionId', null)
    // Set contract
    onFieldChange('linkedContractId', contractId)
    onFieldChange('linkedEntityType', contractId ? 'contract' : null)
  }

  const handleInterventionSelect = (interventionId: string | null) => {
    // Clear all other linked IDs
    onFieldChange('linkedBuildingId', null)
    onFieldChange('linkedLotId', null)
    onFieldChange('linkedContractId', null)
    // Set intervention
    onFieldChange('linkedInterventionId', interventionId)
    onFieldChange('linkedEntityType', interventionId ? 'intervention' : null)
  }

  // Handler de changement de tab
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Ne pas clear la sélection au changement de tab
    // L'utilisateur peut naviguer entre tabs et garder sa sélection visible
  }

  // Clear all links
  const handleClearAll = () => {
    onFieldChange('linkedEntityType', null)
    onFieldChange('linkedBuildingId', null)
    onFieldChange('linkedLotId', null)
    onFieldChange('linkedContractId', null)
    onFieldChange('linkedInterventionId', null)
  }

  // Récupérer le nom de l'entité sélectionnée pour l'affichage
  const getSelectedEntityName = (): string | null => {
    if (linkedBuildingId) {
      const building = buildings.find(b => b.id === linkedBuildingId)
      return building?.name || null
    }
    if (linkedLotId) {
      const lot = lots.find(l => l.id === linkedLotId)
      return lot ? `${lot.reference}${lot.building?.name ? ` - ${lot.building.name}` : ''}` : null
    }
    if (linkedContractId) {
      const contract = contracts.find(c => c.id === linkedContractId)
      return contract?.reference || contract?.lot?.reference || 'Contrat sélectionné'
    }
    if (linkedInterventionId) {
      const intervention = interventions.find(i => i.id === linkedInterventionId)
      return intervention?.title || 'Intervention sélectionnée'
    }
    return null
  }

  const selectedEntityName = getSelectedEntityName()
  const hasSelection = !!selectedEntityName

  // Préparer les données pour PropertySelector
  const propertySelectorData = useMemo(() => ({
    buildings: buildings as any[],
    lots: lots as any[],
    teamId: teamId
  }), [buildings, lots, teamId])

  return (
    <div className="space-y-4 pt-4 border-t border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center justify-between w-full p-4 rounded-lg border transition-colors",
              "hover:bg-muted/50",
              isOpen ? "bg-muted/30 border-primary/30" : "border-border",
              hasSelection && !isOpen && "border-primary/50 bg-primary/5"
            )}
          >
            <div className="flex items-center gap-3">
              <Link2 className={cn(
                "h-5 w-5",
                hasSelection ? "text-primary" : "text-muted-foreground"
              )} />
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Lier à une entité</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    Optionnel
                  </Badge>
                </div>
                {hasSelection && !isOpen && (
                  <p className="text-sm text-primary mt-0.5">
                    {selectedEntityName}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-4">
          <div className="space-y-4">
            {/* Tabs pour naviguer entre les types d'entités */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className={cn(
                "grid w-full",
                showBuildingOption ? "grid-cols-4" : "grid-cols-3"
              )}>
                {showBuildingOption && (
                  <TabsTrigger value="building" className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Immeuble</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="lot" className="flex items-center gap-1.5">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Lot</span>
                </TabsTrigger>
                <TabsTrigger value="contract" className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Contrat</span>
                </TabsTrigger>
                <TabsTrigger value="intervention" className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Intervention</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Immeuble */}
              {showBuildingOption && (
                <TabsContent value="building" className="mt-4">
                  <div className="border rounded-lg p-4 bg-muted/10 max-h-[350px] overflow-hidden">
                    <PropertySelector
                      mode="select"
                      showOnlyBuildings
                      initialData={propertySelectorData}
                      onBuildingSelect={handleBuildingSelect}
                      selectedBuildingId={linkedBuildingId || undefined}
                      compactCards
                      showViewToggle={false}
                    />
                  </div>
                </TabsContent>
              )}

              {/* Tab Lot */}
              <TabsContent value="lot" className="mt-4">
                <div className="border rounded-lg p-4 bg-muted/10 max-h-[350px] overflow-hidden">
                  <PropertySelector
                    mode="select"
                    showOnlyLots
                    initialData={propertySelectorData}
                    onLotSelect={handleLotSelect}
                    selectedLotId={linkedLotId || undefined}
                    compactCards
                    showViewToggle={false}
                  />
                </div>
              </TabsContent>

              {/* Tab Contrat */}
              <TabsContent value="contract" className="mt-4">
                <div className="border rounded-lg p-4 bg-muted/10">
                  <ContractMiniSelector
                    contracts={contracts}
                    selectedId={linkedContractId}
                    onSelect={handleContractSelect}
                    loading={loadingContracts}
                  />
                </div>
              </TabsContent>

              {/* Tab Intervention */}
              <TabsContent value="intervention" className="mt-4">
                <div className="border rounded-lg p-4 bg-muted/10">
                  <InterventionMiniSelector
                    interventions={interventions}
                    selectedId={linkedInterventionId}
                    onSelect={handleInterventionSelect}
                    loading={loadingInterventions}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Bouton pour effacer la sélection */}
            {hasSelection && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Retirer la liaison
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export default EntityLinkSection
