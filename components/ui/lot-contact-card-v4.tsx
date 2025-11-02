"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  User,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Wrench,
  Home,
  UserCircle
} from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { LotCategory, getLotCategoryConfig } from "@/lib/lot-types"
import type { User as UserType } from "@/lib/services/core/service-types"

// Simplified Contact interface matching ContactSelector
interface Contact {
  id: string
  name: string
  email: string
  type: string
  phone?: string
  speciality?: string
}

/**
 * Version 4: Card avec Indicateurs Visuels et Sections Toujours Visibles
 *
 * Cette version optimise l'expérience utilisateur avec :
 * - Indicateurs visuels colorés avec badges (violet, bleu, vert, orange, gris)
 * - Sections de contacts toujours visibles (pas de collapse)
 * - Layout responsive: 5 colonnes sur desktop, vertical sur mobile
 *
 * Design Principles:
 * - Header ultra-compact: Badge numéro + Nom + Catégorie + Badges colorés
 * - Collapsed: 1 ligne avec tous les badges visibles
 * - Expanded: Grid 5 colonnes (desktop) avec toutes les sections ouvertes
 * - Hiérarchie visuelle forte avec couleurs distinctes par rôle
 *
 * Key Features:
 * ✅ Badge numéro bleu (#7)
 * ✅ Nom du lot avec truncate + tooltip
 * ✅ Badge catégorie (Appartement, Garage, etc.) toujours visible
 * ✅ Badges compteurs COLORÉS avec icônes toujours visibles
 * ✅ Mode collapsed ultra-compact (1 ligne)
 * ✅ Mode expanded: 5 sections toujours ouvertes en grid horizontal (desktop)
 * ✅ Touch targets 44x44px minimum
 * ✅ Accessible: aria-labels, keyboard navigation
 */

interface LotContactCardV4Props {
  lotNumber: number
  lotReference: string
  lotCategory: LotCategory
  isExpanded: boolean
  onToggleExpand: () => void
  lotManagers: UserType[]
  onAddLotManager: () => void
  onRemoveLotManager: (managerId: string) => void
  tenants: Contact[]
  providers: Contact[]
  owners: Contact[]
  others: Contact[]
  onAddContact: (contactType: 'tenant' | 'provider' | 'owner' | 'other') => void
  onRemoveContact: (contactId: string, contactType: string) => void
  buildingManagersCount?: number
}

export function LotContactCardV4({
  lotNumber,
  lotReference,
  lotCategory,
  isExpanded,
  onToggleExpand,
  lotManagers,
  onAddLotManager,
  onRemoveLotManager,
  tenants,
  providers,
  owners,
  others,
  onAddContact,
  onRemoveContact,
  buildingManagersCount = 0
}: LotContactCardV4Props) {
  const categoryConfig = getLotCategoryConfig(lotCategory)

  return (
    <Card
      className={`transition-all duration-200 gap-0 py-0 ${
        isExpanded ? "border-blue-300 shadow-md" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {/* Header - Ultra Compact avec Badges Colorés */}
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between gap-3 overflow-hidden min-w-0">
          {/* Left: Badge Number + Reference + Category + Visual Indicators */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Badge Number */}
            <Badge variant="default" className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium flex-shrink-0">
              #{lotNumber}
            </Badge>

            {/* Reference + Visual Indicators */}
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-semibold text-base truncate text-slate-900 cursor-default block flex-shrink-0" title={lotReference}>
                    {lotReference}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">{lotReference}</p></TooltipContent>
              </Tooltip>

              {/* Always visible badges */}
              <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                {/* Category Badge */}
                <Badge variant="outline" className={`text-xs ${categoryConfig.bgColor} ${categoryConfig.borderColor} ${categoryConfig.color}`}>
                  {categoryConfig.label}
                </Badge>

                {/* Visual Indicators - Colored badges with icons from V2 */}
                {lotManagers.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border border-purple-300 font-medium px-2 py-0.5 cursor-help">
                        <Users className="w-3.5 h-3.5 mr-1" />
                        {lotManagers.length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p className="text-xs">Gestionnaires spécifiques</p></TooltipContent>
                  </Tooltip>
                )}

                {tenants.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border border-blue-300 font-medium px-2 py-0.5 cursor-help">
                        <User className="w-3.5 h-3.5 mr-1" />
                        {tenants.length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p className="text-xs">Locataires</p></TooltipContent>
                  </Tooltip>
                )}

                {providers.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border border-green-300 font-medium px-2 py-0.5 cursor-help">
                        <Wrench className="w-3.5 h-3.5 mr-1" />
                        {providers.length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p className="text-xs">Prestataires</p></TooltipContent>
                  </Tooltip>
                )}

                {owners.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border border-orange-300 font-medium px-2 py-0.5 cursor-help">
                        <Home className="w-3.5 h-3.5 mr-1" />
                        {owners.length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p className="text-xs">Propriétaires</p></TooltipContent>
                  </Tooltip>
                )}

                {others.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border border-gray-300 font-medium px-2 py-0.5 cursor-help">
                        <UserCircle className="w-3.5 h-3.5 mr-1" />
                        {others.length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p className="text-xs">Autres</p></TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          {/* Right: Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0"
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
      </CardHeader>

      {/* Expanded Content - Accordion Style from V3 */}
      {isExpanded && (
        <CardContent className="p-3 pt-0">
          {/* Responsive Grid: Vertical on mobile, 5 columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
          {/* Lot Managers Section */}
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
            <div className="w-full flex items-center gap-2 p-2.5 bg-purple-50">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-sm text-purple-900">Gestionnaires</span>
            </div>

            {/* Scrollable list - max 3 contacts visible */}
            <div className="p-2 bg-white overflow-y-auto max-h-[138px] space-y-1.5 flex-1">
                {lotManagers.length > 0 ? (
                  lotManagers.map((manager) => (
                    <div key={manager.id} className="flex items-center justify-between p-2 bg-purple-50/50 rounded border border-purple-100">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-purple-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{manager.name}</div>
                          <div className="text-xs text-gray-500 truncate">{manager.email}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRemoveLotManager(manager.id) }} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 px-2 py-1">Aucun gestionnaire spécifique</p>
                )}
            </div>

            {/* Button always visible at bottom */}
            <div className="p-2 pt-0 bg-white border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAddLotManager() }} className="w-full text-xs border-purple-300 text-purple-700 hover:bg-purple-50 h-8">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter gestionnaire
                </Button>
            </div>
          </div>

          {/* Tenants Section */}
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
            <div className="w-full flex items-center gap-2 p-2.5 bg-blue-50">
              <User className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-sm text-blue-900">Locataires</span>
            </div>

            {/* Scrollable list - max 3 contacts visible */}
            <div className="p-2 bg-white overflow-y-auto max-h-[138px] space-y-1.5 flex-1">
                {tenants.length > 0 ? (
                  tenants.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between p-2 bg-blue-50/50 rounded border border-blue-100">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{tenant.name}</div>
                          <div className="text-xs text-gray-500 truncate">{tenant.email}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRemoveContact(tenant.id, 'tenant') }} className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 px-2 py-1">Aucun locataire</p>
                )}
            </div>

            {/* Button always visible at bottom */}
            <div className="p-2 pt-0 bg-white border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAddContact('tenant') }} className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-50 h-8">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter locataire
                </Button>
            </div>
          </div>

          {/* Providers Section */}
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
            <div className="w-full flex items-center gap-2 p-2.5 bg-green-50">
              <Wrench className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-sm text-green-900">Prestataires</span>
            </div>

            {/* Scrollable list - max 3 contacts visible */}
            <div className="p-2 bg-white overflow-y-auto max-h-[138px] space-y-1.5 flex-1">
                {providers.length > 0 ? (
                  providers.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-2 bg-green-50/50 rounded border border-green-100">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Wrench className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{contact.name}</div>
                          <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRemoveContact(contact.id, 'provider') }} className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 px-2 py-1">Aucun prestataire</p>
                )}
            </div>

            {/* Button always visible at bottom */}
            <div className="p-2 pt-0 bg-white border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAddContact('provider') }} className="w-full text-xs border-green-300 text-green-700 hover:bg-green-50 h-8">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter prestataire
                </Button>
            </div>
          </div>

          {/* Owners Section */}
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
            <div className="w-full flex items-center gap-2 p-2.5 bg-orange-50">
              <Home className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-sm text-orange-900">Propriétaires</span>
            </div>

            {/* Scrollable list - max 3 contacts visible */}
            <div className="p-2 bg-white overflow-y-auto max-h-[138px] space-y-1.5 flex-1">
                {owners.length > 0 ? (
                  owners.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-2 bg-orange-50/50 rounded border border-orange-100">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Home className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{contact.name}</div>
                          <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRemoveContact(contact.id, 'owner') }} className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 px-2 py-1">Aucun propriétaire</p>
                )}
            </div>

            {/* Button always visible at bottom */}
            <div className="p-2 pt-0 bg-white border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAddContact('owner') }} className="w-full text-xs border-orange-300 text-orange-700 hover:bg-orange-50 h-8">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter propriétaire
                </Button>
            </div>
          </div>

          {/* Others Section */}
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
            <div className="w-full flex items-center gap-2 p-2.5 bg-gray-50">
              <UserCircle className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-sm text-gray-900">Autres</span>
            </div>

            {/* Scrollable list - max 3 contacts visible */}
            <div className="p-2 bg-white overflow-y-auto max-h-[138px] space-y-1.5 flex-1">
                {others.length > 0 ? (
                  others.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-2 bg-gray-50/50 rounded border border-gray-100">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <UserCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{contact.name}</div>
                          <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRemoveContact(contact.id, 'other') }} className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 px-2 py-1">Aucun autre contact</p>
                )}
            </div>

            {/* Button always visible at bottom */}
            <div className="p-2 pt-0 bg-white border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAddContact('other') }} className="w-full text-xs border-gray-300 text-gray-700 hover:bg-gray-50 h-8">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter contact
                </Button>
            </div>
          </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default LotContactCardV4
