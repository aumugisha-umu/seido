/**
 * Mail Page - Server Component
 *
 * ⚡ SSR Optimization: Fetches initial data server-side
 * for instant page load, then hydrates with Client Component for interactivity
 *
 * Server-side fetched:
 * - Email counts
 * - Buildings
 * - Email connections
 * - Linked entities
 * - Notification reply groups
 * - First page of emails (inbox)
 */

import { getServerAuthContext } from '@/lib/server-context'
import { MailClient } from './mail-client'
import type { Email } from '@/lib/types/email-integration'
import type { LinkedEntities, EmailConnection, NotificationReplyGroup } from './components/mailbox-sidebar'
import type { Building } from './components/types'

// ============================================================================
// SERVER-SIDE DATA FETCHING
// ============================================================================

async function getEmailCounts(supabase: any, teamId: string) {
  const [inboxResult, processedResult, sentResult, archiveResult] = await Promise.all([
    supabase
      .from('emails')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('direction', 'received')
      .eq('status', 'unread')
      .is('deleted_at', null),
    supabase
      .from('emails')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'processed')
      .is('deleted_at', null),
    supabase
      .from('emails')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('direction', 'sent')
      .is('deleted_at', null),
    supabase
      .from('emails')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'archived')
      .is('deleted_at', null)
  ])

  return {
    inbox: inboxResult.count || 0,
    processed: processedResult.count || 0,
    sent: sentResult.count || 0,
    drafts: 0,
    archive: archiveResult.count || 0
  }
}

async function getBuildings(supabase: any, teamId: string): Promise<Building[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select('id, name, address_record:address_id(formatted_address)')
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .order('name')

  if (error) {
    console.error('Error fetching buildings:', error)
    return []
  }

  return (data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    address: b.address_record?.formatted_address || '',
    emailCount: 0,
    lots: []
  }))
}

async function getEmailConnections(supabase: any, teamId: string): Promise<{
  connections: EmailConnection[]
  notificationRepliesCount: number
}> {
  const { data, error } = await supabase
    .from('team_email_connections')
    .select('id, email_address, provider, is_active, created_at')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching email connections:', error)
    return { connections: [], notificationRepliesCount: 0 }
  }

  // Get notification replies count
  const { count: notificationRepliesCount } = await supabase
    .from('emails')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('direction', 'received')
    .not('intervention_id', 'is', null)
    .is('deleted_at', null)

  return {
    connections: (data || []).map((c: any) => ({
      id: c.id,
      emailAddress: c.email_address,
      provider: c.provider,
      isActive: c.is_active,
      unreadCount: 0
    })),
    notificationRepliesCount: notificationRepliesCount || 0
  }
}

async function getLinkedEntities(supabase: any, teamId: string): Promise<LinkedEntities> {
  const [buildingsResult, lotsResult, contactsResult, contractsResult, interventionsResult, companiesResult] = await Promise.all([
    supabase
      .from('buildings')
      .select('id, name')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('name')
      .limit(50),
    supabase
      .from('lots')
      .select('id, name')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('name')
      .limit(50),
    supabase
      .from('users')
      .select('id, name')
      .eq('team_id', teamId)
      .in('role', ['locataire', 'prestataire'])
      .order('name')
      .limit(50),
    supabase
      .from('contracts')
      .select('id, name:contract_number')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('contract_number')
      .limit(50),
    supabase
      .from('interventions')
      .select('id, name:title')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('companies')
      .select('id, name')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('name')
      .limit(50)
  ])

  const mapData = (result: any) => (result.data || []).map((e: any) => ({
    id: e.id,
    name: e.name || 'Sans nom',
    emailCount: 0
  }))

  return {
    buildings: mapData(buildingsResult),
    lots: mapData(lotsResult),
    contacts: mapData(contactsResult),
    contracts: mapData(contractsResult),
    interventions: mapData(interventionsResult),
    companies: mapData(companiesResult)
  }
}

async function getNotificationReplyGroups(supabase: any, teamId: string): Promise<NotificationReplyGroup[]> {
  const { data, error } = await supabase
    .from('emails')
    .select(`
      intervention_id,
      interventions!inner(id, title)
    `)
    .eq('team_id', teamId)
    .eq('direction', 'received')
    .not('intervention_id', 'is', null)
    .is('deleted_at', null)

  if (error || !data) {
    return []
  }

  // Group by intervention
  const groupMap = new Map<string, { interventionId: string; interventionTitle: string; count: number }>()

  data.forEach((email: any) => {
    const id = email.intervention_id
    if (!groupMap.has(id)) {
      groupMap.set(id, {
        interventionId: id,
        interventionTitle: email.interventions?.title || 'Intervention',
        count: 0
      })
    }
    groupMap.get(id)!.count++
  })

  return Array.from(groupMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}

async function getInitialEmails(supabase: any, teamId: string): Promise<{
  emails: Email[]
  total: number
}> {
  const { data, error, count } = await supabase
    .from('emails')
    .select(`
      *,
      attachments:email_attachments(*)
    `, { count: 'exact' })
    .eq('team_id', teamId)
    .eq('direction', 'received')
    .is('deleted_at', null)
    .order('received_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching initial emails:', error)
    return { emails: [], total: 0 }
  }

  return {
    emails: data || [],
    total: count || 0
  }
}

// ============================================================================
// PAGE COMPONENT (Server)
// ============================================================================

export default async function MailPage() {
  // ⚡ Server-side auth context
  const { profile, team, supabase } = await getServerAuthContext('gestionnaire')

  // Fetch all initial data in parallel
  const [
    counts,
    buildings,
    connectionsResult,
    linkedEntities,
    notificationReplyGroups,
    emailsResult
  ] = await Promise.all([
    getEmailCounts(supabase, team.id),
    getBuildings(supabase, team.id),
    getEmailConnections(supabase, team.id),
    getLinkedEntities(supabase, team.id),
    getNotificationReplyGroups(supabase, team.id),
    getInitialEmails(supabase, team.id)
  ])

  return (
    <MailClient
      teamId={team.id}
      initialCounts={counts}
      initialBuildings={buildings}
      initialEmailConnections={connectionsResult.connections}
      initialNotificationRepliesCount={connectionsResult.notificationRepliesCount}
      initialLinkedEntities={linkedEntities}
      initialNotificationReplyGroups={notificationReplyGroups}
      initialEmails={emailsResult.emails}
      initialTotalEmails={emailsResult.total}
    />
  )
}
