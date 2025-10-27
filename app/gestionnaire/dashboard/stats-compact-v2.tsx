"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Building2, Home, Users } from "lucide-react"
import { Separator } from "@/components/ui/separator"

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
 * VERSION 2 - HORIZONTAL COMPACT
 * Objectif: -50% hauteur via layout horizontal unique
 * - Toutes les stats dans une seule Card
 * - Disposition horizontale avec séparateurs
 * - Format optimisé pour desktop/tablet
 */
export function StatsCompactV2({ stats, contactStats }: StatsProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        {/* Mobile/Tablet: Grid 2 colonnes | Desktop: Flex row avec 4 stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center lg:justify-between gap-4 lg:gap-6">
          {/* Stat 1 - Immeubles */}
          <div className="flex gap-3 lg:flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold leading-none">{stats.buildingsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Immeubles</p>
            </div>
          </div>

          {/* Separator - Desktop only */}
          <Separator orientation="vertical" className="hidden lg:block h-12" />

          {/* Stat 2 - Lots */}
          <div className="flex gap-3 lg:flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
              <Home className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold leading-none">{stats.lotsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Lots totaux</p>
            </div>
          </div>

          {/* Separator - Desktop only */}
          <Separator orientation="vertical" className="hidden lg:block h-12" />

          {/* Stat 3 - Occupés */}
          <div className="flex gap-3 lg:flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold leading-none">{stats.occupiedLotsCount}/{stats.lotsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Occupation</p>
            </div>
          </div>

          {/* Separator - Desktop only */}
          <Separator orientation="vertical" className="hidden lg:block h-12" />

          {/* Stat 4 - Contacts */}
          <div className="flex items-start gap-3 lg:flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 mt-1">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold leading-none">{contactStats.totalContacts}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-muted-foreground">Contacts</p>
                <p className="text-[10px] text-green-600">
                  {contactStats.totalActiveAccounts} actifs
                </p>
                {contactStats.invitationsPending > 0 && (
                  <p className="text-[10px] text-orange-600">
                    {contactStats.invitationsPending} en attente
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
