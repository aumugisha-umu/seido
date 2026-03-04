/**
 * Cron Job - Rappels RDV Intervention (24h + 1h)
 *
 * Envoie des rappels aux locataires, prestataires et gestionnaires
 * pour les interventions planifiées à venir.
 *
 * Fréquence: Toutes les heures (0 * * * *)
 * Windows: 24h (23h-25h) et 1h (50min-70min) pour tolérer le cron interval
 *
 * Canaux:
 * - Groupe 1 (tous gestionnaires équipe): in-app seulement
 * - Groupe 2 (gestionnaires assignés, hors créateur): push + email
 * - Groupe 3 (locataires + prestataires assignés): in-app + push + email
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { sendPushNotificationToUsers } from '@/lib/send-push-notification'
import { EmailService } from '@/lib/services/domain/email.service'
import { InterventionReminderEmail } from '@/emails/templates/interventions/intervention-reminder'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // seconds

interface ReminderWindow {
  type: '24h' | '1h'
  fromMinutes: number
  toMinutes: number
}

const REMINDER_WINDOWS: ReminderWindow[] = [
  { type: '24h', fromMinutes: 23 * 60, toMinutes: 25 * 60 },
  { type: '1h', fromMinutes: 50, toMinutes: 70 },
]

export async function GET(request: Request) {
  const startTime = Date.now()

  // 1. Auth: verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const results: Array<{
      interventionId: string
      reminderType: string
      inApp: number
      push: number
      email: number
    }> = []

    for (const window of REMINDER_WINDOWS) {
      const windowStart = new Date(now.getTime() + window.fromMinutes * 60 * 1000)
      const windowEnd = new Date(now.getTime() + window.toMinutes * 60 * 1000)

      logger.info({
        reminderType: window.type,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
      }, `🔔 [CRON-REMINDERS] Checking ${window.type} window`)

      // 2. Query interventions in this window
      const { data: interventions, error: queryError } = await supabase
        .from('interventions')
        .select(`
          id,
          title,
          reference,
          status,
          scheduled_date,
          type,
          team_id,
          created_by,
          lots(
            reference,
            address_record:address_id(street, postal_code, city)
          ),
          buildings!interventions_building_id_fkey(
            address_record:address_id(street, postal_code, city)
          ),
          selected_slot:selected_slot_id(
            slot_date,
            start_time,
            end_time
          )
        `)
        .eq('status', 'planifiee')
        .gte('scheduled_date', windowStart.toISOString())
        .lt('scheduled_date', windowEnd.toISOString())

      if (queryError) {
        logger.error({ error: queryError }, `❌ [CRON-REMINDERS] Query error for ${window.type}`)
        continue
      }

      if (!interventions || interventions.length === 0) {
        logger.info({ reminderType: window.type }, '📭 [CRON-REMINDERS] No interventions in window')
        continue
      }

      logger.info({
        reminderType: window.type,
        count: interventions.length,
      }, '📋 [CRON-REMINDERS] Interventions found in window')

      // Instantiate EmailService once per window (avoid repeated fs.readFileSync in constructor)
      const emailService = new EmailService()
      const emailConfigured = emailService.isConfigured()

      // 3. Process each intervention
      for (const intervention of interventions) {
        // 3a. Deduplication: check if reminder already sent
        const { data: existingReminder } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'reminder')
          .eq('related_entity_type', 'intervention')
          .eq('related_entity_id', intervention.id)
          .filter('metadata->>reminderType', 'eq', window.type)
          .limit(1)

        if (existingReminder && existingReminder.length > 0) {
          logger.info({
            interventionId: intervention.id,
            reminderType: window.type,
          }, '⏭️ [CRON-REMINDERS] Reminder already sent, skipping')
          continue
        }

        // 3b. Get assignments (locataires, prestataires, gestionnaires)
        const { data: assignments, error: assignError } = await supabase
          .from('intervention_assignments')
          .select(`
            user_id,
            role,
            users!intervention_assignments_user_id_fkey(
              id,
              email,
              first_name,
              last_name,
              name,
              role
            )
          `)
          .eq('intervention_id', intervention.id)

        if (assignError || !assignments) {
          logger.error({ error: assignError, interventionId: intervention.id }, '❌ [CRON-REMINDERS] Failed to fetch assignments')
          continue
        }

        // 3c. Get ALL team gestionnaires (for group 1: in-app only)
        const { data: teamManagers } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', intervention.team_id)
          .eq('role', 'gestionnaire')

        // Build property address (lot address → building address fallback)
        const lot = intervention.lots as any
        const building = (intervention as any).buildings as any
        const addressRecord = lot?.address_record || building?.address_record
        const propertyAddress = addressRecord
          ? `${addressRecord.street || ''}, ${addressRecord.postal_code || ''} ${addressRecord.city || ''}`.trim().replace(/^,\s*/, '')
          : 'Adresse non renseignée'
        const lotReference = lot?.reference || undefined
        const interventionType = intervention.type || 'Intervention'

        if (!intervention.scheduled_date) {
          logger.warn({ interventionId: intervention.id }, '⚠️ [CRON-REMINDERS] No scheduled_date, skipping')
          continue
        }
        const scheduledDate = new Date(intervention.scheduled_date)

        // Extraire les horaires du créneau sélectionné
        const selectedSlot = (intervention as any).selected_slot as any
        const slotStartTime: string | undefined = selectedSlot?.start_time || undefined
        const slotEndTime: string | undefined = selectedSlot?.end_time || undefined

        // Construire le label horaire pour les messages in-app/push
        const timeLabel = (slotStartTime && slotEndTime)
          ? `de ${slotStartTime} à ${slotEndTime}`
          : `à ${scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

        // Find provider and tenant from assignments
        const providerAssignment = assignments.find(a => a.role === 'prestataire')
        const tenantAssignment = assignments.find(a => a.role === 'locataire')
        const providerUser = providerAssignment?.users as any
        const tenantUser = tenantAssignment?.users as any

        const providerName = providerUser
          ? `${providerUser.first_name || ''} ${providerUser.last_name || ''}`.trim() || providerUser.name || 'Prestataire'
          : 'Prestataire'
        const tenantName = tenantUser
          ? `${tenantUser.first_name || ''} ${tenantUser.last_name || ''}`.trim() || tenantUser.name || 'Locataire'
          : undefined

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seido.app'
        let inAppCount = 0
        let pushCount = 0
        let emailCount = 0

        // ═══════════════════════════════════════════════════════
        // GROUP 1: All team gestionnaires → in-app only (batch INSERT)
        // ═══════════════════════════════════════════════════════
        if (teamManagers && teamManagers.length > 0) {
          const managerNotifications = teamManagers.map(manager => ({
            user_id: manager.user_id,
            team_id: intervention.team_id,
            type: 'reminder' as const,
            title: `🔔 Rappel : intervention dans ${window.type === '24h' ? '24h' : '1h'}`,
            message: `L'intervention "${intervention.title || intervention.reference}" est planifiée le ${scheduledDate.toLocaleDateString('fr-FR')} ${timeLabel}`,
            is_personal: false,
            metadata: {
              reminderType: window.type,
              scheduled_date: intervention.scheduled_date,
              provider_name: providerName,
              tenant_name: tenantName,
            },
            related_entity_type: 'intervention',
            related_entity_id: intervention.id,
            read: false,
          }))

          const { count, error: batchError } = await supabase
            .from('notifications')
            .insert(managerNotifications, { count: 'exact' })

          if (!batchError) inAppCount += count ?? managerNotifications.length
        }

        // ═══════════════════════════════════════════════════════
        // GROUP 2: Assigned gestionnaires (except creator) → push + email
        // ═══════════════════════════════════════════════════════
        const assignedManagersToNotify = assignments.filter(
          a => a.role === 'gestionnaire' && a.user_id !== intervention.created_by
        )

        if (assignedManagersToNotify.length > 0) {
          const managerIds = assignedManagersToNotify.map(a => a.user_id)

          // Push
          try {
            const pushResult = await sendPushNotificationToUsers(managerIds, {
              title: `🔔 Rappel intervention dans ${window.type === '24h' ? '24h' : '1h'}`,
              message: `${intervention.title || intervention.reference} - ${slotStartTime && slotEndTime ? `${slotStartTime}-${slotEndTime}` : providerName}`,
              url: `/gestionnaire/interventions/${intervention.id}`,
              type: 'reminder',
            })
            pushCount += pushResult.success
          } catch (err) {
            logger.warn({ err }, '⚠️ [CRON-REMINDERS] Push failed for gestionnaires')
          }

          // Email (parallelized)
          try {
            if (emailConfigured) {
              const emailPromises = assignedManagersToNotify
                .map(assignment => {
                  const user = assignment.users as any
                  if (!user?.email) return null
                  const firstName = user.first_name || user.name || 'Gestionnaire'
                  const interventionUrl = `${baseUrl}/gestionnaire/interventions/${intervention.id}`
                  return emailService.send({
                    to: user.email,
                    subject: `🔔 Rappel ${window.type} - ${intervention.reference || intervention.title}`,
                    react: InterventionReminderEmail({
                      firstName,
                      interventionRef: intervention.reference || 'N/A',
                      interventionType,
                      description: intervention.title || '',
                      propertyAddress,
                      lotReference,
                      interventionUrl,
                      providerName,
                      scheduledDate,
                      startTime: slotStartTime,
                      endTime: slotEndTime,
                      recipientRole: 'gestionnaire',
                      reminderType: window.type,
                      tenantName,
                    }),
                    tags: [{ name: 'type', value: `intervention_reminder_${window.type}` }],
                  })
                })
                .filter(Boolean)

              const emailResults = await Promise.allSettled(emailPromises)
              emailCount += emailResults.filter(r => r.status === 'fulfilled' && (r.value as any)?.success).length
            }
          } catch (err) {
            logger.warn({ err }, '⚠️ [CRON-REMINDERS] Email failed for gestionnaires')
          }
        }

        // ═══════════════════════════════════════════════════════
        // GROUP 3: Locataires + Prestataires → in-app + push + email
        // ═══════════════════════════════════════════════════════
        const externalAssignments = assignments.filter(
          a => a.role === 'locataire' || a.role === 'prestataire'
        )

        // Batch in-app notifications for external assignments
        const validExternals = externalAssignments.filter(a => (a.users as any) != null)
        if (validExternals.length > 0) {
          const externalNotifications = validExternals.map(assignment => {
            const role = assignment.role as 'locataire' | 'prestataire'
            return {
              user_id: assignment.user_id,
              team_id: intervention.team_id,
              type: 'reminder' as const,
              title: `🔔 Rappel : intervention dans ${window.type === '24h' ? '24h' : '1h'}`,
              message: role === 'locataire'
                ? `Votre rendez-vous avec ${providerName} est prévu le ${scheduledDate.toLocaleDateString('fr-FR')} ${timeLabel}`
                : `Votre intervention au ${propertyAddress} est prévue le ${scheduledDate.toLocaleDateString('fr-FR')} ${timeLabel}`,
              is_personal: true,
              metadata: {
                reminderType: window.type,
                scheduled_date: intervention.scheduled_date,
                assigned_role: role,
              },
              related_entity_type: 'intervention',
              related_entity_id: intervention.id,
              read: false,
            }
          })

          const { count: extCount, error: extError } = await supabase
            .from('notifications')
            .insert(externalNotifications, { count: 'exact' })

          if (!extError) inAppCount += extCount ?? externalNotifications.length

          // Parallelize push + email for all external assignments
          const pushAndEmailPromises = validExternals.map(async (assignment) => {
            const user = assignment.users as any
            const role = assignment.role as 'locataire' | 'prestataire'
            const rolePrefix = role === 'locataire' ? 'locataire' : 'prestataire'
            const firstName = user.first_name || user.name || (role === 'locataire' ? 'Locataire' : 'Prestataire')

            // Push
            try {
              const pushResult = await sendPushNotificationToUsers([assignment.user_id], {
                title: `🔔 Rappel dans ${window.type === '24h' ? '24h' : '1h'}`,
                message: role === 'locataire'
                  ? `RDV avec ${providerName}${slotStartTime ? ` à ${slotStartTime}` : ''}`
                  : `Intervention ${slotStartTime && slotEndTime ? `${slotStartTime}-${slotEndTime}` : propertyAddress.substring(0, 40)}`,
                url: `/${rolePrefix}/interventions/${intervention.id}`,
                type: 'reminder',
              })
              pushCount += pushResult.success
            } catch (err) {
              logger.warn({ err, role }, '⚠️ [CRON-REMINDERS] Push failed')
            }

            // Email
            if (user.email && emailConfigured) {
              try {
                const interventionUrl = `${baseUrl}/${rolePrefix}/interventions/${intervention.id}`
                const result = await emailService.send({
                  to: user.email,
                  subject: `🔔 Rappel ${window.type} - ${intervention.reference || intervention.title}`,
                  react: InterventionReminderEmail({
                    firstName,
                    interventionRef: intervention.reference || 'N/A',
                    interventionType,
                    description: intervention.title || '',
                    propertyAddress,
                    lotReference,
                    interventionUrl,
                    providerName,
                    scheduledDate,
                    startTime: slotStartTime,
                    endTime: slotEndTime,
                    recipientRole: role,
                    reminderType: window.type,
                    tenantName,
                  }),
                  tags: [{ name: 'type', value: `intervention_reminder_${window.type}` }],
                })
                if (result.success) emailCount++
              } catch (err) {
                logger.warn({ err, role }, '⚠️ [CRON-REMINDERS] Email failed')
              }
            }
          })

          await Promise.allSettled(pushAndEmailPromises)
        }

        results.push({
          interventionId: intervention.id,
          reminderType: window.type,
          inApp: inAppCount,
          push: pushCount,
          email: emailCount,
        })

        logger.info({
          interventionId: intervention.id,
          reminderType: window.type,
          inApp: inAppCount,
          push: pushCount,
          email: emailCount,
        }, '✅ [CRON-REMINDERS] Reminders sent for intervention')
      }
    }

    const duration = Date.now() - startTime
    logger.info({ results, duration }, '✅ [CRON-REMINDERS] Cron job completed')

    return NextResponse.json({
      success: true,
      results,
      duration,
    })
  } catch (error: any) {
    logger.error({ error, duration: Date.now() - startTime }, '❌ [CRON-REMINDERS] Cron job failed')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
