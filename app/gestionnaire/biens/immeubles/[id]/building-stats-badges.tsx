"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, Wrench, Activity, CheckCircle } from "lucide-react"

interface BuildingStatsBadgesProps {
  stats: {
    totalInterventions: number
    activeInterventions: number
    completedInterventions: number
  }
  totalContacts: number
}

export function BuildingStatsBadges({ stats, totalContacts }: BuildingStatsBadgesProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {/* Badge 1: Contacts */}
      <Card className="overflow-hidden border-l-4 border-l-orange-500 bg-orange-50/50 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-2xl font-bold text-orange-900">{totalContacts}</p>
              <p className="text-xs font-medium text-orange-700 mt-1">Contacts</p>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badge 2: Total Interventions */}
      <Card className="overflow-hidden border-l-4 border-l-blue-500 bg-blue-50/50 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-2xl font-bold text-blue-900">{stats.totalInterventions}</p>
              <p className="text-xs font-medium text-blue-700 mt-1">Interventions</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badge 3: Active Interventions */}
      <Card className="overflow-hidden border-l-4 border-l-orange-500 bg-orange-50/50 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-2xl font-bold text-orange-900">{stats.activeInterventions}</p>
              <p className="text-xs font-medium text-orange-700 mt-1">En cours</p>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg">
              <Activity className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badge 4: Completed Interventions */}
      <Card className="overflow-hidden border-l-4 border-l-green-500 bg-green-50/50 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-2xl font-bold text-green-900">{stats.completedInterventions}</p>
              <p className="text-xs font-medium text-green-700 mt-1">Terminées</p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
