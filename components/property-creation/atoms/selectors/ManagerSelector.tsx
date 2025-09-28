/**
 * ManagerSelector - Atomic component for selecting property managers
 *
 * Provides manager selection with inline creation capability.
 * Supports team-based filtering and role-based permissions.
 */

"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { User, Users, Plus, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import type { ManagerSelectorProps } from "../../types"

export function ManagerSelector({
  selectedManagerId,
  teamManagers,
  onManagerSelect,
  onCreateManager,
  userTeam,
  isLoading = false,
  disabled = false,
  required = false,
  className
}: ManagerSelectorProps & { className?: string }) {
  const { user } = useAuth()

  const selectedManager = teamManagers.find(m => m.user.id === selectedManagerId)
  const hasManagers = teamManagers.length > 0

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <User className="w-4 h-4" />
          Responsable principal
          {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          <span className="text-gray-600 text-sm">Chargement des gestionnaires...</span>
        </div>
      </div>
    )
  }

  if (!hasManagers) {
    return (
      <div className={cn("space-y-3", className)}>
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <User className="w-4 h-4" />
          Responsable principal
          {required && <span className="text-red-500">*</span>}
        </Label>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900 mb-2">
                  Aucun gestionnaire disponible
                </h4>
                <p className="text-sm text-yellow-700 mb-3">
                  {userTeam
                    ? `Votre équipe "${userTeam.name}" ne contient aucun gestionnaire.`
                    : "Vous devez être membre d'une équipe pour créer des propriétés."
                  }
                </p>
                {onCreateManager && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateManager}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un gestionnaire
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
        <User className="w-4 h-4" />
        Responsable principal
        {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="space-y-3">
        <Select
          value={selectedManagerId}
          onValueChange={onManagerSelect}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionner un responsable" />
          </SelectTrigger>
          <SelectContent>
            {teamManagers.map((manager) => (
              <SelectItem key={manager.user.id} value={manager.user.id}>
                <div className="flex items-center gap-2">
                  <span>{manager.user.name}</span>
                  {manager.user.id === user?.id && (
                    <Badge variant="outline" className="text-xs">Vous</Badge>
                  )}
                  {manager.role === 'admin' && (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Selected manager display */}
        {selectedManager && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-900">{selectedManager.user.name}</span>
                    {selectedManager.user.id === user?.id && (
                      <Badge variant="outline" className="text-xs">Vous</Badge>
                    )}
                    {selectedManager.role === 'admin' && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                        Admin équipe
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-blue-700">{selectedManager.user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team info */}
        {userTeam && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Users className="w-3 h-3" />
            <span>Équipe : {userTeam.name}</span>
            <span>•</span>
            <span>{teamManagers.length} gestionnaire{teamManagers.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Create manager option */}
        {onCreateManager && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateManager}
            disabled={disabled}
            className="w-full text-sm border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un nouveau gestionnaire
          </Button>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-500">
        Le responsable principal recevra toutes les notifications concernant cette propriété.
        Vous pourrez ajouter des responsables spécifiques pour chaque lot plus tard.
      </p>
    </div>
  )
}

ManagerSelector.displayName = "ManagerSelector"