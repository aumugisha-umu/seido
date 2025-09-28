"use client"

import { useState } from "react"
import { SimplifiedFinalizationModal } from "@/components/intervention/simplified-finalization-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Smartphone, Tablet, Monitor, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"

export default function TestFinalizationMobilePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewportSize, setViewportSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile')

  // Test intervention ID - you may need to adjust this based on your mock data
  const testInterventionId = "INT-2025-001"

  const simulateViewport = (size: 'mobile' | 'tablet' | 'desktop') => {
    setViewportSize(size)
    // This is just for visual indication - actual testing should be done in browser DevTools
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-sky-600" />
            Test Mobile Finalization Layout
          </CardTitle>
          <CardDescription>
            Test the responsive behavior of the finalization modal on different screen sizes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Tests</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => {
                  simulateViewport('mobile')
                  setIsModalOpen(true)
                }}
                variant={viewportSize === 'mobile' ? 'default' : 'outline'}
                className="justify-start"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Test Mobile (320-640px)
              </Button>

              <Button
                onClick={() => {
                  simulateViewport('tablet')
                  setIsModalOpen(true)
                }}
                variant={viewportSize === 'tablet' ? 'default' : 'outline'}
                className="justify-start"
              >
                <Tablet className="h-4 w-4 mr-2" />
                Test Tablet (768-1024px)
              </Button>

              <Button
                onClick={() => {
                  simulateViewport('desktop')
                  setIsModalOpen(true)
                }}
                variant={viewportSize === 'desktop' ? 'default' : 'outline'}
                className="justify-start"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Test Desktop (1024px+)
              </Button>
            </div>
          </div>

          {/* Expected Behavior Checklist */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Expected Mobile Behavior</h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Compact Header (~15-20% viewport)</p>
                  <p className="text-xs text-gray-600">
                    Header should show only essential info: reference, urgency, cost, and status
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Tabs Section Visible (~50-55% of remaining)</p>
                  <p className="text-xs text-gray-600">
                    Work completion details and tenant feedback should be scrollable
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Decision Section Visible (~40-45% of remaining)</p>
                  <p className="text-xs text-gray-600">
                    Validate/Reject form must be visible and accessible without excessive scrolling
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Known Issues to Fix */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Previous Issues (Should Be Fixed)</h3>

            <div className="bg-red-50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm line-through text-gray-500">
                    Header taking ~50% of viewport
                  </p>
                  <p className="text-xs text-green-600">✓ Fixed: Now uses compact mode</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm line-through text-gray-500">
                    Decision section not visible
                  </p>
                  <p className="text-xs text-green-600">✓ Fixed: Guaranteed 40-45% space allocation</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm line-through text-gray-500">
                    Poor space distribution
                  </p>
                  <p className="text-xs text-green-600">✓ Fixed: Optimized flex ratios for mobile</p>
                </div>
              </div>
            </div>
          </div>

          {/* Testing Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Testing Instructions</h3>

            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Use Browser DevTools for Accurate Testing</p>
                  <ol className="text-xs text-gray-700 mt-2 space-y-1 list-decimal list-inside">
                    <li>Open Chrome/Edge DevTools (F12)</li>
                    <li>Toggle device toolbar (Ctrl+Shift+M)</li>
                    <li>Select iPhone 12 Pro or similar (390x844)</li>
                    <li>Click "Test Mobile" button above</li>
                    <li>Verify both tabs and decision sections are visible</li>
                    <li>Test scrolling in both sections</li>
                    <li>Rotate to landscape and verify layout adapts</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Current Viewport Info */}
          <div className="bg-gray-100 rounded-lg p-3 text-xs font-mono">
            <p>Current viewport: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}px` : 'N/A'}</p>
            <p>Device pixel ratio: {typeof window !== 'undefined' ? window.devicePixelRatio : 'N/A'}</p>
            <p className="text-gray-600 mt-1">
              Compact mode triggers at height {'<'} 700px
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Finalization Modal */}
      <SimplifiedFinalizationModal
        interventionId={testInterventionId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={() => {
          console.log('Finalization completed')
          setIsModalOpen(false)
        }}
      />
    </div>
  )
}
