/**
 * 📨 INVITATION HELPERS - Helpers pour les invitations de contacts
 *
 * Fonctions réutilisables pour tester le workflow d'invitation :
 * - Accepter une invitation (simuler le clic sur le lien)
 * - Vérifier la création de l'auth user
 * - Gérer le flow complet d'invitation
 */

import { Page } from '@playwright/test'
import { getConfirmationLinkForEmail, waitForUserInSupabase } from './supabase-helpers'

/**
 * Accepter une invitation en simulant le clic sur le lien d'invitation
 *
 * Workflow:
 * 1. Récupère le lien d'invitation depuis Supabase
 * 2. Navigue vers le lien (simule le clic)
 * 3. Vérifie que l'auth user est créé
 *
 * @param page - Page Playwright
 * @param email - Email du contact invité
 * @returns Objet avec success, authUserCreated et redirectUrl
 */
export const acceptInvitation = async (
  page: Page,
  email: string,
  options: { timeout?: number } = {}
): Promise<{
  success: boolean
  authUserCreated: boolean
  redirectUrl: string
  invitationLink: string | null
}> => {
  console.log('📨 Accepting invitation for:', email)

  const timeout = options.timeout || 5000

  try {
    // Étape 1: Récupérer le lien d'invitation
    console.log('🔍 Retrieving invitation link...')
    const invitationLink = await getConfirmationLinkForEmail(email)

    if (!invitationLink) {
      console.error('❌ Invitation link not found')
      return {
        success: false,
        authUserCreated: false,
        redirectUrl: '',
        invitationLink: null,
      }
    }

    console.log('✅ Invitation link retrieved:', invitationLink.substring(0, 50) + '...')

    // Étape 2: Naviguer vers le lien (simule le clic)
    console.log('🔗 Navigating to invitation link...')
    await page.goto(invitationLink)
    await page.waitForLoadState('networkidle')

    const redirectUrl = page.url()
    console.log('📍 Redirected to:', redirectUrl)

    // Étape 3: Vérifier que l'auth user est créé
    console.log('🔍 Verifying auth user creation...')
    const authUserCreated = await waitForUserInSupabase(email, {
      timeout,
      expectToExist: true,
    })

    if (authUserCreated) {
      console.log('✅ Auth user created successfully')
    } else {
      console.warn('⚠️ Auth user not created within timeout')
    }

    return {
      success: authUserCreated,
      authUserCreated,
      redirectUrl,
      invitationLink,
    }
  } catch (error) {
    console.error('❌ Error accepting invitation:', error)
    return {
      success: false,
      authUserCreated: false,
      redirectUrl: '',
      invitationLink: null,
    }
  }
}

/**
 * Vérifier qu'une invitation a bien été envoyée (lien existe)
 *
 * @param email - Email du contact invité
 * @returns true si le lien d'invitation existe
 */
export const verifyInvitationSent = async (email: string): Promise<boolean> => {
  console.log('📨 Verifying invitation sent for:', email)

  const invitationLink = await getConfirmationLinkForEmail(email)

  if (invitationLink) {
    console.log('✅ Invitation confirmed (link exists)')
    return true
  } else {
    console.warn('⚠️ No invitation link found')
    return false
  }
}

/**
 * Workflow complet: créer contact avec invitation et accepter l'invitation
 *
 * Pattern réutilisable pour les tests d'invitation
 *
 * @param page - Page Playwright
 * @param contactEmail - Email du contact invité
 * @param createContactFn - Fonction pour créer le contact (personnalisable)
 * @returns Résultat de l'acceptation d'invitation
 */
export const createContactAndAcceptInvitation = async (
  page: Page,
  contactEmail: string,
  createContactFn: () => Promise<void>
): Promise<{
  success: boolean
  authUserCreated: boolean
  redirectUrl: string
}> => {
  console.log('🚀 Starting complete invitation workflow for:', contactEmail)

  // Étape 1: Créer le contact avec invitation (fonction personnalisée)
  console.log('📋 Step 1: Creating contact...')
  await createContactFn()
  console.log('✅ Contact creation completed')

  // Attendre que l'invitation soit générée
  await page.waitForTimeout(2000)

  // Étape 2: Accepter l'invitation
  console.log('📨 Step 2: Accepting invitation...')
  const result = await acceptInvitation(page, contactEmail)

  if (result.success) {
    console.log('✅ Complete invitation workflow succeeded')
  } else {
    console.error('❌ Complete invitation workflow failed')
  }

  return result
}
