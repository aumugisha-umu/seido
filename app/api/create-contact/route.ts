import { createServerContactService } from '@/lib/services'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient, isServiceRoleAvailable } from '@/lib/api-service-role-helper'
import { createContactSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { createContactNotification } from '@/app/actions/notifications'

export async function POST(request: Request) {
  try {
    // ✅ SECURITY FIX: Cette route n'avait AUCUNE vérification d'auth!
    // N'importe qui pouvait créer des contacts sans être connecté
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(createContactSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [CREATE-CONTACT] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const {
      name,
      first_name,
      last_name,
      email,
      phone,
      address,
      notes,
      role, // ✅ Nouveau champ direct
      provider_category, // ✅ Nouveau champ direct
      speciality,
      team_id,
      is_active = true
    } = validatedData

    const supabaseAdmin = isServiceRoleAvailable() ? getServiceRoleClient() : null

    logger.info({
      email,
      role,
      provider_category,
      team_id,
      hasServiceRole: !!supabaseAdmin
    }, '🚀 [CREATE-CONTACT-API] Received request:')

    // Normalize empty email to null (partial unique index only enforces non-null emails)
    const normalizedEmail = email?.trim() || null

    // Préparer l'objet user (nouvelle architecture)
    const userToCreate = {
      email: normalizedEmail,
      name,
      first_name: first_name || null,
      last_name: last_name || null,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
      company: null, // Peut être ajouté plus tard
      speciality: (speciality && speciality.trim()) ? 
        speciality as Database['public']['Enums']['intervention_type'] : null,
      role: role as Database['public']['Enums']['user_role'],
      provider_category: provider_category as Database['public']['Enums']['provider_category'] | null,
      team_id,
      is_active
    }

    logger.info({ user: JSON.stringify(userToCreate, null, 2) }, '📝 [CREATE-CONTACT-API] User data')

    let result;

    // Méthode 1: Utiliser le client admin si disponible (bypass RLS)
    if (supabaseAdmin) {
      logger.info({}, '🔐 [CREATE-CONTACT-API] Using admin client (service role)')
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert(userToCreate)
        .select()
        .single()

      if (error) {
        logger.error({ error }, '❌ [CREATE-CONTACT-API] Admin insert failed')
        throw error
      }

      result = data
    } else {
      // Méthode 2: Utiliser le service contact normal (fallback)
      logger.info({}, '📝 [CREATE-CONTACT-API] Using normal contact service (fallback)')
      const contactService = await createServerContactService()
      result = await contactService.create(userToCreate)
    }

    logger.info({ user: result.id }, '✅ [CREATE-CONTACT-API] User/Contact created successfully:')

    // 🔔 NOTIFICATION: Nouveau contact créé
    try {
      const notifResult = await createContactNotification(result.id)

      if (notifResult.success) {
        logger.info({ contactId: result.id, count: notifResult.data?.length }, '🔔 [CREATE-CONTACT-API] Contact creation notifications sent')
      } else {
        logger.error({ error: notifResult.error, contactId: result.id }, '⚠️ [CREATE-CONTACT-API] Failed to send notifications')
      }
    } catch (notifError) {
      logger.error({ error: notifError, contactId: result.id }, '⚠️ [CREATE-CONTACT-API] Failed to send contact creation notification')
    }

    return NextResponse.json({
      success: true,
      contact: result
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [CREATE-CONTACT-API] Error:')
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création du contact', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
