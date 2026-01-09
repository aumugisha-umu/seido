"use client"

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/services'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'

interface GoogleOAuthButtonProps {
  mode: 'login' | 'signup'
  redirectTo?: string
  className?: string
}

/**
 * Google OAuth Button Component
 *
 * Triggers OAuth flow with PKCE for security.
 * After Google consent, user is redirected to /auth/callback
 * where the code is exchanged for a session.
 */
export function GoogleOAuthButton({
  mode,
  redirectTo,
  className
}: GoogleOAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)

      const supabase = createBrowserSupabaseClient()
      const origin = window.location.origin

      // Build callback URL with optional next parameter
      // Note: /auth/oauth-callback (pas /auth/callback qui gère les magic links)
      const callbackUrl = new URL('/auth/oauth-callback', origin)
      if (redirectTo) {
        callbackUrl.searchParams.set('next', redirectTo)
      }

      logger.info('[GOOGLE-OAUTH] Initiating OAuth flow', {
        mode,
        redirectTo: callbackUrl.toString()
      })

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        logger.error('[GOOGLE-OAUTH] OAuth initiation failed:', error)
        setIsLoading(false)
        return
      }

      // Browser will redirect to Google - no need to do anything else
      logger.info('[GOOGLE-OAUTH] Redirecting to Google...')

    } catch (error) {
      logger.error('[GOOGLE-OAUTH] Exception:', error)
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className={`w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-colors h-11 ${className || ''}`}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      {mode === 'login' ? 'Continuer avec Google' : "S'inscrire avec Google"}
    </Button>
  )
}
