"use client"

import React, { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Building,
  Hash,
  FileText,
  Home,
  Car,
  Store,
  MoreHorizontal,
  Users as UsersIcon,
  Tag,
  Layers,
  DoorOpen,
  Zap,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { LotCategory, getLotCategoryConfig, getAllLotCategories, LOT_CATEGORY_SELECTED_STYLES } from "@/lib/lot-types"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBuildingService } from "@/lib/services"
import { AddressFieldsWithMap, type GeocodeResult } from "@/components/google-maps"

/**
 * Component Icon Map for Lot Categories
 */
const iconComponents = {
  Building,
  Users: UsersIcon,
  Home,
  Car,
  Store,
  MoreHorizontal
}

interface BuildingInfo {
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  description: string
  // Champs spécifiques aux lots
  floor?: string
  doorNumber?: string
  category?: LotCategory
  pebRating?: string
  // Google Maps geocoding data
  latitude?: number
  longitude?: number
  placeId?: string
  formattedAddress?: string
}

interface BuildingInfoFormProps {
  buildingInfo: BuildingInfo
  setBuildingInfo: (info: BuildingInfo) => void
  onNameChange?: (name: string) => void // Callback optionnel pour gérer le changement de nom (empêche auto-fill)
  teamManagers: Array<{ user: { id: string; name: string } }>
  userTeam: { id: string; name: string } | null
  isLoading: boolean
  onCreateManager?: () => void
  showManagerSection?: boolean
  showAddressSection?: boolean
  showMapPreview?: boolean // Show Google Map preview when coordinates are available
  entityType?: "immeuble" | "lot"
  showTitle?: boolean
  defaultReference?: string
  buildingsCount?: number // Nombre d'immeubles de l'équipe
  categoryCountsByTeam?: Record<string, number> // Nombre de lots par catégorie dans l'équipe
  buildingId?: string // ID de l'immeuble en mode édition (pour exclure de la vérification d'unicité)
}

export const BuildingInfoForm = ({
  buildingInfo,
  setBuildingInfo,
  onNameChange,
  teamManagers,
  userTeam,
  isLoading,
  onCreateManager,
  showManagerSection = true,
  showAddressSection = true,
  showMapPreview = true,
  entityType = "immeuble",
  showTitle = false,
  categoryCountsByTeam = {},
  buildingId,
}: BuildingInfoFormProps) => {
  const { user } = useAuth()

  // Inline blur validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const isRequiredField = (name: string): boolean => {
    // Name (reference) is always required
    if (name === 'name') return true
    return false
  }

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.currentTarget
    setFieldErrors(prev => {
      const next = { ...prev }
      if (!value?.trim() && isRequiredField(name)) {
        next[name] = 'Ce champ est obligatoire'
      } else {
        delete next[name]
      }
      return next
    })
  }

  const clearFieldError = (name: string) => {
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  // Team-scoped building name uniqueness
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [isDuplicateName, setIsDuplicateName] = useState(false)
  const [duplicateMessage, setDuplicateMessage] = useState("")

  useEffect(() => {
    let cancelled = false
    const teamId = userTeam?.id
    const name = buildingInfo.name?.trim()

    // Reset state when empty or no team
    if (!teamId || !name) {
      setIsDuplicateName(false)
      setDuplicateMessage("")
      return
    }

    setIsCheckingName(true)
    const timeout = setTimeout(async () => {
      try {
        const buildingService = createBuildingService()
        const res = await buildingService.nameExists(name, teamId, buildingId)
        if (cancelled) return
        const exists = !!res?.success && !!res.data
        setIsDuplicateName(exists)
        setDuplicateMessage(
          exists
            ? `Un immeuble avec le nom "${name}" existe déjà dans votre équipe. Choisissez un autre nom.`
            : ""
        )
      } catch {
        if (!cancelled) {
          setIsDuplicateName(false)
          setDuplicateMessage("")
        }
      } finally {
        if (!cancelled) setIsCheckingName(false)
      }
    }, 450)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingInfo.name, userTeam?.id, buildingId])


  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">

      {entityType === "lot" ? (
        // Layout flex sur desktop, référence puis catégorie
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Référence du lot - PREMIER (prend l'espace fixe) */}
          <div className="lg:w-80 lg:flex-shrink-0">
            <Label htmlFor="name" icon={Home} required>
              Référence du lot
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Lot 1, LOT-A-01, etc."
              value={buildingInfo.name || ""}
              onChange={(e) => {
                const newName = e.target.value
                clearFieldError('name')
                // ✅ FIX: Use direct value update instead of functional updater
                setBuildingInfo({ ...buildingInfo, name: newName })
              }}
              onBlur={(e) => {
                handleFieldBlur(e)
                const domValue = e.target.value
                const newName = domValue
                // ✅ FIX: Use direct value update
                if (buildingInfo.name !== newName) {
                  setBuildingInfo({ ...buildingInfo, name: newName })
                }
              }}
              className={`mt-1 h-10 sm:h-11 ${isDuplicateName || fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              aria-invalid={!!(isDuplicateName || fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'name-error' : isDuplicateName ? 'name-duplicate' : undefined}
              required
            />
            {fieldErrors.name && (
              <p id="name-error" className="text-sm text-destructive mt-1">{fieldErrors.name}</p>
            )}
            {isDuplicateName && (
              <p id="name-duplicate" className="text-xs text-red-600 mt-1" role="alert">{duplicateMessage}</p>
            )}
          </div>

          {/* Catégorie du lot - SECOND (plus large sur desktop) */}
          <div className="lg:flex-1 lg:max-w-2xl min-w-0">
            <Label icon={Tag} required className="mb-2">
              Catégorie du lot
            </Label>

            {/* Chips wrap (responsive sur toutes tailles d'écran) */}
            <RadioGroup
              value={buildingInfo.category || "appartement"}
              onValueChange={(category) => {
                const updatedBuildingInfo = { ...buildingInfo, category: category as LotCategory }

                // Si le nom actuel suit le pattern d'auto-génération, le régénérer avec la nouvelle catégorie
                const currentName = buildingInfo.name?.trim()
                if (currentName) {
                  const categoryLabels = ['Appartement', 'Colocation', 'Maison', 'Garage', 'Local commercial', 'Parking', 'Autre']
                  const hasAutoGeneratedPattern = categoryLabels.some(label =>
                    currentName.match(new RegExp(`^${label}\\s+\\d+$`))
                  )

                  if (hasAutoGeneratedPattern) {
                    const categoryConfig = getLotCategoryConfig(category as LotCategory)
                    const currentCategoryCount = categoryCountsByTeam[category] || 0
                    const nextNumber = currentCategoryCount + 1
                    updatedBuildingInfo.name = `${categoryConfig.label} ${nextNumber}`
                  }
                }

                setBuildingInfo(updatedBuildingInfo)
              }}
              className="flex gap-2 flex-wrap"
              aria-label="Sélectionner une catégorie de lot"
            >
              {getAllLotCategories().map((category) => {
                const Icon = iconComponents[category.icon as keyof typeof iconComponents]
                const isSelected = (buildingInfo.category || "appartement") === category.key
                const selectedStyles = LOT_CATEGORY_SELECTED_STYLES[category.key as LotCategory]

                return (
                  <label
                    key={category.key}
                    className="cursor-pointer"
                  >
                    <RadioGroupItem
                      value={category.key}
                      className="sr-only"
                      id={`category-${category.key}`}
                    />
                    <div
                      className={`
                        flex items-center gap-1.5 px-3 py-2 rounded-full border-2 transition-all duration-200
                        ${
                          isSelected
                            ? `${selectedStyles.bg} ${selectedStyles.border} ${selectedStyles.text} shadow-sm font-medium`
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }
                      `}
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={category.label}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          const updatedBuildingInfo = { ...buildingInfo, category: category.key }

                          const currentName = buildingInfo.name?.trim()
                          if (currentName) {
                            const categoryLabels = ['Appartement', 'Colocation', 'Maison', 'Garage', 'Local commercial', 'Parking', 'Autre']
                            const hasAutoGeneratedPattern = categoryLabels.some(label =>
                              currentName.match(new RegExp(`^${label}\\s+\\d+$`))
                            )

                            if (hasAutoGeneratedPattern) {
                              const categoryConfig = getLotCategoryConfig(category.key)
                              const currentCategoryCount = categoryCountsByTeam[category.key] || 0
                              const nextNumber = currentCategoryCount + 1
                              updatedBuildingInfo.name = `${categoryConfig.label} ${nextNumber}`
                            }
                          }

                          setBuildingInfo(updatedBuildingInfo)
                        }
                      }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs whitespace-nowrap">
                        {category.label}
                      </span>
                    </div>
                  </label>
                )
              })}
            </RadioGroup>
          </div>
        </div>
      ) : (
        // Référence de l'immeuble - Pleine largeur
        <div>
          <Label htmlFor="name" icon={Building} required>
            Référence de l'immeuble
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="Ex: Résidence des Champs-Élysées, Immeuble 1"
            value={buildingInfo.name || ""}
            onChange={(e) => {
              const newName = e.target.value
              clearFieldError('name')
              // Si onNameChange est fourni (immeuble avec contrôle auto-fill), l'utiliser
              if (onNameChange) {
                onNameChange(newName)
              } else {
                // ✅ FIX: Use direct value update
                setBuildingInfo({ ...buildingInfo, name: newName })
              }
            }}
            onBlur={(e) => {
              handleFieldBlur(e)
              const domValue = e.target.value
              const newName = domValue
              // Si onNameChange est fourni (immeuble avec contrôle auto-fill), l'utiliser
              if (onNameChange) {
                if (buildingInfo.name !== newName) {
                  onNameChange(newName)
                }
              } else {
                // ✅ FIX: Use direct value update
                if (buildingInfo.name !== newName) {
                  setBuildingInfo({ ...buildingInfo, name: newName })
                }
              }
            }}
            className={`mt-1 h-10 sm:h-11 ${isDuplicateName || fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            aria-invalid={!!(isDuplicateName || fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'name-error' : isDuplicateName ? 'name-duplicate' : undefined}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Référence unique pour identifier facilement votre immeuble (requis)
          </p>
          {fieldErrors.name && (
            <p id="name-error" className="text-sm text-destructive mt-1">{fieldErrors.name}</p>
          )}
          {isDuplicateName && (
            <p id="name-duplicate" className="text-xs text-red-600 mt-1" role="alert">{duplicateMessage}</p>
          )}
        </div>
      )}



      {showAddressSection && (
        <AddressFieldsWithMap
          street={buildingInfo.address || ""}
          postalCode={buildingInfo.postalCode || ""}
          city={buildingInfo.city || ""}
          country={buildingInfo.country || ""}
          latitude={buildingInfo.latitude}
          longitude={buildingInfo.longitude}
          onFieldsChange={(fields) => {
            // This is called for manual field edits only (not autocomplete)
            // For autocomplete, onGeocodeResult handles the atomic update
            setBuildingInfo({
              ...buildingInfo,
              address: fields.street,
              postalCode: fields.postalCode,
              city: fields.city,
              country: fields.country
            })
          }}
          onGeocodeResult={(result: GeocodeResult | null) => {
            if (result) {
              // FIX: Use result.fields if available for ATOMIC update
              // This avoids stale closure issues when both callbacks fire
              if (result.fields) {
                setBuildingInfo({
                  ...buildingInfo,
                  // Address fields from result.fields (not stale!)
                  address: result.fields.street,
                  postalCode: result.fields.postalCode,
                  city: result.fields.city,
                  country: result.fields.country,
                  // Geocode data
                  latitude: result.latitude,
                  longitude: result.longitude,
                  placeId: result.placeId,
                  formattedAddress: result.formattedAddress
                })
              } else {
                // Manual geocoding (no fields) - just update coords
                setBuildingInfo({
                  ...buildingInfo,
                  latitude: result.latitude,
                  longitude: result.longitude,
                  placeId: result.placeId,
                  formattedAddress: result.formattedAddress
                })
              }
            }
          }}
          showAutocomplete={true}
          showMap={showMapPreview}
          required={true}
        />
      )}

      {entityType === "lot" && (
        // Champs spécifiques aux lots (étage et numéro de porte)
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 min-w-0">
            <div className="min-w-0">
              <Label htmlFor="floor" icon={Layers}>
                Étage <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Input
                id="floor"
                name="floor"
                placeholder="0"
                value={buildingInfo.floor || ""}
                onChange={(e) => setBuildingInfo({ ...buildingInfo, floor: e.target.value })}
                onBlur={handleFieldBlur}
                className="mt-1 h-10 sm:h-11"
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="doorNumber" icon={DoorOpen}>
                Porte/Boîte <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Input
                id="doorNumber"
                name="doorNumber"
                placeholder="A, 101, etc."
                value={buildingInfo.doorNumber || ""}
                onChange={(e) => setBuildingInfo({ ...buildingInfo, doorNumber: e.target.value })}
                onBlur={handleFieldBlur}
                className="mt-1 h-10 sm:h-11"
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="pebRating" icon={Zap}>
                Certificat PEB/EPC <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Select
                value={buildingInfo.pebRating || ""}
                onValueChange={(value) => setBuildingInfo({ ...buildingInfo, pebRating: value === "none" ? undefined : value })}
              >
                <SelectTrigger id="pebRating" className="mt-1 h-10 sm:h-11">
                  <SelectValue placeholder="Non renseign&eacute;" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non renseign&eacute;</SelectItem>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                  <SelectItem value="E">E</SelectItem>
                  <SelectItem value="F">F</SelectItem>
                  <SelectItem value="G">G</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
      )}

      <div>
        <Label htmlFor="description" icon={FileText}>
          Commentaire <span className="text-muted-foreground font-normal">(optionnel)</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder={`Ajoutez un commentaire sur votre ${entityType}...`}
          value={buildingInfo.description || ""}
          onChange={(e) => setBuildingInfo({ ...buildingInfo, description: e.target.value })}
          onBlur={handleFieldBlur}
          className="mt-1 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
        />
      </div>
    </div>
  )
}
