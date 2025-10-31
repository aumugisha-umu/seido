"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Building2, Home, Users } from "lucide-react"

interface StatsProps {
  stats: {
    buildingsCount: number
    lotsCount: number
    occupiedLotsCount: number
    occupancyRate: number
    interventionsCount: number
  }
  contactStats: {
    totalContacts: number
    totalActiveAccounts: number
    invitationsPending: number
    contactsByType: Record<string, { total: number; active: number }>
  }
}

/**
 * VERSION 2 - HORIZONTAL COMPACT - 4 CARTES INDIVIDUELLES
 * Objectif: -50% hauteur via cartes séparées ultra-compactes
 * - 4 cartes individuelles avec padding minimal
 * - Disposition responsive : 2 colonnes sur mobile, 4 sur desktop
 * - Espacement adaptatif : 20px (mobile) → 40px (desktop)
 * - Format optimisé pour densité maximale
 */
export function StatsCompactV2({ stats, contactStats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-10">
      {/* Stat 1 - Immeubles */}
      <Card className="shadow-sm border-gray-200 py-4 gap-0">
        <CardContent className="px-4 py-0 flex items-center justify-center">
          <div className="flex gap-2 items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">{stats.buildingsCount}</div>
              <p className="text-xs text-muted-foreground leading-tight">Immeubles</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat 2 - Lots */}
      <Card className="shadow-sm border-gray-200 py-4 gap-0">
        <CardContent className="px-4 py-0 flex items-center justify-center">
          <div className="flex gap-2 items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
              <Home className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">{stats.lotsCount}</div>
              <p className="text-xs text-muted-foreground leading-tight">Lots totaux</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat 3 - Occupation */}
      <Card className="shadow-sm border-gray-200 py-4 gap-0">
        <CardContent className="px-4 py-0 flex items-center justify-center">
          <div className="flex gap-2 items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">{stats.occupiedLotsCount}/{stats.lotsCount}</div>
              <p className="text-xs text-muted-foreground leading-tight">Occupation</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat 4 - Contacts */}
      <Card className="shadow-sm border-gray-200 py-4 gap-0">
        <CardContent className="px-4 py-0 flex items-center justify-center">
          <div className="flex gap-2 items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">{contactStats.totalContacts}</div>
              <p className="text-xs text-muted-foreground leading-tight">Contacts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


