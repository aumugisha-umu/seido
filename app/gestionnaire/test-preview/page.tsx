"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PreviewModern } from '@/components/interventions/preview-designs/preview-modern'
import { PreviewDashboard } from '@/components/interventions/preview-designs/preview-dashboard'
import { PreviewTimeline } from '@/components/interventions/preview-designs/preview-timeline'
import { PreviewHybridManager } from '@/components/interventions/preview-designs/preview-hybrid-manager'
import { PreviewHybridTenant } from '@/components/interventions/preview-designs/preview-hybrid-tenant'
import { PreviewHybridProvider } from '@/components/interventions/preview-designs/preview-hybrid-provider'
import { mockManagers, mockProviders, mockTenants, mockQuotes, mockTimeSlots, mockDescription, mockInstructions, mockComments, mockTimelineEvents } from '@/components/interventions/preview-designs/mock-data'

export default function TestPreviewPage() {
    const [activeDesign, setActiveDesign] = useState<'modern' | 'dashboard' | 'timeline' | 'hybrid-manager' | 'hybrid-tenant' | 'hybrid-provider'>('modern')

    const commonProps = {
        managers: mockManagers,
        providers: mockProviders,
        tenants: mockTenants,
        requireQuote: true,
        quotes: mockQuotes,
        schedulingType: 'slots' as const,
        fullTimeSlots: mockTimeSlots,
        currentUserRole: 'gestionnaire' as const,
        canManageSlots: true,
        currentUserId: '1',
        description: mockDescription,
        instructions: mockInstructions,
        comments: mockComments,
        timelineEvents: mockTimelineEvents
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 space-y-8">
            <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-800">Test Designs: Intervention Preview</h1>
                    <div className="flex gap-2">
                        <Button
                            variant={activeDesign === 'modern' ? 'default' : 'outline'}
                            onClick={() => setActiveDesign('modern')}
                        >
                            Design A: Modern
                        </Button>
                        <Button
                            variant={activeDesign === 'dashboard' ? 'default' : 'outline'}
                            onClick={() => setActiveDesign('dashboard')}
                        >
                            Design B: Dashboard
                        </Button>
                        <Button
                            variant={activeDesign === 'timeline' ? 'default' : 'outline'}
                            onClick={() => setActiveDesign('timeline')}
                        >
                            Design C: Timeline
                        </Button>
                    </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <span className="text-sm font-medium text-slate-500 py-2">Hybrid Designs:</span>
                    <Button
                        variant={activeDesign === 'hybrid-manager' ? 'default' : 'outline'}
                        onClick={() => setActiveDesign('hybrid-manager')}
                        size="sm"
                    >
                        Manager View
                    </Button>
                    <Button
                        variant={activeDesign === 'hybrid-tenant' ? 'default' : 'outline'}
                        onClick={() => setActiveDesign('hybrid-tenant')}
                        size="sm"
                    >
                        Tenant View
                    </Button>
                    <Button
                        variant={activeDesign === 'hybrid-provider' ? 'default' : 'outline'}
                        onClick={() => setActiveDesign('hybrid-provider')}
                        size="sm"
                    >
                        Provider View
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm min-h-[600px] overflow-hidden">
                {activeDesign === 'modern' && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-6 text-slate-500">Design A: Modern Minimalist</h2>
                        <PreviewModern {...commonProps} />
                    </div>
                )}
                {activeDesign === 'dashboard' && (
                    <div className="p-0">
                        <PreviewDashboard {...commonProps} />
                    </div>
                )}
                {activeDesign === 'timeline' && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-6 text-slate-500">Design C: Process Timeline</h2>
                        <PreviewTimeline {...commonProps} />
                    </div>
                )}
                {activeDesign === 'hybrid-manager' && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-6 text-slate-500">Hybrid Design: Manager View</h2>
                        <PreviewHybridManager {...commonProps} />
                    </div>
                )}
                {activeDesign === 'hybrid-tenant' && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-6 text-slate-500">Hybrid Design: Tenant View</h2>
                        <PreviewHybridTenant {...commonProps} />
                    </div>
                )}
                {activeDesign === 'hybrid-provider' && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-6 text-slate-500">Hybrid Design: Provider View</h2>
                        <PreviewHybridProvider {...commonProps} />
                    </div>
                )}
            </div>
        </div>
    )
}
