'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'

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

export interface LotDetailsCardProps {
    details: {
        surface: number
        floor: number
        rooms: number
        heating: string
        water: string
        exposure?: string
        annexes?: string[]
    }
}

export const LotDetailsCard = ({ details }: LotDetailsCardProps) => {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    Caractéristiques
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
                <DetailItem label="Surface habitable" value={details.surface} unit="m²" />
                <DetailItem label="Étage" value={details.floor === 0 ? 'RDC' : details.floor} />
                <DetailItem label="Nombre de pièces" value={details.rooms} />
                <DetailItem label="Chauffage" value={details.heating} />
                <DetailItem label="Eau chaude" value={details.water} />
                {details.exposure && <DetailItem label="Exposition" value={details.exposure} />}
                {details.annexes && details.annexes.length > 0 && (
                    <DetailItem label="Annexes" value={details.annexes.join(', ')} />
                )}
            </CardContent>
        </Card>
    )
}
