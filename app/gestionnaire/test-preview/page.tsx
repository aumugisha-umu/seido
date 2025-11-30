"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PreviewModern } from '@/components/interventions/preview-designs/preview-modern'
import { PreviewDashboard } from '@/components/interventions/preview-designs/preview-dashboard'
import { PreviewTimeline } from '@/components/interventions/preview-designs/preview-timeline'
import { mockManagers, mockProviders, mockTenants, mockQuotes, mockTimeSlots, mockDescription, mockInstructions, mockComments, mockTimelineEvents } from '@/components/interventions/preview-designs/mock-data'

export default function TestPreviewPage() {
    const [activeDesign, setActiveDesign] = useState<'modern' | 'dashboard' | 'timeline'>('modern')

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
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
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

            <div className="bg-white rounded-xl shadow-sm min-h-[600px] overflow-hidden">
                {activeDesign === 'modern' && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-6 text-slate-500">Design A: Modern Minimalist</h2>
                        <PreviewModern {...commonProps} />
                    </div>
                )}
                {activeDesign === 'dashboard' && (
                    <div className="p-0">
                        {/* Dashboard design might handle its own padding/layout */}
                        <PreviewDashboard {...commonProps} />
                    </div>
                )}
                {activeDesign === 'timeline' && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-6 text-slate-500">Design C: Process Timeline</h2>
                        <PreviewTimeline {...commonProps} />
                    </div>
                )}
            </div>
        </div>
    )
}
