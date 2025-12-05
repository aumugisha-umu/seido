"use client"

/**
 * Interactive Demo Page: Lease Form Details Merged Versions
 *
 * Purpose:
 * - Compare 3 design versions side-by-side
 * - Test responsive behavior across viewports
 * - Validate UX patterns and accessibility
 * - Gather feedback for final implementation
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import LeaseFormDetailsMergedV1 from '@/components/contract/lease-form-details-merged-v1'
import LeaseFormDetailsMergedV2 from '@/components/contract/lease-form-details-merged-v2'
import LeaseFormDetailsMergedV3 from '@/components/contract/lease-form-details-merged-v3'
import { Monitor, Smartphone, Tablet, Check, Star, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { PaymentFrequency } from '@/lib/types/contract.types'

type Viewport = 'mobile' | 'tablet' | 'desktop'

const viewportSizes: Record<Viewport, { width: string; label: string; icon: typeof Smartphone }> = {
  mobile: { width: '375px', label: 'Mobile (375px)', icon: Smartphone },
  tablet: { width: '768px', label: 'Tablet (768px)', icon: Tablet },
  desktop: { width: '100%', label: 'Desktop (Full)', icon: Monitor }
}

export default function LeaseFormDemoPage() {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [currentVersion, setCurrentVersion] = useState<'v1' | 'v2' | 'v3'>('v1')

  // Shared form state across all versions
  const [formData, setFormData] = useState({
    startDate: '2025-01-15',
    durationMonths: 24,
    comments: '',
    paymentFrequency: 'mensuel' as PaymentFrequency,
    rentAmount: 850,
    chargesAmount: 50
  })

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const ViewportIcon = viewportSizes[viewport].icon

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/gestionnaire/contrats/nouveau">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au formulaire
          </Button>
        </Link>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Démo: Étapes fusionnées du formulaire de bail</h1>
            <p className="text-muted-foreground">
              Comparez les trois versions proposées et testez la responsivité.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">Phase 4 - Contrats</Badge>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Viewport Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Viewport:</span>
            <div className="flex border rounded-lg">
              {(Object.entries(viewportSizes) as [Viewport, typeof viewportSizes[Viewport]][]).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <Button
                    key={key}
                    variant={viewport === key ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewport(key)}
                    className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {config.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Matrix */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Feature Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Comparaison des versions</CardTitle>
            <CardDescription>Caractéristiques et cas d'usage de chaque design</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Critère</th>
                    <th className="text-left p-3 font-medium">
                      <div className="flex items-center gap-2">
                        Version 1 - Minimalist
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Recommandé
                        </Badge>
                      </div>
                    </th>
                    <th className="text-left p-3 font-medium">Version 2 - Cartes</th>
                    <th className="text-left p-3 font-medium">Version 3 - Compact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Layout</td>
                    <td className="p-3">Single card, sections avec séparateurs</td>
                    <td className="p-3">3 cartes distinctes empilées</td>
                    <td className="p-3">2 colonnes (formulaire + sidebar)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Densité d'information</td>
                    <td className="p-3">Équilibrée (recommandé)</td>
                    <td className="p-3">Aérée (plus d'espace blanc)</td>
                    <td className="p-3">Dense (optimisé écran large)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Responsive mobile</td>
                    <td className="p-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Excellent
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Excellent
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Bon (sidebar collapse)
                      </Badge>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Scrolling requis</td>
                    <td className="p-3">Moyen (1-2 viewports)</td>
                    <td className="p-3">Plus (3 cartes empilées)</td>
                    <td className="p-3">Minimal (2 colonnes)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Idéal pour</td>
                    <td className="p-3">Usage général, tous écrans</td>
                    <td className="p-3">Grands écrans, préférence visuelle</td>
                    <td className="p-3">Gestionnaires, desktop, efficacité</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Complexité code</td>
                    <td className="p-3">Simple (1 Card + Separators)</td>
                    <td className="p-3">Moyenne (3 Cards + Headers)</td>
                    <td className="p-3">Moyenne (Grid + Sticky sidebar)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Accessibilité</td>
                    <td className="p-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        WCAG AA
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        WCAG AA
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        WCAG AA
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Version Selector & Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu interactif</CardTitle>
            <CardDescription>Testez les trois versions avec des données réelles</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={currentVersion} onValueChange={(v) => setCurrentVersion(v as 'v1' | 'v2' | 'v3')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="v1" className="relative">
                  Version 1 - Minimalist
                  <Badge variant="secondary" className="absolute -top-2 -right-2 scale-75">
                    <Star className="h-3 w-3" />
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="v2">Version 2 - Cartes</TabsTrigger>
                <TabsTrigger value="v3">Version 3 - Compact</TabsTrigger>
              </TabsList>

              {/* Version 1 */}
              <TabsContent value="v1" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ViewportIcon className="h-4 w-4" />
                    <span>Prévisualisation: {viewportSizes[viewport].label}</span>
                  </div>

                  {/* Viewport Simulator */}
                  <div className="border rounded-lg p-4 bg-muted/20 overflow-x-auto">
                    <div
                      className="mx-auto transition-all duration-300"
                      style={{ maxWidth: viewportSizes[viewport].width }}
                    >
                      <LeaseFormDetailsMergedV1
                        lotReference="APT-A12"
                        startDate={formData.startDate}
                        durationMonths={formData.durationMonths}
                        comments={formData.comments}
                        paymentFrequency={formData.paymentFrequency}
                        rentAmount={formData.rentAmount}
                        chargesAmount={formData.chargesAmount}
                        onFieldChange={handleFieldChange}
                      />
                    </div>
                  </div>

                  {/* Design Notes */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 space-y-2 text-sm">
                      <p className="font-semibold flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        Version recommandée
                      </p>
                      <ul className="space-y-1 text-muted-foreground ml-6 list-disc">
                        <li>Équilibre optimal entre densité et lisibilité</li>
                        <li>Séparateurs visuels clairs entre sections</li>
                        <li>Référence auto-générée mise en valeur</li>
                        <li>Total mensuel avec icône TrendingUp</li>
                        <li>Excellent sur tous les écrans (mobile-first)</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Version 2 */}
              <TabsContent value="v2" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ViewportIcon className="h-4 w-4" />
                    <span>Prévisualisation: {viewportSizes[viewport].label}</span>
                  </div>

                  {/* Viewport Simulator */}
                  <div className="border rounded-lg p-4 bg-muted/20 overflow-x-auto">
                    <div
                      className="mx-auto transition-all duration-300"
                      style={{ maxWidth: viewportSizes[viewport].width }}
                    >
                      <LeaseFormDetailsMergedV2
                        lotReference="APT-A12"
                        startDate={formData.startDate}
                        durationMonths={formData.durationMonths}
                        comments={formData.comments}
                        paymentFrequency={formData.paymentFrequency}
                        rentAmount={formData.rentAmount}
                        chargesAmount={formData.chargesAmount}
                        onFieldChange={handleFieldChange}
                      />
                    </div>
                  </div>

                  {/* Design Notes */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 space-y-2 text-sm">
                      <p className="font-semibold">Version cartes séparées</p>
                      <ul className="space-y-1 text-muted-foreground ml-6 list-disc">
                        <li>3 cartes distinctes avec headers descriptifs</li>
                        <li>Plus d'espace blanc, apparence dashboard</li>
                        <li>Card financière avec fond primary subtil</li>
                        <li>Bon pour utilisateurs préférant la segmentation visuelle</li>
                        <li>Plus de scrolling sur mobile (3 cartes empilées)</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Version 3 */}
              <TabsContent value="v3" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ViewportIcon className="h-4 w-4" />
                    <span>Prévisualisation: {viewportSizes[viewport].label}</span>
                  </div>

                  {/* Viewport Simulator */}
                  <div className="border rounded-lg p-4 bg-muted/20 overflow-x-auto">
                    <div
                      className="mx-auto transition-all duration-300"
                      style={{ maxWidth: viewportSizes[viewport].width }}
                    >
                      <LeaseFormDetailsMergedV3
                        lotReference="APT-A12"
                        startDate={formData.startDate}
                        durationMonths={formData.durationMonths}
                        comments={formData.comments}
                        paymentFrequency={formData.paymentFrequency}
                        rentAmount={formData.rentAmount}
                        chargesAmount={formData.chargesAmount}
                        onFieldChange={handleFieldChange}
                      />
                    </div>
                  </div>

                  {/* Design Notes */}
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4 space-y-2 text-sm">
                      <p className="font-semibold">Version compacte 2 colonnes</p>
                      <ul className="space-y-1 text-muted-foreground ml-6 list-disc">
                        <li>Layout 2 colonnes: formulaire (2/3) + sidebar financière (1/3)</li>
                        <li>Sidebar sticky avec résumé financier permanent</li>
                        <li>Densité d'information maximale (power users)</li>
                        <li>Optimisé pour écrans larges (desktop focus)</li>
                        <li>Date de fin calculée automatiquement affichée</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recommendation */}
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Recommandation UX</h3>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Version 1 (Minimalist)</strong> est recommandée pour la majorité des cas d'usage:
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground ml-6 list-disc">
                  <li>Équilibre optimal entre densité et lisibilité</li>
                  <li>Excellente expérience mobile (pas de colonnes complexes)</li>
                  <li>Code plus simple à maintenir (single Card)</li>
                  <li>Pattern cohérent avec les autres formulaires SEIDO</li>
                  <li>Accessibilité WCAG AA garantie</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  <strong className="text-foreground">Version 3</strong> peut être utilisée pour le rôle Gestionnaire sur desktop si vous souhaitez maximiser l'efficacité workflow.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
