"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Building,
  MapPin,
  Calendar,
  Hash,
  FileText,
  User,
  Users,
  AlertTriangle,
  Loader2,
  Home,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

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
  constructionYear: string
  floors: string
  description: string
  // Champs spécifiques aux lots
  floor?: string
  doorNumber?: string
  surface?: string
}

interface BuildingInfoFormProps {
  buildingInfo: BuildingInfo
  setBuildingInfo: (info: BuildingInfo) => void
  selectedManagerId: string
  setSelectedManagerId: (id: string) => void
  teamManagers: any[]
  userTeam: any | null
  isLoading: boolean
  onCreateManager?: () => void
  showManagerSection?: boolean
  showAddressSection?: boolean
  entityType?: "bâtiment" | "lot"
  showTitle?: boolean
  defaultReference?: string
}

export const BuildingInfoForm = ({
  buildingInfo,
  setBuildingInfo,
  selectedManagerId,
  setSelectedManagerId,
  teamManagers,
  userTeam,
  isLoading,
  onCreateManager,
  showManagerSection = true,
  showAddressSection = true,
  entityType = "bâtiment",
  showTitle = false,
  defaultReference = "",
}: BuildingInfoFormProps) => {
  const { user } = useAuth()

  return (
    <div className="space-y-6 sm:space-y-8">
      {showTitle && (
        <div className="border-b border-gray-200 pb-4 sm:pb-6 mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
            {entityType === "lot" ? <Home className="h-5 w-5 sm:h-6 sm:w-6" /> : <Building className="h-5 w-5 sm:h-6 sm:w-6" />}
            Détails du {entityType}
          </h3>
        </div>
      )}

{showManagerSection && (
        <div>
          <Label htmlFor="manager" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <User className="w-4 h-4" />
            Responsable du {entityType}
          </Label>
          
          {!isLoading && teamManagers.length > 0 && userTeam ? (
            <>
              <Select value={selectedManagerId} onValueChange={(value) => {
                if (value === "create-new" && onCreateManager) {
                  onCreateManager()
                } else {
                  setSelectedManagerId(value)
                }
              }}>
                <SelectTrigger className="mt-1 h-10 sm:h-11">
                  <SelectValue placeholder="Sélectionnez un responsable" />
                </SelectTrigger>
                <SelectContent>
                  {teamManagers.map((member: any) => (
                    <SelectItem key={member.user.id} value={member.user.id}>
                      <div className="flex items-center gap-2">
                        <span>{member.user.name}</span>
                        {member.user.id === user?.id && (
                          <Badge variant="secondary" className="text-xs">Vous</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  {onCreateManager && (
                    <SelectItem value="create-new" className="border-t mt-1 pt-2">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Users className="w-4 h-4" />
                        <span>Créer un nouveau gestionnaire</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Ce gestionnaire recevra des notifications personnelles pour tout élément conernant ce {entityType}.
              </p>
            </>
          ) : (
            <div className="mt-1 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  {isLoading 
                    ? 'Chargement des gestionnaires de votre équipe...'
                    : teamManagers.length === 0 
                      ? 'Aucun gestionnaire trouvé dans votre équipe'
                      : 'Impossible de charger les gestionnaires'
                  }
                </span>
              </p>
              <p className="text-xs text-amber-600 mt-2 pl-6">
                {isLoading
                  ? 'Veuillez patienter...'
                  : teamManagers.length === 0 
                    ? 'Contactez l\'administrateur pour ajouter des gestionnaires à votre équipe.'
                    : 'Contactez l\'administrateur pour résoudre ce problème.'
                }
              </p>
            </div>
          )}
        </div>
      )}
      <div>
        <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Building className="w-4 h-4" />
          {entityType === "lot" ? "Référence du lot" : "Nom du bâtiment"} 
          {entityType === "lot" ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-gray-400">(optionnel)</span>
          )}
        </Label>
        <Input
          id="name"
          placeholder={entityType === "lot" ? "Lot001, LOT-A-01, etc." : "Ex: Résidence des Champs-Élysées"}
          value={buildingInfo.name || (entityType === "lot" && defaultReference && !buildingInfo.name ? defaultReference : "")}
          onChange={(e) => setBuildingInfo({ ...buildingInfo, name: e.target.value })}
          className="mt-1 h-10 sm:h-11"
          required={entityType === "lot"}
        />
        <p className="text-xs text-gray-500 mt-1">
          {entityType === "lot" 
            ? "Référence unique pour identifier ce lot (requis)"
            : "Donnez un nom distinctif à votre bâtiment pour l'identifier facilement"
          }
        </p>
      </div>

      

      {showAddressSection && (
        <>
          <div>
            <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MapPin className="w-4 h-4" />
              Rue et numéro*
            </Label>
            <Input
              id="address"
              placeholder="123 Rue de la Paix"
              value={buildingInfo.address}
              onChange={(e) => setBuildingInfo({ ...buildingInfo, address: e.target.value })}
              className="mt-1 h-10 sm:h-11"
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
                placeholder="1000"
                value={buildingInfo.postalCode}
                onChange={(e) => setBuildingInfo({ ...buildingInfo, postalCode: e.target.value })}
                className="mt-1 h-10 sm:h-11"
              />
            </div>
            <div>
              <Label htmlFor="city" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="w-4 h-4" />
                Ville*
              </Label>
              <Input
                id="city"
                placeholder="Bruxelles"
                value={buildingInfo.city}
                onChange={(e) => setBuildingInfo({ ...buildingInfo, city: e.target.value })}
                className="mt-1 h-10 sm:h-11"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="country" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="w-4 h-4" />
                Pays*
              </Label>
              <Select 
                value={buildingInfo.country} 
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

      {entityType === "bâtiment" ? (
        // Champs spécifiques aux bâtiments
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <Label
              htmlFor="constructionYear"
              className="flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <Calendar className="w-4 h-4" />
              Année de construction
            </Label>
            <Input
              id="constructionYear"
              placeholder="2010"
              value={buildingInfo.constructionYear}
              onChange={(e) => setBuildingInfo({ ...buildingInfo, constructionYear: e.target.value })}
              className="mt-1 h-10 sm:h-11"
            />
          </div>
          <div>
            <Label htmlFor="floors" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building className="w-4 h-4" />
              Nombre d'étages
            </Label>
            <Input
              id="floors"
              placeholder="4"
              value={buildingInfo.floors}
              onChange={(e) => setBuildingInfo({ ...buildingInfo, floors: e.target.value })}
              className="mt-1 h-10 sm:h-11"
            />
          </div>
        </div>
      ) : (
        // Champs spécifiques aux lots
        <div className="space-y-4 sm:space-y-6">
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
          <div>
            <Label htmlFor="surface" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Hash className="w-4 h-4" />
              Surface (m²)
            </Label>
            <Input
              id="surface"
              placeholder="45"
              value={buildingInfo.surface || ""}
              onChange={(e) => setBuildingInfo({ ...buildingInfo, surface: e.target.value })}
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
          value={buildingInfo.description}
          onChange={(e) => setBuildingInfo({ ...buildingInfo, description: e.target.value })}
          className="mt-1 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
        />
        <p className="text-xs text-gray-500 mt-1">
          Décrivez votre {entityType} : commodités, particularités, état général...
        </p>
      </div>
    </div>
  )
}
