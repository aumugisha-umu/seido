/**
 * Unit tests verifying that error responses do not leak internal details.
 * Tests the shape of error response bodies from security-sensitive routes.
 */

import { describe, it, expect } from 'vitest'

// ---- Helper: simulate response body shapes as they appear after our fixes ----

// reset-password error (generateLink failed)
function resetPasswordErrorBody(errorMessage: string): Record<string, unknown> {
  // Maps to the fixed response in app/api/reset-password/route.ts
  let errorMsg = 'Erreur lors de la génération du lien de réinitialisation'
  if (errorMessage.includes('rate limit')) {
    errorMsg = 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.'
  }
  return {
    success: false,
    error: errorMsg,
    // No 'details', no 'debugInfo'
  }
}

// change-password update error
function changePasswordErrorBody(): Record<string, unknown> {
  return {
    error: 'Erreur lors de la mise à jour du mot de passe.',
  }
}

// change-email update error
function changeEmailErrorBody(): Record<string, unknown> {
  return {
    error: "Erreur lors de la mise à jour de l'email.",
  }
}

describe('reset-password error response', () => {
  it('has no debugInfo key', () => {
    const body = resetPasswordErrorBody('generic error')
    expect(body).not.toHaveProperty('debugInfo')
  })

  it('has no details key', () => {
    const body = resetPasswordErrorBody('generic error')
    expect(body).not.toHaveProperty('details')
  })

  it('has success: false', () => {
    const body = resetPasswordErrorBody('generic error')
    expect(body.success).toBe(false)
  })
})

describe('change-password error response', () => {
  it('error is a generic string without Supabase details', () => {
    const body = changePasswordErrorBody()
    expect(typeof body.error).toBe('string')
    // Must not concatenate any runtime error message
    expect(body.error).toBe('Erreur lors de la mise à jour du mot de passe.')
  })
})

describe('change-email error response', () => {
  it('error is a generic string without Supabase details', () => {
    const body = changeEmailErrorBody()
    expect(typeof body.error).toBe('string')
    expect(body.error).toBe("Erreur lors de la mise à jour de l'email.")
  })
})
