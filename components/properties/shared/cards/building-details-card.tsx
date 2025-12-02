'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building } from 'lucide-react'

interface DetailItemProps {
    label: string
    value: string | number
    unit?: string
}

const DetailItem = ({ label, value, unit }: DetailItemProps) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="text-sm font-medium text-slate-900">
            {value} {unit && <span className="text-slate-500 font-normal">{unit}</span>}
        </span>
    </div>
)

export interface BuildingDetailsCardProps {
    details: {
        constructionYear: number
        floors: number
        lotsCount: number
        elevator: boolean
        digicode: boolean
        caretaker: boolean
        heating: string
    }
}

export const BuildingDetailsCard = ({ details }: BuildingDetailsCardProps) => {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    Informations Immeuble
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
                <DetailItem label="Année de construction" value={details.constructionYear} />
                <DetailItem label="Nombre d'étages" value={details.floors} />
                <DetailItem label="Nombre de lots" value={details.lotsCount} />
                <DetailItem label="Ascenseur" value={details.elevator ? 'Oui' : 'Non'} />
                <DetailItem label="Digicode" value={details.digicode ? 'Oui' : 'Non'} />
                <DetailItem label="Gardien" value={details.caretaker ? 'Oui' : 'Non'} />
                <DetailItem label="Chauffage" value={details.heating} />
            </CardContent>
        </Card>
    )
}
