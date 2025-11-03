"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Building,
  MapPin,
  Calendar,
  Hash,
  FileText,
  User,
  Users as UsersIcon,
  AlertTriangle,
  Home,
  Car,
  Store,
  MoreHorizontal,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { LotCategory, getLotCategoryConfig, getAllLotCategories } from "@/lib/lot-types"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createBuildingService } from "@/lib/services"

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

const countries = [
  "Belgique",
  "France",
  "Luxembourg",
  "Pays-Bas",
  "Allemagne",
  "Espagne",
  "Italie",
  "Portugal",
  "Royaume-Uni",
  "Suisse",
  "Autriche",
  "République tchèque",
  "Pologne",
  "Danemark",
  "Suède",
  "Norvège",
  "Finlande",
  "Autre"
]

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
  entityType = "immeuble",
  showTitle = false,
  categoryCountsByTeam = {},
  buildingId,
}: BuildingInfoFormProps) => {
  const { user } = useAuth()

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
    <div className="space-y-6 sm:space-y-8">

      {entityType === "lot" ? (
        // Layout flex sur desktop, référence puis catégorie
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Référence du lot - PREMIER (prend l'espace fixe) */}
          <div className="lg:w-80 lg:flex-shrink-0">
            <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Home className="w-4 h-4" />
              Référence du lot
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Lot 1, LOT-A-01, etc."
              value={buildingInfo.name || ""}
              onChange={(e) => {
                const newName = e.target.value
                // ✅ FIX: Use direct value update instead of functional updater
                setBuildingInfo({ ...buildingInfo, name: newName })
              }}
              onBlur={(e) => {
                const domValue = e.target.value
                const newName = domValue
                // ✅ FIX: Use direct value update
                if (buildingInfo.name !== newName) {
                  setBuildingInfo({ ...buildingInfo, name: newName })
                }
              }}
              className={`mt-1 h-10 sm:h-11 ${isDuplicateName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              aria-invalid={isDuplicateName}
              required
            />
            {isDuplicateName && (
              <p className="text-xs text-red-600 mt-1" role="alert">{duplicateMessage}</p>
            )}
          </div>

          {/* Catégorie du lot - SECOND (plus large sur desktop) */}
          <div className="lg:flex-1 lg:max-w-2xl">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Catégorie du lot
              <span className="text-red-500 ml-1">*</span>
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
                            ? `${category.bgColor} ${category.borderColor} ${category.color} shadow-sm font-medium`
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
          <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Building className="w-4 h-4" />
            Référence de l'immeuble
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="Ex: Résidence des Champs-Élysées, Immeuble 1"
            value={buildingInfo.name || ""}
            onChange={(e) => {
              const newName = e.target.value
              // Si onNameChange est fourni (immeuble avec contrôle auto-fill), l'utiliser
              if (onNameChange) {
                onNameChange(newName)
              } else {
                // ✅ FIX: Use direct value update
                setBuildingInfo({ ...buildingInfo, name: newName })
              }
            }}
            onBlur={(e) => {
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
            className={`mt-1 h-10 sm:h-11 ${isDuplicateName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            aria-invalid={isDuplicateName}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Référence unique pour identifier facilement votre immeuble (requis)
          </p>
          {isDuplicateName && (
            <p className="text-xs text-red-600 mt-1" role="alert">{duplicateMessage}</p>
          )}
        </div>
      )}



      {showAddressSection && (
        <>
          <div>
            <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MapPin className="w-4 h-4" />
              Rue et numéro*
            </Label>
            <Input
              id="address"
              name="address"
              placeholder="Rue de la Paix 123"
              value={buildingInfo.address || ""}
              onChange={(e) => setBuildingInfo({ ...buildingInfo, address: e.target.value })}
              onBlur={(e) => {
                const domValue = e.target.value
                if (buildingInfo.address !== domValue) {
                  setBuildingInfo({ ...buildingInfo, address: domValue })
                }
              }}
              className="mt-1 h-10 sm:h-11"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="postalCode" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Hash className="w-4 h-4" />
                Code postal*
              </Label>
              <Input
                id="postalCode"
                name="postalCode"
                placeholder="1000"
                value={buildingInfo.postalCode || ""}
                onChange={(e) => setBuildingInfo({ ...buildingInfo, postalCode: e.target.value })}
                onBlur={(e) => {
                  const domValue = e.target.value
                  if (buildingInfo.postalCode !== domValue) {
                    setBuildingInfo({ ...buildingInfo, postalCode: domValue })
                  }
                }}
                className="mt-1 h-10 sm:h-11"
                required
              />
            </div>
            <div>
              <Label htmlFor="city" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="w-4 h-4" />
                Ville*
              </Label>
              <Input
                id="city"
                name="city"
                placeholder="Bruxelles"
                value={buildingInfo.city || ""}
                onChange={(e) => setBuildingInfo({ ...buildingInfo, city: e.target.value })}
                onBlur={(e) => {
                  const domValue = e.target.value
                  if (buildingInfo.city !== domValue) {
                    setBuildingInfo({ ...buildingInfo, city: domValue })
                  }
                }}
                className="mt-1 h-10 sm:h-11"
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="country" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="w-4 h-4" />
                Pays*
              </Label>
              <Select
                value={buildingInfo.country || ""}
                onValueChange={(value) => setBuildingInfo({ ...buildingInfo, country: value })}
              >
                <SelectTrigger className="w-full h-10 sm:h-11">
                  <SelectValue placeholder="Sélectionnez un pays" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {entityType === "lot" && (
        // Champs spécifiques aux lots (étage et numéro de porte)
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="floor" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Building className="w-4 h-4" />
                Étage
              </Label>
              <Input
                id="floor"
                placeholder="0"
                value={buildingInfo.floor || ""}
                onChange={(e) => setBuildingInfo({ ...buildingInfo, floor: e.target.value })}
                className="mt-1 h-10 sm:h-11"
              />
            </div>
            <div>
              <Label htmlFor="doorNumber" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Hash className="w-4 h-4" />
                Numéro de porte/boîte
              </Label>
              <Input
                id="doorNumber"
                placeholder="A, 101, etc."
                value={buildingInfo.doorNumber || ""}
                onChange={(e) => setBuildingInfo({ ...buildingInfo, doorNumber: e.target.value })}
                className="mt-1 h-10 sm:h-11"
              />
            </div>
          </div>
      )}

      <div>
        <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <FileText className="w-4 h-4" />
          Description <span className="text-gray-400">(optionnel)</span>
        </Label>
        <Textarea
          id="description"
          placeholder={`Ajoutez des informations supplémentaires sur votre ${entityType}...`}
          value={buildingInfo.description || ""}
          onChange={(e) => setBuildingInfo({ ...buildingInfo, description: e.target.value })}
          className="mt-1 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
        />
      </div>
    </div>
  )
}
