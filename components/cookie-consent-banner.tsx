'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Cookie, Settings, X, Shield, BarChart3, Megaphone, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCookieConsent, type CookiePreferences } from '@/hooks/use-cookie-consent'
import { cn } from '@/lib/utils'

// ============================================================================
// COOKIE CONSENT BANNER
// ============================================================================

/**
 * Bannière de consentement cookies conforme RGPD
 *
 * Fonctionnalités :
 * - Affichée uniquement si consentement non donné
 * - Boutons Accepter / Refuser / Personnaliser
 * - Modal de préférences granulaires
 * - Animation slide-up au mount
 * - Position fixe en bas de l'écran
 */
export function CookieConsentBanner() {
  const { showBanner, acceptAll, declineAll, savePreferences } = useCookieConsent()
  const [showPreferences, setShowPreferences] = useState(false)

  // Ne pas rendre si le consentement est déjà donné
  if (!showBanner) return null

  return (
    <>
      {/* Bannière principale */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[60]',
          'bg-background/95 backdrop-blur-sm border-t border-border',
          'p-4 md:p-6',
          'animate-in slide-in-from-bottom duration-300'
        )}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Icône et texte */}
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">
                  Nous utilisons des cookies
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ce site utilise des cookies pour améliorer votre expérience et analyser le trafic.
                  Vous pouvez personnaliser vos préférences ou consulter notre{' '}
                  <Link
                    href="/cookies"
                    className="text-primary hover:underline underline-offset-2"
                  >
                    politique de cookies
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-wrap items-center gap-2 md:flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreferences(true)}
                className="text-muted-foreground"
              >
                <Settings className="h-4 w-4 mr-1.5" />
                Personnaliser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={declineAll}
              >
                Refuser
              </Button>
              <Button
                size="sm"
                onClick={acceptAll}
              >
                Accepter tout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de préférences */}
      <CookiePreferencesDialog
        open={showPreferences}
        onOpenChange={setShowPreferences}
        onSave={(prefs) => {
          savePreferences(prefs)
          setShowPreferences(false)
        }}
        onDeclineAll={() => {
          declineAll()
          setShowPreferences(false)
        }}
      />
    </>
  )
}

// ============================================================================
// PREFERENCES DIALOG
// ============================================================================

interface CookiePreferencesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (preferences: CookiePreferences) => void
  onDeclineAll: () => void
}

function CookiePreferencesDialog({
  open,
  onOpenChange,
  onSave,
  onDeclineAll,
}: CookiePreferencesDialogProps) {
  // État local des préférences (pour les toggles)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    analytics: false,
    advertising: false,
    functional: true,
  })

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === 'functional') return // Les fonctionnels sont toujours actifs
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    onSave(preferences)
  }

  const handleAcceptAll = () => {
    onSave({
      analytics: true,
      advertising: true,
      functional: true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Préférences de cookies
          </DialogTitle>
          <DialogDescription>
            Choisissez les types de cookies que vous acceptez. Les cookies essentiels
            sont nécessaires au fonctionnement du site et ne peuvent pas être désactivés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cookies essentiels */}
          <CookieCategory
            icon={<Shield className="h-4 w-4" />}
            title="Cookies essentiels"
            description="Nécessaires au fonctionnement du site (authentification, sécurité)"
            checked={true}
            disabled={true}
            alwaysActive
          />

          {/* Cookies analytiques */}
          <CookieCategory
            icon={<BarChart3 className="h-4 w-4" />}
            title="Cookies analytiques"
            description="Microsoft Clarity - Heatmaps et replays de sessions pour améliorer l'expérience"
            checked={preferences.analytics}
            onChange={() => handleToggle('analytics')}
          />

          {/* Cookies publicitaires */}
          <CookieCategory
            icon={<Megaphone className="h-4 w-4" />}
            title="Cookies publicitaires"
            description="LinkedIn, Facebook pixels - Personnalisation des publicités (bientôt disponible)"
            checked={preferences.advertising}
            onChange={() => handleToggle('advertising')}
            disabled={true}
            comingSoon
          />

          {/* Cookies fonctionnels */}
          <CookieCategory
            icon={<Wrench className="h-4 w-4" />}
            title="Cookies fonctionnels"
            description="Chat, préférences utilisateur, géolocalisation"
            checked={preferences.functional}
            disabled={true}
            alwaysActive
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onDeclineAll}
            className="sm:mr-auto"
          >
            Tout refuser
          </Button>
          <Button
            variant="outline"
            onClick={handleAcceptAll}
          >
            Tout accepter
          </Button>
          <Button onClick={handleSave}>
            Enregistrer mes choix
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// COOKIE CATEGORY ITEM
// ============================================================================

interface CookieCategoryProps {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onChange?: () => void
  disabled?: boolean
  alwaysActive?: boolean
  comingSoon?: boolean
}

function CookieCategory({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled = false,
  alwaysActive = false,
  comingSoon = false,
}: CookieCategoryProps) {
  const id = title.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border',
      disabled && !alwaysActive ? 'opacity-60' : '',
      alwaysActive ? 'bg-muted/50' : 'bg-background'
    )}>
      <div className="flex-shrink-0 p-1.5 bg-primary/10 rounded">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={id}
            className={cn(
              'font-medium cursor-pointer',
              disabled ? 'cursor-not-allowed' : ''
            )}
          >
            {title}
          </Label>
          {alwaysActive && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              Toujours actif
            </span>
          )}
          {comingSoon && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              Bientôt
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={`${checked ? 'Désactiver' : 'Activer'} ${title}`}
      />
    </div>
  )
}

// ============================================================================
// MANAGE COOKIES BUTTON (for legal pages)
// ============================================================================

/**
 * Bouton pour rouvrir les préférences de cookies
 * À utiliser dans les pages légales (politique de cookies, etc.)
 *
 * @example
 * ```tsx
 * import { ManageCookiesButton } from '@/components/cookie-consent-banner'
 *
 * <ManageCookiesButton />
 * ```
 */
export function ManageCookiesButton() {
  const { resetConsent } = useCookieConsent()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={resetConsent}
      className="gap-2"
    >
      <Settings className="h-4 w-4" />
      Gérer mes cookies
    </Button>
  )
}
