'use client'

/**
 * EntityLinkSection - Section de liaison d'entité dans la création de contact
 *
 * Permet de lier un nouveau contact directement à :
 * - Un bien (immeuble ou lot via PropertySelector avec tabs internes)
 *   - Locataires : pas de bien (uniquement contrat - bail locatif)
 *   - Autres : immeubles et lots
 * - Un contrat (pas pour les prestataires - contrat = bail locatif)
 * - Un contrat fournisseur (prestataires uniquement)
 *
 * Règles métier de filtrage :
 * | Type Contact   | Building | Lot | Contract | Supplier Contract |
 * |----------------|----------|-----|----------|-------------------|
 * | gestionnaire   |    ✅    | ✅  |    ❌    |        ❌         |
 * | locataire      |    ❌    | ❌  |    ✅    |        ❌         |
 * | prestataire    |    ✅    | ✅  |    ❌    |        ✅         |
 * | autre          |    ✅    | ✅  |    ✅    |        ❌         |
 *
 * Architecture (v4 - 2026-03):
 * - 2-3 Tabs depending on contact type
 * - Tab "Bien": PropertySelector complet avec tabs internes (Immeubles/Lots)
 * - Tab "Contrat": ContractMiniSelector pour les bails
 * - Tab "Contrats fournisseur": SupplierContractMiniSelector (prestataires only)
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
  FileText,
  X,
  Briefcase
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PropertySelector from '@/components/property-selector'
import ContractMiniSelector from './contract-mini-selector'
import SupplierContractMiniSelector from './supplier-contract-mini-selector'

// Types
interface Lot {
  id: string
  reference: string
  building_id: string
  category?: string | null
  is_occupied?: boolean
  status?: 'occupied' | 'vacant'
  building?: {
    id: string
    name: string
    address?: string | null
  } | null
}

interface Building {
  id: string
  name: string
  address?: string | null
  lots?: Lot[]  // ✅ Ajouté pour afficher les lots dans le dropdown du PropertySelector
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

interface SupplierContractDTO {
  id: string
  reference: string | null
  supplier: {
    name: string | null
    company: string | null
  } | null
  building: {
    id: string
    name: string
  } | null
  lot: {
    id: string
    reference: string
  } | null
  status: string | null
  end_date: string | null
}

type EntityType = 'building' | 'lot' | 'contract' | 'supplier_contract' | null
type TabType = 'property' | 'contract' | 'supplier_contract'

interface EntityLinkSectionProps {
  contactType: string
  teamId: string
  linkedEntityType: EntityType
  linkedBuildingId: string | null
  linkedLotId: string | null
  linkedContractId: string | null
  linkedSupplierContractId: string | null
  onFieldChange: (field: string, value: string | null) => void
  // Données pré-chargées côté serveur
  buildings: Building[]
  lots: Lot[]
}

export function EntityLinkSection({
  contactType,
  teamId,
  linkedEntityType,
  linkedBuildingId,
  linkedLotId,
  linkedContractId,
  linkedSupplierContractId,
  onFieldChange,
  buildings,
  lots
}: EntityLinkSectionProps) {
  // Filtrer les options disponibles selon le type de contact
  const isLocataire = contactType === 'locataire'
  const isPrestataire = contactType === 'prestataire'
  const isGestionnaire = contactType === 'gestionnaire'
  const showPropertyOption = !isLocataire
  const showContractOption = !isPrestataire && !isGestionnaire
  const showSupplierContractOption = isPrestataire

  // Dynamic title based on contact type
  const sectionTitle = isLocataire ? 'Lier à un bail' : 'Lier à une entité'

  const [isOpen, setIsOpen] = useState(false)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [supplierContracts, setSupplierContracts] = useState<SupplierContractDTO[]>([])
  const [loadingSupplierContracts, setLoadingSupplierContracts] = useState(false)

  // Default tab based on contact type
  const getDefaultTab = (): TabType => {
    if (isLocataire) return 'contract'
    return 'property'
  }
  const [activeTab, setActiveTab] = useState<TabType>(getDefaultTab)

  // Calculer le nombre de tabs visibles pour adapter la grille
  const visibleTabsCount = [
    showPropertyOption,
    showContractOption,
    showSupplierContractOption
  ].filter(Boolean).length

  // Définir le tab par défaut basé sur l'entité liée
  useEffect(() => {
    if (linkedEntityType) {
      if (linkedEntityType === 'building' || linkedEntityType === 'lot') {
        setActiveTab('property')
      } else if (linkedEntityType === 'contract' && !showContractOption) {
        setActiveTab('property')
      } else if (linkedEntityType === 'contract') {
        setActiveTab('contract')
      } else if (linkedEntityType === 'supplier_contract') {
        setActiveTab('supplier_contract')
      }
    }
  }, [linkedEntityType, showContractOption])

  // Charger les contrats quand on switch sur le tab "contract"
  useEffect(() => {
    if (activeTab === 'contract' && contracts.length === 0 && !loadingContracts) {
      fetchContracts()
    }
  }, [activeTab])

  // Charger les contrats fournisseur quand on switch sur le tab "supplier_contract"
  useEffect(() => {
    if (activeTab === 'supplier_contract' && supplierContracts.length === 0 && !loadingSupplierContracts) {
      fetchSupplierContracts()
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

  const fetchSupplierContracts = async () => {
    setLoadingSupplierContracts(true)
    try {
      const response = await fetch(`/api/supplier-contracts/list?teamId=${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setSupplierContracts(data.supplierContracts || [])
      }
    } catch (error) {
      console.error('Error fetching supplier contracts:', error)
    } finally {
      setLoadingSupplierContracts(false)
    }
  }

  // Handlers de sélection - clear autres + set nouvelle valeur
  const handleBuildingSelect = (buildingId: string | null) => {
    onFieldChange('linkedLotId', null)
    onFieldChange('linkedContractId', null)
    onFieldChange('linkedSupplierContractId', null)
    onFieldChange('linkedBuildingId', buildingId)
    onFieldChange('linkedEntityType', buildingId ? 'building' : null)
  }

  const handleLotSelect = (lotId: string | null) => {
    onFieldChange('linkedBuildingId', null)
    onFieldChange('linkedContractId', null)
    onFieldChange('linkedSupplierContractId', null)
    onFieldChange('linkedLotId', lotId)
    onFieldChange('linkedEntityType', lotId ? 'lot' : null)
  }

  const handleContractSelect = (contractId: string | null) => {
    onFieldChange('linkedBuildingId', null)
    onFieldChange('linkedLotId', null)
    onFieldChange('linkedSupplierContractId', null)
    onFieldChange('linkedContractId', contractId)
    onFieldChange('linkedEntityType', contractId ? 'contract' : null)
  }

  const handleSupplierContractSelect = (supplierContractId: string | null) => {
    onFieldChange('linkedBuildingId', null)
    onFieldChange('linkedLotId', null)
    onFieldChange('linkedContractId', null)
    onFieldChange('linkedSupplierContractId', supplierContractId)
    onFieldChange('linkedEntityType', supplierContractId ? 'supplier_contract' : null)
  }

  // Handler de changement de tab
  const handleTabChange = (value: string) => {
    setActiveTab(value as TabType)
  }

  // Clear all links
  const handleClearAll = () => {
    onFieldChange('linkedEntityType', null)
    onFieldChange('linkedBuildingId', null)
    onFieldChange('linkedLotId', null)
    onFieldChange('linkedContractId', null)
    onFieldChange('linkedSupplierContractId', null)
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
    if (linkedSupplierContractId) {
      const sc = supplierContracts.find(c => c.id === linkedSupplierContractId)
      return sc?.reference || 'Contrat fournisseur sélectionné'
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
                  <span className="font-medium">{sectionTitle}</span>
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
                visibleTabsCount === 3 && "grid-cols-3",
                visibleTabsCount === 2 && "grid-cols-2",
                visibleTabsCount === 1 && "grid-cols-1"
              )}>
                {showPropertyOption && (
                  <TabsTrigger value="property" className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Bien</span>
                  </TabsTrigger>
                )}
                {showContractOption && (
                  <TabsTrigger value="contract" className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Contrat</span>
                  </TabsTrigger>
                )}
                {showSupplierContractOption && (
                  <TabsTrigger value="supplier_contract" className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    <span className="hidden sm:inline">Contrats fournisseur</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Tab Bien - PropertySelector complet avec tabs internes Immeubles/Lots */}
              {showPropertyOption && (
                <TabsContent value="property" className="mt-4">
                  <PropertySelector
                    mode="select"
                    initialData={propertySelectorData}
                    onBuildingSelect={handleBuildingSelect}
                    onLotSelect={handleLotSelect}
                    selectedBuildingId={linkedBuildingId || undefined}
                    selectedLotId={linkedLotId || undefined}
                    compactCards={false}
                    showViewToggle={true}
                  />
                </TabsContent>
              )}

              {/* Tab Contrat (non disponible pour les prestataires) */}
              {showContractOption && (
                <TabsContent value="contract" className="mt-4">
                  <ContractMiniSelector
                    contracts={contracts}
                    selectedId={linkedContractId}
                    onSelect={handleContractSelect}
                    loading={loadingContracts}
                  />
                </TabsContent>
              )}

              {/* Tab Contrats fournisseur (prestataires uniquement) */}
              {showSupplierContractOption && (
                <TabsContent value="supplier_contract" className="mt-4">
                  <SupplierContractMiniSelector
                    contracts={supplierContracts}
                    selectedId={linkedSupplierContractId}
                    onSelect={handleSupplierContractSelect}
                    loading={loadingSupplierContracts}
                  />
                </TabsContent>
              )}
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
