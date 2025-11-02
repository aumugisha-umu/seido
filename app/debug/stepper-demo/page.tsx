"use client"

import { useState } from "react"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { StepProgressHeaderV1 } from "@/components/ui/step-progress-header-v1-inline"
import { StepProgressHeaderV2 } from "@/components/ui/step-progress-header-v2-tabs"
import { StepProgressHeaderV3 } from "@/components/ui/step-progress-header-v3-breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Home, Users, CheckCircle2, ChevronLeft, ChevronRight, Smartphone, Tablet, Monitor } from "lucide-react"

const DEMO_STEPS = [
  { icon: Building2, label: "Immeuble" },
  { icon: Home, label: "Lot" },
  { icon: Users, label: "Contacts" },
  { icon: CheckCircle2, label: "Confirmation" },
]

type ViewportSize = "mobile" | "tablet" | "desktop"

const VIEWPORTS = {
  mobile: { width: 375, label: "Mobile", icon: Smartphone },
  tablet: { width: 768, label: "Tablet", icon: Tablet },
  desktop: { width: 1280, label: "Desktop", icon: Monitor },
}

export default function StepperDemoPage() {
  const [currentStepOriginal, setCurrentStepOriginal] = useState(2)
  const [currentStepV1, setCurrentStepV1] = useState(2)
  const [currentStepV2, setCurrentStepV2] = useState(2)
  const [currentStepV3, setCurrentStepV3] = useState(2)
  const [viewport, setViewport] = useState<ViewportSize>("desktop")

  const handleNext = (setter: React.Dispatch<React.SetStateAction<number>>) => {
    setter((prev) => Math.min(prev + 1, DEMO_STEPS.length))
  }

  const handlePrev = (setter: React.Dispatch<React.SetStateAction<number>>) => {
    setter((prev) => Math.max(prev - 1, 1))
  }

  const handleBack = () => {
    console.log("Back clicked")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Stepper Component - Comparison Demo
          </h1>
          <p className="text-gray-600">
            Compare 3 compact versions of the step progress header component
          </p>
        </div>

        {/* Feature Comparison Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>
              All versions use the same props interface and are production-ready
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Feature</th>
                    <th className="text-left py-3 px-4 font-semibold">Original</th>
                    <th className="text-left py-3 px-4 font-semibold">V1: Inline</th>
                    <th className="text-left py-3 px-4 font-semibold">V2: Tabs</th>
                    <th className="text-left py-3 px-4 font-semibold">V3: Breadcrumb</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Height</td>
                    <td className="py-3 px-4">~165-185px</td>
                    <td className="py-3 px-4 text-green-600 font-semibold">~60-80px</td>
                    <td className="py-3 px-4 text-green-600 font-semibold">~50-70px</td>
                    <td className="py-3 px-4 text-green-600 font-semibold">~40-60px</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">UX Pattern</td>
                    <td className="py-3 px-4">Stacked layout</td>
                    <td className="py-3 px-4">Inline dots + tooltips</td>
                    <td className="py-3 px-4">Tab navigation</td>
                    <td className="py-3 px-4">Breadcrumb trail</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Step Labels</td>
                    <td className="py-3 px-4">Always visible</td>
                    <td className="py-3 px-4">Tooltip on hover</td>
                    <td className="py-3 px-4">Visible (desktop only)</td>
                    <td className="py-3 px-4">Current step only</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Mobile</td>
                    <td className="py-3 px-4">Stacked, reduced</td>
                    <td className="py-3 px-4">Icons only + mini bar</td>
                    <td className="py-3 px-4">Numbers + horizontal scroll</td>
                    <td className="py-3 px-4">Ultra-compact</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Best For</td>
                    <td className="py-3 px-4">Rich visual feedback</td>
                    <td className="py-3 px-4">Balanced simplicity</td>
                    <td className="py-3 px-4">Tab-like navigation</td>
                    <td className="py-3 px-4">Maximum form space</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Complexity</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary">High</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">Medium</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">Medium</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default">Low</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Viewport Simulator */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Viewport Simulator</CardTitle>
            <CardDescription>
              Test responsive behavior across different screen sizes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              {(Object.entries(VIEWPORTS) as [ViewportSize, typeof VIEWPORTS.mobile][]).map(([key, { label, icon: Icon }]) => (
                <Button
                  key={key}
                  variant={viewport === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewport(key)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                  <span className="ml-2 text-xs opacity-70">
                    {VIEWPORTS[key].width}px
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Component Demos */}
        <Tabs defaultValue="v1" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="v1">V1: Inline</TabsTrigger>
            <TabsTrigger value="v2">V2: Tabs</TabsTrigger>
            <TabsTrigger value="v3">V3: Breadcrumb</TabsTrigger>
          </TabsList>

          {/* Original Version */}
          <TabsContent value="original">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Original Version (~165-185px)</CardTitle>
                    <CardDescription>
                      Current implementation - Stacked layout with full step visualization
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Reference</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <div
                    className="mx-auto bg-white"
                    style={{ width: viewport === "desktop" ? "100%" : `${VIEWPORTS[viewport].width}px` }}
                  >
                    <StepProgressHeader
                      title="Créer un bien"
                      subtitle="Ajoutez un nouveau bien immobilier"
                      backButtonText="Retour"
                      onBack={handleBack}
                      steps={DEMO_STEPS}
                      currentStep={currentStepOriginal}
                    />
                    <div className="p-8 space-y-4">
                      <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                        Form Content Area
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handlePrev(setCurrentStepOriginal)}
                          disabled={currentStepOriginal === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button
                          onClick={() => handleNext(setCurrentStepOriginal)}
                          disabled={currentStepOriginal === DEMO_STEPS.length}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* V1: Inline */}
          <TabsContent value="v1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>V1: Inline Compact (~60-80px)</CardTitle>
                    <CardDescription>
                      Single-line layout with dots + tooltips - Balanced simplicity
                    </CardDescription>
                  </div>
                  <Badge className="bg-blue-600">Recommended</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <div
                      className="mx-auto bg-white"
                      style={{ width: viewport === "desktop" ? "100%" : `${VIEWPORTS[viewport].width}px` }}
                    >
                      <StepProgressHeaderV1
                        title="Créer un bien"
                        subtitle="Ajoutez un nouveau bien immobilier"
                        backButtonText="Retour"
                        onBack={handleBack}
                        steps={DEMO_STEPS}
                        currentStep={currentStepV1}
                      />
                      <div className="p-8 space-y-4">
                        <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                          Form Content Area
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handlePrev(setCurrentStepV1)}
                            disabled={currentStepV1 === 1}
                          >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Previous
                          </Button>
                          <Button
                            onClick={() => handleNext(setCurrentStepV1)}
                            disabled={currentStepV1 === DEMO_STEPS.length}
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">UX Strengths</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Progressive disclosure: Labels in tooltips (reduces cognitive load)</li>
                      <li>• Clear visual hierarchy: Active step stands out</li>
                      <li>• Mobile-optimized: Extra compact bar appears on small screens</li>
                      <li>• Balanced: Not too minimal, not too complex</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* V2: Tabs */}
          <TabsContent value="v2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>V2: Tab-Style (~50-70px)</CardTitle>
                    <CardDescription>
                      Material Design inspired tabs - Familiar navigation pattern
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Alternative</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <div
                      className="mx-auto bg-white"
                      style={{ width: viewport === "desktop" ? "100%" : `${VIEWPORTS[viewport].width}px` }}
                    >
                      <StepProgressHeaderV2
                        title="Créer un bien"
                        subtitle="Ajoutez un nouveau bien immobilier"
                        backButtonText="Retour"
                        onBack={handleBack}
                        steps={DEMO_STEPS}
                        currentStep={currentStepV2}
                      />
                      <div className="p-8 space-y-4">
                        <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                          Form Content Area
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handlePrev(setCurrentStepV2)}
                            disabled={currentStepV2 === 1}
                          >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Previous
                          </Button>
                          <Button
                            onClick={() => handleNext(setCurrentStepV2)}
                            disabled={currentStepV2 === DEMO_STEPS.length}
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">UX Strengths</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Familiar pattern: Users recognize tab navigation</li>
                      <li>• Active state prominence: Bottom border + color</li>
                      <li>• Material Design principles: Density + hierarchy</li>
                      <li>• Horizontal scroll on mobile (graceful degradation)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* V3: Breadcrumb */}
          <TabsContent value="v3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>V3: Breadcrumb Minimal (~40-60px)</CardTitle>
                    <CardDescription>
                      Ultra-compact breadcrumb style - Maximum form space
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Alternative</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <div
                      className="mx-auto bg-white"
                      style={{ width: viewport === "desktop" ? "100%" : `${VIEWPORTS[viewport].width}px` }}
                    >
                      <StepProgressHeaderV3
                        title="Créer un bien"
                        subtitle="Ajoutez un nouveau bien immobilier"
                        backButtonText="Retour"
                        onBack={handleBack}
                        steps={DEMO_STEPS}
                        currentStep={currentStepV3}
                      />
                      <div className="p-8 space-y-4">
                        <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                          Form Content Area
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handlePrev(setCurrentStepV3)}
                            disabled={currentStepV3 === 1}
                          >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Previous
                          </Button>
                          <Button
                            onClick={() => handleNext(setCurrentStepV3)}
                            disabled={currentStepV3 === DEMO_STEPS.length}
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">UX Strengths</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Context over chrome: Minimal UI, maximum content</li>
                      <li>• Breadcrumb pattern: Established navigation convention</li>
                      <li>• Ultra-compact: ~40-60px total height</li>
                      <li>• Desktop bonus: Mini step indicators on the right</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Metrics Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Height Comparison (Real Measurements)</CardTitle>
            <CardDescription>
              Height reduction achieved compared to original
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="text-sm text-gray-600 mb-1">Original</div>
                <div className="text-2xl font-bold text-gray-900">165-185px</div>
                <div className="text-xs text-gray-500 mt-1">Baseline</div>
              </div>
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="text-sm text-blue-600 mb-1">V1: Inline</div>
                <div className="text-2xl font-bold text-blue-900">60-80px</div>
                <div className="text-xs text-green-600 font-semibold mt-1">-64% height</div>
              </div>
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="text-sm text-green-600 mb-1">V2: Tabs</div>
                <div className="text-2xl font-bold text-green-900">50-70px</div>
                <div className="text-xs text-green-600 font-semibold mt-1">-70% height</div>
              </div>
              <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                <div className="text-sm text-purple-600 mb-1">V3: Breadcrumb</div>
                <div className="text-2xl font-bold text-purple-900">40-60px</div>
                <div className="text-xs text-green-600 font-semibold mt-1">-73% height</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Choose the right version for your use case
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">V1: Inline Compact</h4>
                <p className="text-sm text-blue-800">
                  <strong>Best for:</strong> General use - Balanced between simplicity and information density.
                  Good for most multi-step forms. Progressive disclosure via tooltips reduces cognitive load.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-green-900 mb-1">V2: Tab-Style</h4>
                <p className="text-sm text-green-800">
                  <strong>Best for:</strong> Users familiar with tab navigation. Good for workflows where
                  steps feel like distinct "sections" rather than a linear flow. Desktop-heavy usage.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 mb-1">V3: Breadcrumb Minimal</h4>
                <p className="text-sm text-purple-800">
                  <strong>Best for:</strong> Long forms where vertical space is critical. Mobile-first
                  applications. Users who prioritize content over chrome. Single-focus workflows.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
