"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import type { InterventionWithRelations } from '@/lib/services'

// View Switchers
import { ViewModeSwitcherV1 } from '@/components/interventions/view-mode-switcher-v1'
import { ViewModeSwitcherV2 } from '@/components/interventions/view-mode-switcher-v2'
import { ViewModeSwitcherV3 } from '@/components/interventions/view-mode-switcher-v3'

// View Container
import { InterventionsViewContainer } from '@/components/interventions/interventions-view-container'

/**
 * 🎨 INTERVENTIONS VIEWS DEMO PAGE
 *
 * Interactive comparison page for all view variants.
 * Allows user to test and compare:
 * - 3 view switcher variants
 * - 3 list view variants
 * - 3 calendar view variants
 *
 * Purpose: Help user choose best variants for their needs.
 */

// Sample intervention data for demo
const SAMPLE_INTERVENTIONS: InterventionWithRelations[] = [
  {
    id: '1',
    title: 'Fuite d\'eau dans la salle de bain',
    description: 'Fuite importante sous le lavabo nécessitant une intervention rapide',
    status: 'demande',
    type: 'plomberie',
    urgency: 'urgent',
    created_at: new Date('2025-10-28').toISOString(),
    scheduled_date: new Date('2025-10-31').toISOString(),
    team_id: 'team-1',
    lot: {
      id: 'lot-1',
      reference: 'Appt 3B',
      building: {
        id: 'building-1',
        name: 'Résidence Les Lilas',
        address: '12 Rue des Fleurs',
        city: 'Paris',
        postal_code: '75015',
        team_id: 'team-1'
      }
    }
  } as any,
  {
    id: '2',
    title: 'Panne électrique cuisine',
    description: 'Plusieurs prises ne fonctionnent plus, disjoncteur qui saute',
    status: 'approuvee',
    type: 'electricite',
    urgency: 'haute',
    created_at: new Date('2025-10-29').toISOString(),
    scheduled_date: new Date('2025-11-01').toISOString(),
    team_id: 'team-1',
    lot: {
      id: 'lot-2',
      reference: 'Appt 5A',
      building: {
        id: 'building-1',
        name: 'Résidence Les Lilas',
        address: '12 Rue des Fleurs',
        city: 'Paris',
        postal_code: '75015',
        team_id: 'team-1'
      }
    }
  } as any,
  {
    id: '3',
    title: 'Maintenance annuelle chaudière',
    description: 'Contrôle et entretien annuel de la chaudière collective',
    status: 'planifiee',
    type: 'chauffage',
    urgency: 'normale',
    created_at: new Date('2025-10-25').toISOString(),
    scheduled_date: new Date('2025-11-05').toISOString(),
    team_id: 'team-1',
    lot: {
      id: 'lot-3',
      building_id: 'building-1',
      building: {
        id: 'building-1',
        name: 'Résidence Les Lilas',
        address: '12 Rue des Fleurs',
        city: 'Paris',
        postal_code: '75015',
        team_id: 'team-1'
      }
    }
  } as any,
  {
    id: '4',
    title: 'Serrure bloquée porte d\'entrée',
    description: 'Serrure difficile à ouvrir, clé qui coince',
    status: 'en_cours',
    type: 'serrurerie',
    urgency: 'haute',
    created_at: new Date('2025-10-30').toISOString(),
    scheduled_date: new Date('2025-11-02').toISOString(),
    team_id: 'team-1',
    lot: {
      id: 'lot-4',
      reference: 'Appt 2C',
      building: {
        id: 'building-2',
        name: 'Immeuble Saint-Michel',
        address: '45 Avenue Victor Hugo',
        city: 'Lyon',
        postal_code: '69003',
        team_id: 'team-1'
      }
    }
  } as any,
  {
    id: '5',
    title: 'Rafraîchissement peinture salon',
    description: 'Travaux de peinture après départ locataire',
    status: 'demande_de_devis',
    type: 'peinture',
    urgency: 'faible',
    created_at: new Date('2025-10-27').toISOString(),
    scheduled_date: new Date('2025-11-08').toISOString(),
    team_id: 'team-1',
    lot: {
      id: 'lot-5',
      reference: 'Appt 1A',
      building: {
        id: 'building-2',
        name: 'Immeuble Saint-Michel',
        address: '45 Avenue Victor Hugo',
        city: 'Lyon',
        postal_code: '69003',
        team_id: 'team-1'
      }
    }
  } as any,
  {
    id: '6',
    title: 'Réparation VMC défectueuse',
    description: 'VMC de la salle de bain fait beaucoup de bruit',
    status: 'planifiee',
    type: 'maintenance',
    urgency: 'normale',
    created_at: new Date('2025-10-26').toISOString(),
    scheduled_date: new Date('2025-11-03').toISOString(),
    team_id: 'team-1',
    lot: {
      id: 'lot-6',
      reference: 'Appt 4D',
      building: {
        id: 'building-1',
        name: 'Résidence Les Lilas',
        address: '12 Rue des Fleurs',
        city: 'Paris',
        postal_code: '75015',
        team_id: 'team-1'
      }
    }
  } as any
]

export default function InterventionsViewsDemoPage() {
  const [selectedSwitcher, setSelectedSwitcher] = useState<'v1' | 'v2' | 'v3'>('v1')
  const [selectedListView, setSelectedListView] = useState<'v1' | 'v2' | 'v3'>('v1')
  const [selectedCalendarView, setSelectedCalendarView] = useState<'v1' | 'v2' | 'v3'>('v1')

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Interventions Multi-View System - Demo
          </h1>
          <p className="text-slate-600">
            Comparez les différentes variantes et choisissez celles qui conviennent le mieux à votre workflow.
          </p>
        </div>

        {/* Overview Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="switchers">View Switchers</TabsTrigger>
            <TabsTrigger value="views">Views Comparison</TabsTrigger>
            <TabsTrigger value="integration">Intégration</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Système Multi-Vues Complet</CardTitle>
                <CardDescription>
                  9 composants créés avec 3 variantes pour chaque type de vue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* View Switchers Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">📐 View Switchers (3 variantes)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ComparisonCard
                      title="V1 - Icon Toggle"
                      badge="Recommandée"
                      pros={['Très compact', 'Design épuré', 'International']}
                      cons={['Courbe d\'apprentissage']}
                      bestFor="Interfaces minimales, toolbar placement"
                    />
                    <ComparisonCard
                      title="V2 - Icon + Label"
                      pros={['Plus explicite', 'Responsive labels', 'Professionnel']}
                      cons={['Plus d\'espace', 'Traduction requise']}
                      bestFor="Nouveaux utilisateurs, professionnels"
                    />
                    <ComparisonCard
                      title="V3 - Dropdown"
                      pros={['Maximum compact', 'Scalable', 'Mobile-friendly']}
                      cons={['2 clics requis', 'Moins découvrable']}
                      bestFor="Espace limité, plus de 3 modes"
                    />
                  </div>
                </div>

                {/* List Views Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">📊 List Views (3 variantes)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ComparisonCard
                      title="V1 - Table Dense"
                      badge="Recommandée"
                      pros={['Haute densité d\'info', 'Colonnes triables', 'Scannable']}
                      cons={['Scroll horizontal mobile', 'Moins visuel']}
                      bestFor="Desktop power users, data analysis"
                    />
                    <ComparisonCard
                      title="V2 - Compact Rows"
                      pros={['Mobile-optimized', 'Expandable', 'Touch-friendly']}
                      cons={['Requiert expand', 'Moins efficient bulk']}
                      bestFor="Mobile users, progressive disclosure"
                    />
                    <ComparisonCard
                      title="V3 - Split Layout"
                      pros={['No transitions', 'Context preserved', 'Pro appearance']}
                      cons={['Wide screen needed', 'Split attention']}
                      bestFor="Desktop sequential review"
                    />
                  </div>
                </div>

                {/* Calendar Views Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">📅 Calendar Views (3 variantes)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ComparisonCard
                      title="V1 - Month + Side"
                      badge="Recommandée"
                      pros={['Best overview', 'Color-coded urgency', 'Planning-friendly']}
                      cons={['Wide screen needed', 'Monthly scope only']}
                      bestFor="Desktop planning, full overview"
                    />
                    <ComparisonCard
                      title="V2 - Month + Drawer"
                      pros={['Mobile-friendly', 'Max calendar visibility', 'Smooth animation']}
                      cons={['Requires scroll', 'Drawer obscures calendar']}
                      bestFor="Mobile users, vertical layouts"
                    />
                    <ComparisonCard
                      title="V3 - Week Timeline"
                      pros={['Detailed weekly schedule', 'Compare days', 'Short-term focus']}
                      cons={['One week only', 'Wide screen needed']}
                      bestFor="Short-term planning, daily detail"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VIEW SWITCHERS TAB */}
          <TabsContent value="switchers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>View Switcher Variants Comparison</CardTitle>
                <CardDescription>
                  Testez les 3 variantes de boutons de changement de vue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* V1 - Icon Toggle */}
                <div className="p-4 border border-slate-200 rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">V1 - Icon Toggle</h4>
                      <Badge className="mt-1">Recommandée</Badge>
                    </div>
                    <ViewModeSwitcherV1
                      value="cards"
                      onChange={() => {}}
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    Icônes uniquement, très compact, idéal pour les toolbars. Pattern familier des apps modernes.
                  </p>
                </div>

                {/* V2 - Icon + Label */}
                <div className="p-4 border border-slate-200 rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">V2 - Icon + Label</h4>
                    </div>
                    <ViewModeSwitcherV2
                      value="cards"
                      onChange={() => {}}
                      showLabels="always"
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    Icônes + texte, plus explicite pour nouveaux utilisateurs. Labels peuvent être responsive.
                  </p>
                </div>

                {/* V3 - Dropdown */}
                <div className="p-4 border border-slate-200 rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">V3 - Dropdown Select</h4>
                    </div>
                    <ViewModeSwitcherV3
                      value="cards"
                      onChange={() => {}}
                      variant="full"
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    Menu déroulant, maximum compact, scalable (facile d'ajouter plus de modes). Descriptions dans les items.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VIEWS COMPARISON TAB */}
          <TabsContent value="views" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Interactif des Views</CardTitle>
                <CardDescription>
                  Testez toutes les combinaisons de vues avec des données réelles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Configuration Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      View Switcher
                    </label>
                    <select
                      value={selectedSwitcher}
                      onChange={(e) => setSelectedSwitcher(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    >
                      <option value="v1">V1 - Icon Toggle</option>
                      <option value="v2">V2 - Icon + Label</option>
                      <option value="v3">V3 - Dropdown</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      List View Variant
                    </label>
                    <select
                      value={selectedListView}
                      onChange={(e) => setSelectedListView(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    >
                      <option value="v1">V1 - Table Dense</option>
                      <option value="v2">V2 - Compact Rows</option>
                      <option value="v3">V3 - Split Layout</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Calendar View Variant
                    </label>
                    <select
                      value={selectedCalendarView}
                      onChange={(e) => setSelectedCalendarView(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    >
                      <option value="v1">V1 - Month + Side Panel</option>
                      <option value="v2">V2 - Month + Drawer</option>
                      <option value="v3">V3 - Week Timeline</option>
                    </select>
                  </div>
                </div>

                {/* Interactive Demo */}
                <InterventionsViewContainer
                  interventions={SAMPLE_INTERVENTIONS}
                  userContext="gestionnaire"
                  viewSwitcherVariant={selectedSwitcher}
                  listViewVariant={selectedListView}
                  calendarViewVariant={selectedCalendarView}
                  syncViewModeWithUrl={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTEGRATION TAB */}
          <TabsContent value="integration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Guide d'Intégration</CardTitle>
                <CardDescription>
                  Comment intégrer le système multi-vues dans l'application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-900 rounded-lg overflow-x-auto">
                  <pre className="text-sm text-slate-100">
{`// Avant (code existant):
<InterventionsList
  interventions={allInterventions}
  userContext="gestionnaire"
/>

// Après (avec multi-view support):
<InterventionsViewContainer
  interventions={allInterventions}
  userContext="gestionnaire"
  viewSwitcherVariant="v1"      // ou "v2", "v3"
  listViewVariant="v1"           // ou "v2", "v3"
  calendarViewVariant="v1"       // ou "v2", "v3"
  syncViewModeWithUrl={true}     // Optionnel: sync URL
/>

// Configuration recommandée (desktop-first):
viewSwitcherVariant="v1"       // Icon-only, compact
listViewVariant="v1"            // Table dense, power users
calendarViewVariant="v1"        // Month + side panel

// Configuration mobile-optimized:
viewSwitcherVariant="v2"       // Icon + label, explicit
listViewVariant="v2"            // Compact rows, touch-friendly
calendarViewVariant="v2"        // Month + drawer, vertical`}
                  </pre>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Prochaines Étapes:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                    <li>Choisir les variantes préférées via cette page de demo</li>
                    <li>Remplacer InterventionsList par InterventionsViewContainer</li>
                    <li>Tester sur mobile et desktop</li>
                    <li>Supprimer les variantes non utilisées (cleanup)</li>
                    <li>Documenter la configuration choisie</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/**
 * Comparison Card Component
 */
interface ComparisonCardProps {
  title: string
  badge?: string
  pros: string[]
  cons: string[]
  bestFor: string
}

function ComparisonCard({ title, badge, pros, cons, bestFor }: ComparisonCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {badge && (
            <Badge variant="default" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pros */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-medium text-slate-700">Avantages</span>
          </div>
          <ul className="space-y-1">
            {pros.map((pro, i) => (
              <li key={i} className="text-xs text-slate-600 pl-5">
                • {pro}
              </li>
            ))}
          </ul>
        </div>

        {/* Cons */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-600" />
            <span className="text-xs font-medium text-slate-700">Inconvénients</span>
          </div>
          <ul className="space-y-1">
            {cons.map((con, i) => (
              <li key={i} className="text-xs text-slate-600 pl-5">
                • {con}
              </li>
            ))}
          </ul>
        </div>

        {/* Best For */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-slate-700">Idéal pour</span>
          </div>
          <p className="text-xs text-slate-600 pl-5">{bestFor}</p>
        </div>
      </CardContent>
    </Card>
  )
}
