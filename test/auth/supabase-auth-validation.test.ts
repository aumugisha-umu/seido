/**
 * Tests de validation de l'authentification Supabase
 * Vérifie que l'authentification fonctionne avec les vraies données
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgpdhvwdrwnxpxjhtfwn.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGRodndkcndueHB4amh0ZnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5NDYxNzQsImV4cCI6MjA0NzUyMjE3NH0.L3PdpxxOACtC67K5_GBKDRqW4hKyRnOKj41QRb6JBNU'

// Test users avec leurs vrais credentials
const TEST_USERS = {
  gestionnaire: {
    email: 'arthur@umumentum.com',
    password: 'password123', // Remplacer par le vrai mot de passe
    expectedRole: 'gestionnaire'
  },
  prestataire: {
    email: 'arthur+prest@seido.pm',
    password: 'password123',
    expectedRole: 'prestataire'
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'password123',
    expectedRole: 'locataire'
  }
}

describe('Supabase Authentication Tests', () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  describe('Login Flow', () => {
    Object.entries(TEST_USERS).forEach(([role, user]) => {
      it(`should authenticate ${role} user successfully`, async () => {
        // Tenter la connexion
        const { data, error } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password
        })

        // Vérifier pas d'erreur
        expect(error).toBeNull()
        expect(data.user).toBeDefined()
        expect(data.session).toBeDefined()
        expect(data.user?.email).toBe(user.email)

        // Récupérer le profil utilisateur
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', data.user?.id)
          .single()

        expect(profileError).toBeNull()
        expect(profile).toBeDefined()
        expect(profile.role).toBe(user.expectedRole)

        // Déconnexion
        await supabase.auth.signOut()
      })
    })
  })

  describe('Session Management', () => {
    it('should maintain session after refresh', async () => {
      const { data } = await supabase.auth.signInWithPassword({
        email: TEST_USERS.gestionnaire.email,
        password: TEST_USERS.gestionnaire.password
      })

      expect(data.session).toBeDefined()
      const sessionToken = data.session?.access_token

      // Récupérer la session
      const { data: sessionData } = await supabase.auth.getSession()
      expect(sessionData.session?.access_token).toBe(sessionToken)

      await supabase.auth.signOut()
    })

    it('should handle invalid credentials', async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'invalid@email.com',
        password: 'wrongpassword'
      })

      expect(error).toBeDefined()
      expect(error?.message).toContain('Invalid login credentials')
    })
  })

  describe('Profile Creation', () => {
    it('should retrieve existing profile', async () => {
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: TEST_USERS.gestionnaire.email,
        password: TEST_USERS.gestionnaire.password
      })

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user?.id)
        .single()

      expect(profile).toBeDefined()
      expect(profile.email).toBe(TEST_USERS.gestionnaire.email)
      expect(profile.role).toBe('gestionnaire')

      await supabase.auth.signOut()
    })
  })
})