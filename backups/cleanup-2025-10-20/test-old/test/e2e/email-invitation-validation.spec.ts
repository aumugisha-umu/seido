/**
 * 🧪 Test E2E - Email Invitation Validation with Resend
 *
 * Tests directs de l'API /api/invite-user pour valider:
 * - Envoi email via Resend avec template React
 * - Génération magic link via generateLink()
 * - Création user_invitations entry
 * - Comportement avec checkbox ON/OFF
 *
 * Pattern: Tests API directs (pas UI) pour isolation maximale
 */

import { test, expect } from '@playwright/test'

test.describe('Email Invitation with Resend', () => {

  const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  /**
   * Test 1: Envoi email invitation avec template React
   */
  test('Doit envoyer email invitation avec template React via Resend', async ({ request }) => {
    console.log('📝 [EMAIL-TEST-1] Testing email sending via Resend...')

    // Login pour obtenir session cookie
    console.log('🔑 [EMAIL-TEST-1] Authenticating...')
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: 'arthur@seido.pm',
        password: 'Wxcvbn123'
      }
    })

    expect(loginResponse.ok()).toBeTruthy()

    // Créer invitation
    console.log('📧 [EMAIL-TEST-1] Sending invitation request...')
    const timestamp = Date.now()

    const response = await request.post(`${API_BASE}/api/invite-user`, {
      data: {
        email: `api.test.${timestamp}@seido.pm`,
        firstName: 'API',
        lastName: 'Test',
        role: 'locataire',
        teamId: 'f187f3c0-f4c1-42c3-9260-cb6ede7eb9e2', // Team Arthur
        shouldInviteToApp: true
      }
    })

    console.log('📊 [EMAIL-TEST-1] Response status:', response.status())

    if (!response.ok()) {
      const errorBody = await response.text()
      console.error('❌ [EMAIL-TEST-1] Error response:', errorBody)
    }

    expect(response.status()).toBe(200)

    const json = await response.json()
    console.log('📦 [EMAIL-TEST-1] Response body:', JSON.stringify(json, null, 2))

    // Vérifications
    expect(json.success).toBe(true)
    expect(json.invitation).toBeDefined()
    expect(json.invitation.invitationSent).toBe(true)
    expect(json.invitation.magicLink).toMatch(/auth\/callback/)
    expect(json.invitation.magicLink).toMatch(/access_token/)

    console.log('🔗 [EMAIL-TEST-1] Magic link:', json.invitation.magicLink?.substring(0, 100))
    console.log('✅ [EMAIL-TEST-1] Test passed - Email sent via Resend')
  })

  /**
   * Test 2: Création contact sans email si checkbox décochée
   */
  test('Doit créer contact sans email si checkbox décochée', async ({ request }) => {
    console.log('📝 [EMAIL-TEST-2] Testing contact creation WITHOUT invitation...')

    // Login
    console.log('🔑 [EMAIL-TEST-2] Authenticating...')
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: 'arthur@seido.pm',
        password: 'Wxcvbn123'
      }
    })

    expect(loginResponse.ok()).toBeTruthy()

    // Créer contact SANS invitation
    console.log('📧 [EMAIL-TEST-2] Creating contact without invitation...')
    const timestamp = Date.now()

    const response = await request.post(`${API_BASE}/api/invite-user`, {
      data: {
        email: `simple.api.${timestamp}@seido.pm`,
        firstName: 'Simple',
        lastName: 'Contact',
        role: 'prestataire',
        teamId: 'f187f3c0-f4c1-42c3-9260-cb6ede7eb9e2',
        shouldInviteToApp: false // ❌ Pas d'invitation
      }
    })

    console.log('📊 [EMAIL-TEST-2] Response status:', response.status())
    expect(response.status()).toBe(200)

    const json = await response.json()
    console.log('📦 [EMAIL-TEST-2] Response body:', JSON.stringify(json, null, 2))

    // Vérifications
    expect(json.success).toBe(true)
    expect(json.invitation.invitationSent).toBe(false)
    expect(json.message).toMatch(/sans invitation/i)

    console.log('✅ [EMAIL-TEST-2] Test passed - Contact created without invitation')
  })

  /**
   * Test 3: Vérifier format du magic link généré
   */
  test('Doit générer un magic link valide avec tous les paramètres', async ({ request }) => {
    console.log('📝 [EMAIL-TEST-3] Testing magic link format...')

    // Login
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: 'arthur@seido.pm',
        password: 'Wxcvbn123'
      }
    })

    expect(loginResponse.ok()).toBeTruthy()

    // Créer invitation
    const timestamp = Date.now()
    const response = await request.post(`${API_BASE}/api/invite-user`, {
      data: {
        email: `link.test.${timestamp}@seido.pm`,
        firstName: 'Link',
        lastName: 'Validator',
        role: 'prestataire',
        teamId: 'f187f3c0-f4c1-42c3-9260-cb6ede7eb9e2',
        shouldInviteToApp: true
      }
    })

    expect(response.status()).toBe(200)

    const json = await response.json()
    const magicLink = json.invitation.magicLink

    console.log('🔗 [EMAIL-TEST-3] Magic link:', magicLink)

    // Vérifications du format du magic link
    expect(magicLink).toContain('/auth/callback')
    expect(magicLink).toContain('#') // Hash pour access_token
    expect(magicLink).toMatch(/access_token=[^&]+/)
    expect(magicLink).toMatch(/refresh_token=[^&]+/)
    expect(magicLink).toMatch(/token_type=bearer/i)

    console.log('✅ [EMAIL-TEST-3] Test passed - Magic link format is valid')
  })

  /**
   * Test 4: Vérifier gestion erreur email déjà existant
   */
  test('Doit retourner erreur si email déjà utilisé', async ({ request }) => {
    console.log('📝 [EMAIL-TEST-4] Testing duplicate email error...')

    // Login
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: 'arthur@seido.pm',
        password: 'Wxcvbn123'
      }
    })

    expect(loginResponse.ok()).toBeTruthy()

    // Tenter de créer avec email existant
    console.log('❌ [EMAIL-TEST-4] Attempting to create duplicate contact...')

    const response = await request.post(`${API_BASE}/api/invite-user`, {
      data: {
        email: 'arthur@seido.pm', // Email déjà existant
        firstName: 'Duplicate',
        lastName: 'Test',
        role: 'gestionnaire',
        teamId: 'f187f3c0-f4c1-42c3-9260-cb6ede7eb9e2',
        shouldInviteToApp: true
      }
    })

    console.log('📊 [EMAIL-TEST-4] Response status:', response.status())

    // Doit retourner une erreur (400 ou 409 ou 500 selon l'implémentation)
    expect([400, 409, 500]).toContain(response.status())

    const json = await response.json()
    console.log('📦 [EMAIL-TEST-4] Error response:', JSON.stringify(json, null, 2))

    expect(json.success).toBeFalsy()
    expect(json.error).toMatch(/déjà|already|duplicate|exists/i)

    console.log('✅ [EMAIL-TEST-4] Test passed - Duplicate email properly rejected')
  })

  /**
   * Test 5: Vérifier création entrée user_invitations
   */
  test('Doit créer une entrée dans user_invitations avec le bon statut', async ({ request }) => {
    console.log('📝 [EMAIL-TEST-5] Testing user_invitations entry creation...')

    // Login
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: 'arthur@seido.pm',
        password: 'Wxcvbn123'
      }
    })

    expect(loginResponse.ok()).toBeTruthy()

    // Créer invitation
    const timestamp = Date.now()
    const email = `invitation.db.${timestamp}@seido.pm`

    const response = await request.post(`${API_BASE}/api/invite-user`, {
      data: {
        email,
        firstName: 'Database',
        lastName: 'Checker',
        role: 'locataire',
        teamId: 'f187f3c0-f4c1-42c3-9260-cb6ede7eb9e2',
        shouldInviteToApp: true
      }
    })

    expect(response.status()).toBe(200)

    const json = await response.json()
    expect(json.success).toBe(true)

    // Vérifier que l'invitation a été créée
    console.log('🗄️ [EMAIL-TEST-5] Checking user_invitations table...')

    const invitationsResponse = await request.get(
      `${API_BASE}/api/team-invitations?teamId=f187f3c0-f4c1-42c3-9260-cb6ede7eb9e2`
    )

    expect(invitationsResponse.ok()).toBeTruthy()

    const invitationsData = await invitationsResponse.json()
    console.log('📊 [EMAIL-TEST-5] Invitations:', JSON.stringify(invitationsData, null, 2))

    // Trouver l'invitation créée
    const createdInvitation = invitationsData.invitations?.find(
      (inv: { email: string }) => inv.email === email
    )

    expect(createdInvitation).toBeDefined()
    expect(createdInvitation.status).toBe('pending')
    expect(createdInvitation.role).toBe('locataire')

    console.log('✅ [EMAIL-TEST-5] Test passed - user_invitations entry created with status=pending')
  })
})
