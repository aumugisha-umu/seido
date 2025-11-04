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
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Coordonnées du contact</h2>
        <p className="text-gray-600">
          {personOrCompany === 'person'
            ? "Saisissez les informations personnelles du contact."
            : "Saisissez les coordonnées de la personne de contact au sein de la société."}
        </p>
      </div>

      {/* Section Identité */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Identité</h3>
          {personOrCompany === 'person' && (
            <span className="text-sm text-red-500">*</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first-name">
              Prénom {personOrCompany === 'person' && <span className="text-red-500">*</span>}
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
              Nom {personOrCompany === 'person' && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="last-name"
              value={lastName || ''}
              onChange={(e) => onFieldChange('lastName', e.target.value)}
              placeholder="Dupont"
            />
          </div>
        </div>
        {personOrCompany === 'company' && (
          <p className="text-sm text-gray-500">
            Optionnel - Nom de la personne de contact au sein de la société.
          </p>
        )}
      </div>

      {/* Section Communication */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Communication</h3>
          <span className="text-sm text-red-500">*</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
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
          <h3 className="font-semibold text-gray-900">Notes complémentaires</h3>
          <span className="text-sm text-gray-500">(optionnel)</span>
        </div>
        <div className="space-y-2">
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
      <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-200">
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
            <p className="text-sm text-gray-600 mt-1">
              Un email d'invitation sera envoyé à <strong>{email || "l'adresse email"}</strong> pour qu'il/elle puisse accéder à ses informations et interventions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
