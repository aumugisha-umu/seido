'use client'

import { useState } from 'react'
import { PreviewHybridLayout, ContentWrapper } from '@/components/interventions/shared/layout/preview-hybrid-layout'
import { PropertySidebar } from '../shared/sidebar/property-sidebar'
import { PropertyTabs } from '../shared/layout/property-tabs'
import { BuildingDetailsCard } from '../shared/cards/building-details-card'
import { DocumentsCard } from '@/components/interventions/shared/cards/documents-card'
import { TabsContent } from '@/components/ui/tabs'
import { FileText, Building, Euro, Wrench, Users, MapPin, Home } from 'lucide-react'

// Mock data types
interface BuildingData {
    id: string
    name: string
    address: string
    image?: string
    constructionYear: number
    floors: number
    lotsCount: number
    caretaker?: {
        name: string
        email: string
        phone: string
        avatar?: string
    }
}

export function PreviewHybridBuilding({ building }: { building: BuildingData }) {
    const [activeTab, setActiveTab] = useState('details')

    const sidebar = (
        <PropertySidebar
            title={building.name}
            subtitle={building.address}
            type="building"
            image={building.image}
            stats={[
                { label: 'Lots', value: building.lotsCount.toString(), icon: Building },
                { label: 'Étages', value: building.floors.toString(), icon: Building },
            ]}
            contacts={[
                ...(building.caretaker ? [{
                    role: 'Gardien',
                    name: building.caretaker.name,
                    email: building.caretaker.email,
                    phone: building.caretaker.phone,
                    avatar: building.caretaker.avatar
                }] : [])
            ]}
        />
    )

    const tabs = [
        { value: 'details', label: 'Détails', icon: Building },
        { value: 'lots', label: 'Lots', icon: Home },
        { value: 'documents', label: 'Documents', icon: FileText },
        { value: 'interventions', label: 'Interventions', icon: Wrench },
    ]

    return (
        <PreviewHybridLayout
            sidebar={sidebar}
            content={
                <PropertyTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    tabs={tabs}
                >
                    <TabsContent value="details" className="flex-1 overflow-y-auto block">
                        <ContentWrapper>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <BuildingDetailsCard
                                    details={{
                                        constructionYear: building.constructionYear,
                                        floors: building.floors,
                                        lotsCount: building.lotsCount,
                                        elevator: true,
                                        digicode: true,
                                        caretaker: !!building.caretaker,
                                        heating: 'Collectif gaz'
                                    }}
                                />
                                <div className="bg-slate-50 rounded-lg p-6 border border-slate-100">
                                    <h3 className="font-medium text-slate-900 mb-2">Note de gestion</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Immeuble calme, bien entretenu. Digicode changé en 2023.
                                        Prochaine AG prévue en Mars 2025.
                                    </p>
                                </div>
                            </div>
                        </ContentWrapper>
                    </TabsContent>

                    <TabsContent value="lots" className="flex-1 overflow-y-auto block">
                        <ContentWrapper>
                            <div className="text-center py-12 text-slate-500">
                                <Home className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                <p>Liste des lots (Grid View)</p>
                            </div>
                        </ContentWrapper>
                    </TabsContent>

                    <TabsContent value="documents" className="flex-1 overflow-y-auto block">
                        <ContentWrapper>
                            <DocumentsCard
                                documents={[
                                    { id: '1', name: 'Règlement de copropriété.pdf', type: 'pdf', size: '8.4 MB', date: '2020-01-01', author: 'Syndic' },
                                    { id: '2', name: 'Carnet d\'entretien.pdf', type: 'pdf', size: '1.2 MB', date: '2024-01-01', author: 'Syndic' }
                                ]}
                                userRole="manager"
                            />
                        </ContentWrapper>
                    </TabsContent>

                    <TabsContent value="interventions" className="flex-1 overflow-y-auto block">
                        <ContentWrapper>
                            <div className="text-center py-12 text-slate-500">
                                <Wrench className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                <p>Aucune intervention commune en cours</p>
                            </div>
                        </ContentWrapper>
                    </TabsContent>
                </PropertyTabs>
            }
        />
    )
}
