import { getServerAuthContext } from '@/lib/server-context'
import { notFound } from 'next/navigation'
import { getWhatsAppTriageItemById } from '@/app/actions/whatsapp-triage-actions'
import { TriageDetailClient } from './triage-detail-client'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function TriageDetailPage({ params }: PageProps) {
  const { id } = await params
  await getServerAuthContext('gestionnaire')

  const item = await getWhatsAppTriageItemById(id)

  if (!item) {
    notFound()
  }

  return <TriageDetailClient item={item} />
}
