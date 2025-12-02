'use client'

import { useState } from 'react'
import { PreviewHybridLot } from '@/components/properties/preview-designs/preview-hybrid-lot'
import { PreviewHybridBuilding } from '@/components/properties/preview-designs/preview-hybrid-building'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building, Home } from 'lucide-react'

// Mock data
const mockLot = {
    id: '1',
    name: 'Appartement 3A',
    address: '15 Rue de la Paix, 75002 Paris',
    image: undefined,
    surface: 65,
    floor: 3,
    rooms: 3,
    rent: 1200,
    charges: 150,
    tenant: {
        name: 'Sophie Martin',
        email: 'sophie.martin@email.com',
        phone: '06 12 34 56 78',
    },
    owner: {
        name: 'Jean Dupont',
        email: 'jean.dupont@email.com',
        phone: '06 98 76 54 32',
    }
}

const mockBuilding = {
    id: '1',
    name: 'Résidence Les Jardins',
    address: '15 Rue de la Paix, 75002 Paris',
    image: undefined,
    constructionYear: 1985,
    floors: 6,
    lotsCount: 24,
    caretaker: {
        name: 'Marie Dubois',
        email: 'marie.dubois@email.com',
        phone: '06 11 22 33 44',
    }
}

export default function TestPropertyPreviewPage() {
    const [viewMode, setViewMode] = useState<'lot' | 'building'>('lot')

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Property Preview - Test Page
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Hybrid design pattern for Lot & Building previews
                            </p>
                        </div>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            Design Test
                        </Badge>
                    </div>

                    {/* View Mode Selector */}
                    <div className="flex gap-2 mt-4">
                        <Button
                            variant={viewMode === 'lot' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('lot')}
                            className="flex items-center gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Lot Preview
                        </Button>
                        <Button
                            variant={viewMode === 'building' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('building')}
                            className="flex items-center gap-2"
                        >
                            <Building className="h-4 w-4" />
                            Building Preview
                        </Button>
                    </div>
                </div>
            </div>

            {/* Preview Container */}
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: '800px' }}>
                    {viewMode === 'lot' ? (
                        <PreviewHybridLot lot={mockLot} />
                    ) : (
                        <PreviewHybridBuilding building={mockBuilding} />
                    )}
                </div>

                {/* Design Notes */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-blue-900 mb-3">
                        🎨 Design Pattern Notes
                    </h2>
                    <div className="space-y-2 text-sm text-blue-800">
                        <p>
                            <strong>Architecture:</strong> Reuses the hybrid layout pattern from interventions
                            (sidebar + tabs + content wrapper)
                        </p>
                        <p>
                            <strong>Components:</strong> PropertySidebar, PropertyTabs, LotDetailsCard, BuildingDetailsCard, FinancialCard
                        </p>
                        <p>
                            <strong>Consistency:</strong> Same visual language, spacing, and interaction patterns as intervention previews
                        </p>
                        <p>
                            <strong>Responsive:</strong> Mobile-first design with collapsible sidebar on small screens
                        </p>
                    </div>
                </div>

                {/* Feature Comparison */}
                <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Feature Comparison
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Feature
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Lot Preview
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Building Preview
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        Sidebar Info
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        Surface, Rent, Tenant, Owner
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        Lots count, Floors, Caretaker
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        Details Tab
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        Characteristics, Description
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        Building info, Management notes
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        Finances Tab
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        ✅ Rent, Charges, Balance
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        ❌ Not applicable
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        Lots Tab
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        ❌ Not applicable
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        ✅ List of all lots
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        Documents Tab
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        ✅ Lease, Inventory
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        ✅ Rules, Maintenance log
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        Interventions Tab
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        ✅ Lot-specific interventions
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        ✅ Common area interventions
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Next Steps */}
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-amber-900 mb-3">
                        📋 Next Steps
                    </h2>
                    <ul className="space-y-2 text-sm text-amber-800">
                        <li>• <strong>Lots Tab:</strong> Create a grid/list view of lots for building preview</li>
                        <li>• <strong>Interventions Integration:</strong> Connect to real intervention data</li>
                        <li>• <strong>Financial Details:</strong> Add payment history, arrears management</li>
                        <li>• <strong>Actions:</strong> Add edit, delete, and management actions</li>
                        <li>• <strong>Real Data:</strong> Connect to Supabase for actual property data</li>
                        <li>• <strong>Mobile Optimization:</strong> Test and refine mobile experience</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
