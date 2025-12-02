'use client'

import { useState } from 'react'
import { PreviewHybridLayout, ContentWrapper } from '@/components/interventions/shared/layout/preview-hybrid-layout'
import { PropertySidebar } from '../shared/sidebar/property-sidebar'
import { PropertyTabs } from '../shared/layout/property-tabs'
import { LotDetailsCard } from '../shared/cards/lot-details-card'
import { FinancialCard } from '../shared/cards/financial-card'
import { DocumentsCard } from '@/components/interventions/shared/cards/documents-card'
import { TabsContent } from '@/components/ui/tabs'
import { FileText, Home, Euro, Wrench, Ruler, MapPin } from 'lucide-react'

// Mock data types (should be replaced by real types)
interface LotData {
    id: string
    name: string
    address: string
    image?: string
    surface: number
    floor: number
    rooms: number
    rent: number
    charges: number
    tenant?: {
        name: string
        email: string
        phone: string
        avatar?: string
    }
    owner?: {
        name: string
        email: string
        phone: string
        avatar?: string
    }
}

export function PreviewHybridLot({ lot }: { lot: LotData }) {
    const [activeTab, setActiveTab] = useState('details')

    const sidebar = (
        <PropertySidebar
            title={lot.name}
            subtitle={lot.address}
            type="lot"
            image={lot.image}
            stats={[
                { label: 'Surface', value: `${lot.surface} m²`, icon: Ruler },
                { label: 'Loyer', value: `${lot.rent + lot.charges} €`, icon: Euro },
            ]}
            contacts={[
                ...(lot.tenant ? [{
                    role: 'Locataire',
                    name: lot.tenant.name,
                    email: lot.tenant.email,
                    phone: lot.tenant.phone,
                    avatar: lot.tenant.avatar
                }] : []),
                ...(lot.owner ? [{
                    role: 'Propriétaire',
                    name: lot.owner.name,
                    email: lot.owner.email,
                    phone: lot.owner.phone,
                    avatar: lot.owner.avatar
                }] : [])
            ]}
        />
    )

    const tabs = [
        { value: 'details', label: 'Détails', icon: Home },
        { value: 'finances', label: 'Finances', icon: Euro },
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
                                <LotDetailsCard
                                    details={{
                                        surface: lot.surface,
                                        floor: lot.floor,
                                        rooms: lot.rooms,
                                        heating: 'Individuel électrique',
                                        water: 'Ballon électrique',
                                        exposure: 'Sud-Ouest',
                                        annexes: ['Cave', 'Parking']
                                    }}
                                />
                                {/* Placeholder for description or other info */}
                                <div className="bg-slate-50 rounded-lg p-6 border border-slate-100">
                                    <h3 className="font-medium text-slate-900 mb-2">Description</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Bel appartement lumineux situé au {lot.floor === 0 ? 'rez-de-chaussée' : `${lot.floor}ème étage`}.
                                        Refait à neuf récemment. Proche de toutes commodités.
                                    </p>
                                </div>
                            </div>
                        </ContentWrapper>
                    </TabsContent>

                    <TabsContent value="finances" className="flex-1 overflow-y-auto block">
                        <ContentWrapper>
                            <FinancialCard
                                rent={{
                                    amount: lot.rent,
                                    charges: lot.charges,
                                    currency: '€'
                                }}
                                balance={{
                                    amount: 0,
                                    status: 'up_to_date'
                                }}
                                nextPayment="05/02/2025"
                            />
                        </ContentWrapper>
                    </TabsContent>

                    <TabsContent value="documents" className="flex-1 overflow-y-auto block">
                        <ContentWrapper>
                            <DocumentsCard
                                documents={[
                                    { id: '1', name: 'Bail.pdf', type: 'pdf', size: '2.4 MB', date: '2024-01-01', author: 'Agence' },
                                    { id: '2', name: 'État des lieux.pdf', type: 'pdf', size: '5.1 MB', date: '2024-01-01', author: 'Agence' }
                                ]}
                                userRole="manager"
                            />
                        </ContentWrapper>
                    </TabsContent>

                    <TabsContent value="interventions" className="flex-1 overflow-y-auto block">
                        <ContentWrapper>
                            <div className="text-center py-12 text-slate-500">
                                <Wrench className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                <p>Aucune intervention en cours</p>
                            </div>
                        </ContentWrapper>
                    </TabsContent>
                </PropertyTabs>
            }
        />
    )
}
