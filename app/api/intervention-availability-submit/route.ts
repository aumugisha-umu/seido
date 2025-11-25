import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { z } from 'zod'

// Validation schema for availability submission
const availabilitySchema = z.object({
    date: z.string().min(1, 'Date is required'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').nullable(),
    isFlexible: z.boolean().optional().default(false)
})

const submitAvailabilitySchema = z.object({
    interventionId: z.string().uuid('Invalid intervention ID'),
    providerAvailabilities: z.array(availabilitySchema).min(1, 'At least one availability is required')
})

export async function POST(request: NextRequest) {
    logger.info({}, "✅ intervention-availability-submit API route called")

    try {
        // ✅ AUTH + ROLE CHECK: prestataire required
        const authResult = await getApiAuthContext({ requiredRole: 'prestataire' })
        if (!authResult.success) return authResult.error

        const { supabase, userProfile: user } = authResult.data

        logger.info({ authUserId: user.id, email: user.email }, "🔍 Auth user found")

        // Parse request body
        const body = await request.json()

        // ✅ ZOD VALIDATION
        const validation = submitAvailabilitySchema.safeParse(body)
        if (!validation.success) {
            logger.warn({ errors: validation.error.flatten() }, '⚠️ [AVAILABILITY-SUBMIT] Validation failed')
            return NextResponse.json({
                success: false,
                error: 'Données invalides',
                details: validation.error.flatten().fieldErrors
            }, { status: 400 })
        }

        const { interventionId, providerAvailabilities } = validation.data

        logger.info({
            interventionId,
            availabilitiesCount: providerAvailabilities.length,
            providerId: user.id
        }, "📅 Availability submission data received and validated")

        // Get intervention details to verify it exists
        const { data: intervention, error: interventionError } = await supabase
            .from('interventions')
            .select('id, title, status, team_id')
            .eq('id', interventionId)
            .single()

        if (interventionError || !intervention) {
            logger.error({ interventionError }, "❌ Intervention not found")
            return NextResponse.json({
                success: false,
                error: 'Intervention non trouvée'
            }, { status: 404 })
        }

        // First, delete existing slots proposed by this provider for this intervention
        logger.info({ interventionId, providerId: user.id }, "🗑️ Deleting existing provider availabilities")

        const { error: deleteError } = await supabase
            .from('intervention_time_slots')
            .delete()
            .eq('intervention_id', interventionId)
            .eq('proposed_by', user.id)

        if (deleteError) {
            logger.warn({ deleteError }, "⚠️ Could not delete existing time slots")
            // Continue anyway - this is not critical
        }

        // Insert new time slots - only include slots with all required fields
        // Status is 'pending' when created by provider
        const timeSlotData = providerAvailabilities
            .filter(avail => avail.date && avail.startTime && avail.endTime)
            .map(avail => ({
                intervention_id: interventionId,
                slot_date: avail.date,
                start_time: avail.startTime,
                end_time: avail.endTime!, // We know it's not null because of the filter above
                proposed_by: user.id,
                status: 'pending' as const
            }))

        if (timeSlotData.length === 0) {
            logger.warn({}, "⚠️ No valid time slots to insert (all missing endTime)")
            return NextResponse.json({
                success: false,
                error: 'Aucune disponibilité valide à enregistrer'
            }, { status: 400 })
        }

        const { data: createdSlots, error: slotError } = await supabase
            .from('intervention_time_slots')
            .insert(timeSlotData)
            .select('*')

        if (slotError) {
            logger.error({ slotError }, "❌ Error creating intervention time slots")
            return NextResponse.json({
                success: false,
                error: 'Erreur lors de la création des disponibilités'
            }, { status: 500 })
        }

        logger.info({ count: createdSlots?.length || 0 }, "✅ Intervention time slots created successfully")

        return NextResponse.json({
            success: true,
            availabilities: createdSlots,
            message: 'Disponibilités enregistrées avec succès'
        })

    } catch (error) {
        logger.error({ error, message: error instanceof Error ? error.message : 'Unknown' }, "❌ Error in intervention-availability-submit API")

        return NextResponse.json({
            success: false,
            error: 'Erreur lors de la soumission des disponibilités'
        }, { status: 500 })
    }
}
