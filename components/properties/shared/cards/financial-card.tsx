'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Euro } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface FinancialCardProps {
    rent: {
        amount: number
        charges: number
        currency: string
    }
    balance: {
        amount: number
        status: 'up_to_date' | 'late' | 'credit'
    }
    nextPayment: string
}

export const FinancialCard = ({ rent, balance, nextPayment }: FinancialCardProps) => {
    const total = rent.amount + rent.charges

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Euro className="h-4 w-4 text-muted-foreground" />
                        Situation Financière
                    </CardTitle>
                    <Badge
                        variant={balance.status === 'late' ? 'destructive' : 'outline'}
                        className={balance.status === 'up_to_date' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                    >
                        {balance.status === 'up_to_date' ? 'À jour' : balance.status === 'late' ? 'En retard' : 'Créditeur'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
                <div>
                    <p className="text-sm text-slate-500 mb-1">Loyer mensuel (CC)</p>
                    <p className="text-2xl font-bold text-slate-900">
                        {total} {rent.currency}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Dont {rent.charges} {rent.currency} de charges
                    </p>
                </div>
                <div>
                    <p className="text-sm text-slate-500 mb-1">Solde actuel</p>
                    <p className={`text-2xl font-bold ${balance.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {balance.amount > 0 ? '-' : '+'}{Math.abs(balance.amount)} {rent.currency}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Prochaine échéance : {nextPayment}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
