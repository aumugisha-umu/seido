/**
 * Page Détail Immeuble - Mode Démo
 * Affiche les informations détaillées d'un immeuble
 */

'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import { ArrowLeft, Home, Users, Wrench, Edit, MapPin } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDemoBuilding, useDemoBuildingLots, useDemoBuildingContacts, useDemoBuildingStats } from '@/hooks/demo/use-demo-buildings'
import { useDemoInterventions } from '@/hooks/demo/use-demo-interventions'

export default function BuildingDetailPageDemo({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const { building } = useDemoBuilding(id)
  const { lots } = useDemoBuildingLots(id)
  const { contacts } = useDemoBuildingContacts(id)
  const { stats } = useDemoBuildingStats(id)
  const { interventions } = useDemoInterventions({ building_id: id })

  if (!building) {
    notFound()
  }

  const activeInterventions = interventions.filter(
    (i: any) => !['cloturee_par_gestionnaire', 'annulee'].includes(i.status)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/demo/gestionnaire/biens">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{building.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{building.address}, {building.postal_code} {building.city}</span>
            </div>
          </div>
        </div>
        <Link href={`/demo/gestionnaire/biens/immeubles/modifier/${id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lots</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLots}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions actives</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeInterventions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total interventions</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInterventions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Building Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
          <CardDescription>Détails de l'immeuble</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Référence</p>
              <p className="text-sm mt-1">{building.reference || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pays</p>
              <p className="text-sm mt-1">{building.country?.toUpperCase() || '-'}</p>
            </div>
            {building.description && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm mt-1">{building.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lots List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lots ({lots.length})</CardTitle>
              <CardDescription>Liste des lots de cet immeuble</CardDescription>
            </div>
            <Link href={`/demo/gestionnaire/biens/lots/nouveau?building_id=${id}`}>
              <Button variant="outline" size="sm">
                Ajouter un lot
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {lots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun lot pour cet immeuble
            </div>
          ) : (
            <div className="space-y-3">
              {lots.map((lot: any) => (
                <Link
                  key={lot.id}
                  href={`/demo/gestionnaire/biens/lots/${lot.id}`}
                  className="block"
                >
                  <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{lot.reference}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{lot.category}</Badge>
                          {lot.floor && (
                            <Badge variant="secondary">Étage {lot.floor}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts */}
      {contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contacts ({contacts.length})</CardTitle>
            <CardDescription>Personnes liées à cet immeuble</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contacts.map((contact: any) => (
                <div key={contact.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                  </div>
                  <Badge variant="outline">{contact.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Interventions */}
      {activeInterventions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Interventions actives ({activeInterventions.length})</CardTitle>
                <CardDescription>Interventions en cours pour cet immeuble</CardDescription>
              </div>
              <Link href={`/demo/gestionnaire/interventions?building_id=${id}`}>
                <Button variant="outline" size="sm">
                  Voir tout
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeInterventions.slice(0, 5).map((intervention: any) => (
                <Link
                  key={intervention.id}
                  href={`/demo/gestionnaire/interventions/${intervention.id}`}
                  className="block"
                >
                  <div className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{intervention.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{intervention.reference}</p>
                      </div>
                      <Badge variant="outline">{intervention.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
