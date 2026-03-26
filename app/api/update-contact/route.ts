import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient } from '@/lib/api-service-role-helper'
import { updateContactSchema } from '@/lib/validation/schemas'

/**
 * API route pour mettre à jour un contact
 *
 * Utilise le service role client pour bypasser les RLS policies.
 * Cela résout le problème de timeout RLS quand on modifie un contact
 * qui a une invitation en status "pending" (pas encore dans team_members).
 */
export async function POST(request: Request) {
  try {
    // ✅ AUTH: Vérifier que l'utilisateur est authentifié
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile: currentUser } = authResult.data
    const supabaseAdmin = getServiceRoleClient()

    logger.info({ userId: currentUser.id }, '📝 [UPDATE-CONTACT] Starting contact update')

    // ============================================================================
    // ÉTAPE 1: Valider les données d'entrée avec Zod (whitelist stricte)
    // ============================================================================
    const body = await request.json()
    const parsed = updateContactSchema.safeParse(body)

    if (!parsed.success) {
      logger.warn({ errors: parsed.error.flatten() }, '⚠️ [UPDATE-CONTACT] Validation failed')
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { contactId, updateData } = parsed.data

    // ============================================================================
    // ÉTAPE 2: Vérifier que le contact existe et appartient à la même équipe
    // ============================================================================
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('users')
      .select('id, team_id, name')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      logger.error({ contactError, contactId }, '❌ [UPDATE-CONTACT] Contact not found')
      return NextResponse.json(
        { error: 'Contact non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le gestionnaire a accès à ce contact (même équipe)
    if (contact.team_id !== currentUser.team_id) {
      logger.warn(
        { contactTeamId: contact.team_id, userTeamId: currentUser.team_id },
        '⚠️ [UPDATE-CONTACT] Unauthorized access attempt'
      )
      return NextResponse.json(
        { error: 'Accès non autorisé à ce contact' },
        { status: 403 }
      )
    }

    logger.info({ contactId, contactName: contact.name }, '✅ [UPDATE-CONTACT] Contact verified')

    // ============================================================================
    // ÉTAPE 3: Mettre à jour le contact avec service role (bypass RLS)
    // ============================================================================
    const { data: updatedContact, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .select()
      .single()

    if (updateError) {
      logger.error({ updateError, contactId }, '❌ [UPDATE-CONTACT] Failed to update contact')
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du contact' },
        { status: 500 }
      )
    }

    logger.info({ contactId, updatedFields: Object.keys(updateData) }, '✅ [UPDATE-CONTACT] Contact updated successfully')

    // ============================================================================
    // ÉTAPE 4: Log d'activité (optionnel, non-bloquant)
    // ============================================================================
    try {
      await supabaseAdmin.from('activity_logs').insert({
        team_id: currentUser.team_id,
        user_id: currentUser.id,
        action_type: 'update',
        entity_type: 'contact',
        entity_id: contactId,
        entity_name: updatedContact.name,
        description: `Contact "${updatedContact.name}" modifié`,
        status: 'success',
        metadata: { updatedFields: Object.keys(updateData) }
      })
    } catch (logError) {
      logger.warn({ logError }, '⚠️ [UPDATE-CONTACT] Failed to log activity (non-blocking)')
    }

    return NextResponse.json({
      success: true,
      data: updatedContact
    })

  } catch (error) {
    logger.error({ error }, '❌ [UPDATE-CONTACT] Unexpected error')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
