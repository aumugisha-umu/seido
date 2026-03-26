import { getServerAuthContext } from '@/lib/server-context'
import { BankConnectionRepository } from '@/lib/services/repositories/bank-connection.repository'
import { BankTransactionRepository } from '@/lib/services/repositories/bank-transaction.repository'
import { BanqueTabs } from '@/components/bank/banque-tabs'
import { EmptyBankState } from '@/components/bank/empty-bank-state'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export default async function BanquePage() {
  const { team, supabase } = await getServerAuthContext('gestionnaire')

  let connections: Awaited<ReturnType<BankConnectionRepository['getConnectionsByTeam']>> = []
  let toReconcileCount = 0

  try {
    const connectionRepo = new BankConnectionRepository(supabase)
    const transactionRepo = new BankTransactionRepository(supabase)

    const [conns, count] = await Promise.all([
      connectionRepo.getConnectionsByTeam(team.id),
      transactionRepo.getToReconcileCount(team.id),
    ])
    connections = conns
    toReconcileCount = count
  } catch (error) {
    logger.warn({ error }, '[BANQUE-PAGE] Failed to load bank data — showing empty state')
  }

  if (connections.length === 0) {
    return <EmptyBankState />
  }

  return (
    <BanqueTabs
      connections={connections}
      toReconcileCount={toReconcileCount}
    />
  )
}
