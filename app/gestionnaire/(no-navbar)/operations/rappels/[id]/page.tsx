import { getServerAuthContext } from '@/lib/server-context'
import { createServerReminderService } from '@/lib/services'
import { notFound } from 'next/navigation'
import { ReminderDetailClient } from './reminder-detail-client'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ReminderDetailPage({ params }: PageProps) {
  const { id } = await params
  const { profile, team } = await getServerAuthContext('gestionnaire')

  const reminderService = await createServerReminderService()
  const reminder = await reminderService.getById(id)

  if (!reminder) {
    notFound()
  }

  return (
    <ReminderDetailClient
      reminder={reminder}
      userId={profile.id}
      teamId={team.id}
    />
  )
}
