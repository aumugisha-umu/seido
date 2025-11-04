import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { User, Building2, Mail, Phone, FileText, MapPin, CheckCircle } from "lucide-react"

interface Company {
  id: string
  name: string
  vat_number?: string | null
}

interface Step4ConfirmationProps {
  contactType: 'locataire' | 'prestataire' | 'gestionnaire' | 'proprietaire' | 'autre'
  personOrCompany: 'person' | 'company'
  specialty?: string
  companyMode: 'new' | 'existing'
  companyId?: string
  companyName?: string
  vatNumber?: string
  street?: string
  streetNumber?: string
  postalCode?: string
  city?: string
  country?: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  notes?: string
  inviteToApp: boolean
  onInviteChange: (value: boolean) => void
  companies: Company[]
}

export function Step4Confirmation({
  contactType,
  personOrCompany,
  specialty,
  companyMode,
  companyId,
  companyName,
  vatNumber,
  street,
  streetNumber,
  postalCode,
  city,
  country,
  firstName,
  lastName,
  email,
  phone,
  notes,
  inviteToApp,
  onInviteChange,
  companies
}: Step4ConfirmationProps) {
  // Helper pour formater le type de contact
  const getContactTypeLabel = () => {
    const labels = {
      locataire: 'Locataire',
      prestataire: 'Prestataire',
      gestionnaire: 'Gestionnaire',
      proprietaire: 'Propriétaire',
      autre: 'Autre'
    }
    return labels[contactType]
  }

  // Helper pour formater la spécialité
  const getSpecialtyLabel = (value: string) => {
    const labels: Record<string, string> = {
      plomberie: 'Plomberie',
      electricite: 'Électricité',
      chauffage: 'Chauffage',
      serrurerie: 'Serrurerie',
      peinture: 'Peinture et revêtements',
      menage: 'Ménage et nettoyage',
      jardinage: 'Jardinage et espaces verts',
      autre: 'Autre'
    }
    return labels[value] || value
  }

  // Trouver le nom de la société si existante
  const selectedCompany = companyId ? companies.find(c => c.id === companyId) : null

  // Nom du contact
  const contactName = firstName && lastName
    ? `${firstName} ${lastName}`
    : firstName || lastName || (personOrCompany === 'company' ? (companyName || selectedCompany?.name || 'Société') : 'Contact')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Confirmation</h2>
        <p className="text-gray-600">
          Vérifiez les informations avant de créer le contact.
        </p>
      </div>

      {/* Résumé Type */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Type de contact</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {getContactTypeLabel()}
                  </Badge>
                  <Badge variant="secondary" className={personOrCompany === 'company' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
                    {personOrCompany === 'company' ? (
                      <><Building2 className="h-3 w-3 mr-1" /> Société</>
                    ) : (
                      <><User className="h-3 w-3 mr-1" /> Personne physique</>
                    )}
                  </Badge>
                </div>
                {specialty && contactType === 'prestataire' && (
                  <div>
                    <div className="text-sm text-gray-500">Spécialité</div>
                    <div className="font-medium">{getSpecialtyLabel(specialty)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résumé Société (si applicable) */}
      {personOrCompany === 'company' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-3">Informations société</h3>

                {companyMode === 'existing' && selectedCompany ? (
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm text-gray-500">Société existante</div>
                      <div className="font-medium">{selectedCompany.name}</div>
                    </div>
                    {selectedCompany.vat_number && (
                      <div>
                        <div className="text-sm text-gray-500">Numéro de TVA</div>
                        <div className="font-mono text-sm">{selectedCompany.vat_number}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm text-gray-500">Nom de la société</div>
                      <div className="font-medium">{companyName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Numéro de TVA</div>
                      <div className="font-mono text-sm">{vatNumber}</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <div className="text-sm text-gray-500">Adresse</div>
                        <div className="text-sm">
                          {street} {streetNumber}<br />
                          {postalCode} {city}<br />
                          {country}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résumé Contact */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-3">Coordonnées</h3>
              <div className="space-y-2">
                {(firstName || lastName) && (
                  <div>
                    <div className="text-sm text-gray-500">Nom</div>
                    <div className="font-medium">{contactName}</div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="text-sm">{email}</div>
                  </div>
                </div>
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Téléphone</div>
                      <div className="text-sm">{phone}</div>
                    </div>
                  </div>
                )}
                {notes && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Notes</div>
                      <div className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invitation */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Checkbox
              id="invite-checkbox"
              checked={inviteToApp}
              onCheckedChange={onInviteChange}
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
                Un email d'invitation sera envoyé à <strong>{email}</strong> pour qu'il/elle puisse accéder à ses informations et interventions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
