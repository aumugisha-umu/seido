'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ComptesTab } from '@/components/bank/comptes-tab'
import { TransactionsTab } from '@/components/bank/transactions-tab'
import type { BankConnectionSafe } from '@/lib/types/bank.types'

const TABS = [
  { value: 'transactions', label: 'Transactions' },
  { value: 'comptes', label: 'Comptes' },
  { value: 'regles', label: 'Regles' },
  { value: 'rapports', label: 'Rapports' },
] as const

type TabValue = (typeof TABS)[number]['value']

const DEFAULT_TAB: TabValue = 'transactions'

interface BanqueTabsProps {
  connections: BankConnectionSafe[]
  toReconcileCount: number
}

export function BanqueTabs({ connections, toReconcileCount }: BanqueTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const currentTab = (searchParams.get('tab') as TabValue) || DEFAULT_TAB
  const isValidTab = TABS.some((t) => t.value === currentTab)
  const activeTab = isValidTab ? currentTab : DEFAULT_TAB

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === DEFAULT_TAB) {
        params.delete('tab')
      } else {
        params.set('tab', value)
      }
      const query = params.toString()
      router.push(`/gestionnaire/banque${query ? `?${query}` : ''}`)
    },
    [searchParams, router]
  )

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <div className="overflow-x-auto -mx-1 px-1">
        <TabsList className="w-full sm:w-auto">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-2"
              data-testid={`bank-tab-${tab.value}`}
            >
              {tab.label}
              {tab.value === 'transactions' && toReconcileCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {toReconcileCount}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="transactions">
        <TransactionsTab connections={connections} />
      </TabsContent>

      <TabsContent value="comptes">
        <ComptesTab connections={connections} />
      </TabsContent>

      <TabsContent value="regles">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Les regles de rapprochement automatique seront disponibles prochainement.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="rapports">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Les rapports bancaires seront disponibles prochainement.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  )
}
