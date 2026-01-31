'use client'

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { PhoneInput } from "@/components/ui/phone-input"
import { Mail, FileText, User, Loader2, Phone } from "lucide-react"
import { isValidEmail } from "@/lib/validation/patterns"
import { EntityLinkSection } from "@/components/contact-details/entity-link-section"

// Types for entity linking
interface Building {
  id: string
  name: string
  address?: string | null
}

interface Lot {
  id: string
  reference: string
  building_id: string
  category?: string | null
  building?: Building | null
}

interface Step3ContactProps {
  teamId: string
  personOrCompany: 'person' | 'company'
  contactType: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  notes?: string
  inviteToApp: boolean
  onFieldChange: (field: string, value: string | boolean | null) => void
  // Entity linking props
  buildings: Building[]
  lots: Lot[]
  linkedEntityType?: 'building' | 'lot' | 'contract' | null
  linkedBuildingId?: string | null
  linkedLotId?: string | null
  linkedContractId?: string | null
}

export function Step3Contact({
  teamId,
  personOrCompany,
  contactType,
  firstName,
  lastName,
  email,
  phone,
  notes,
  inviteToApp,
  onFieldChange,
  // Entity linking props
  buildings,
  lots,
  linkedEntityType,
  linkedBuildingId,
  linkedLotId,
  linkedContractId
}: Step3ContactProps) {
  // État pour le statut de vérification email
  const [emailStatus, setEmailStatus] = useState<{
    checking: boolean
    existsInCurrentTeam: boolean
    hasAuthAccount: boolean
  } | null>(null)

  // Vérification email avec debounce
  useEffect(() => {
    // Reset si email vide
    if (!email?.trim()) {
      setEmailStatus(null)
      onFieldChange('existsInCurrentTeam', false)
      onFieldChange('hasAuthAccount', false)
      return
    }

    // Valider format email
    if (!isValidEmail(email)) {
      setEmailStatus(null)
      return
    }

    // Debounce 500ms
    const timeoutId = setTimeout(async () => {
      setEmailStatus({ checking: true, existsInCurrentTeam: false, hasAuthAccount: false })

      try {
        const response = await fetch('/api/check-email-team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, teamId })
        })

        if (response.ok) {
          const data = await response.json()
          setEmailStatus({
            checking: false,
            existsInCurrentTeam: data.existsInCurrentTeam,
            hasAuthAccount: data.hasAuthAccount ?? false
          })
          onFieldChange('existsInCurrentTeam', data.existsInCurrentTeam)
          onFieldChange('hasAuthAccount', data.hasAuthAccount ?? false)
        } else {
          setEmailStatus(null)
        }
      } catch (error) {
        console.error('Error checking email:', error)
        setEmailStatus(null)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [email, teamId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Coordonnées du contact</h2>
        <p className="text-muted-foreground">
          {personOrCompany === 'person'
            ? "Saisissez les informations personnelles du contact."
            : "Saisissez les coordonnées de la personne de contact au sein de la société."}
        </p>
      </div>

      {/* Section Identité */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-foreground">Identité</h3>
          {personOrCompany === 'person' && (
            <span className="text-sm text-red-500">*</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first-name" icon={User} required={personOrCompany === 'person'}>
              Prénom
              {personOrCompany !== 'person' && (
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              )}
            </Label>
            <Input
              id="first-name"
              value={firstName || ''}
              onChange={(e) => onFieldChange('firstName', e.target.value)}
              placeholder="Jean"
              aria-required={personOrCompany === 'person'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name" icon={User} required={personOrCompany === 'person'}>
              Nom
              {personOrCompany !== 'person' && (
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              )}
            </Label>
            <Input
              id="last-name"
              value={lastName || ''}
              onChange={(e) => onFieldChange('lastName', e.target.value)}
              placeholder="Dupont"
              aria-required={personOrCompany === 'person'}
            />
          </div>
        </div>
      </div>

      {/* Section Communication */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-foreground">Communication</h3>
          {!inviteToApp && personOrCompany === 'company' && (
            <>
              <span className="text-sm text-red-500">*</span>
              <span className="text-sm text-muted-foreground">(au moins un email ou numéro de téléphone est requis)</span>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" icon={Mail} required={inviteToApp}>
              Email
              {!inviteToApp && (
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => onFieldChange('email', e.target.value)}
                placeholder="jean.dupont@example.com"
                className={emailStatus?.existsInCurrentTeam ? 'border-amber-500 focus-visible:ring-amber-500' : ''}
                aria-required={inviteToApp}
                aria-invalid={emailStatus?.existsInCurrentTeam || false}
                aria-describedby={emailStatus?.existsInCurrentTeam ? 'email-error' : undefined}
              />
              {emailStatus?.checking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {/* Indicateur si contact existant */}
            {emailStatus?.existsInCurrentTeam && (
              <p id="email-error" className="text-xs text-amber-600 dark:text-amber-400 mt-1" role="alert">
                ⚠️ Ce contact existe déjà dans votre équipe
              </p>
            )}
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="phone" icon={Phone}>
              Téléphone <span className="text-muted-foreground font-normal">(optionnel)</span>
            </Label>
            <PhoneInput
              value={phone || ''}
              onChange={(value) => onFieldChange('phone', value)}
            />
          </div>
        </div>
      </div>

      {/* Section Notes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-foreground">Notes complémentaires</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes" icon={FileText}>
            Notes <span className="text-muted-foreground font-normal">(optionnel)</span>
          </Label>
          <Textarea
            id="notes"
            value={notes || ''}
            onChange={(e) => onFieldChange('notes', e.target.value)}
            placeholder="Informations complémentaires sur le contact..."
            rows={4}
            className="resize-none"
          />
        </div>
      </div>

      {/* Invitation à l'application */}
      <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Checkbox
            id="invite-checkbox"
            checked={inviteToApp}
            onCheckedChange={(checked) => onFieldChange('inviteToApp', checked as boolean)}
            className="mt-1"
          />
          <div className="flex-1">
            <Label
              htmlFor="invite-checkbox"
              className="text-base font-medium cursor-pointer"
            >
              Inviter ce contact à rejoindre l'application
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Un email d'invitation sera envoyé à <strong>{email || "l'adresse email"}</strong> pour qu'il/elle puisse accéder à ses informations et interventions.
            </p>
          </div>
        </div>
      </div>

      {/* Section de liaison à une entité (optionnelle) */}
      <EntityLinkSection
        contactType={contactType}
        teamId={teamId}
        linkedEntityType={linkedEntityType ?? null}
        linkedBuildingId={linkedBuildingId ?? null}
        linkedLotId={linkedLotId ?? null}
        linkedContractId={linkedContractId ?? null}
        onFieldChange={onFieldChange}
        buildings={buildings}
        lots={lots}
      />
    </div>
  )
}
