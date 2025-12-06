import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Mail, Phone, FileText, User } from "lucide-react"

interface Step3ContactProps {
  personOrCompany: 'person' | 'company'
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  notes?: string
  inviteToApp: boolean
  onFieldChange: (field: string, value: string | boolean) => void
}

export function Step3Contact({
  personOrCompany,
  firstName,
  lastName,
  email,
  phone,
  notes,
  inviteToApp,
  onFieldChange
}: Step3ContactProps) {
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
            <Label htmlFor="first-name">
              Prénom
              {personOrCompany === 'person' ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-sm text-muted-foreground ml-1">(optionnel)</span>
              )}
            </Label>
            <Input
              id="first-name"
              value={firstName || ''}
              onChange={(e) => onFieldChange('firstName', e.target.value)}
              placeholder="Jean"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">
              Nom
              {personOrCompany === 'person' ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-sm text-muted-foreground ml-1">(optionnel)</span>
              )}
            </Label>
            <Input
              id="last-name"
              value={lastName || ''}
              onChange={(e) => onFieldChange('lastName', e.target.value)}
              placeholder="Dupont"
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
            <Label htmlFor="email">
              Email
              {inviteToApp ? (
                <span className="text-red-500">*</span>
              ) : personOrCompany === 'company' ? (
                <span className="text-sm text-muted-foreground ml-1">(optionnel)</span>
              ) : (
                <span className="text-sm text-muted-foreground ml-1">(optionnel)</span>
              )}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => onFieldChange('email', e.target.value)}
              placeholder="jean.dupont@example.com"
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Téléphone
              {!inviteToApp && personOrCompany === 'company' ? (
                <span className="text-sm text-muted-foreground ml-1">(optionnel)</span>
              ) : (
                <span className="text-sm text-muted-foreground">(optionnel)</span>
              )}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone || ''}
              onChange={(e) => onFieldChange('phone', e.target.value)}
              placeholder="0478 12 34 56"
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
          <Label htmlFor="notes">
            Notes <span className="text-sm text-muted-foreground">(optionnel)</span>
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
    </div>
  )
}
