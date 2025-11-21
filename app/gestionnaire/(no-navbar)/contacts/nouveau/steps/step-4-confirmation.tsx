import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { User, Building2, Mail, Phone, FileText, MapPin, CheckCircle, UserX } from "lucide-react"

interface Company {
  id: string
  name: string
  vat_number?: string | null
  street?: string | null
  street_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
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
    <div className="space-y-6">
      {/* 1. Carte Société (si applicable) - Style distinctif */}
      {personOrCompany === 'company' && (
        <Card className="border-l-4 border-l-purple-500 bg-purple-50/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {companyMode === 'existing' && selectedCompany ? selectedCompany.name : companyName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-white text-purple-700 border-purple-200">
                      Société
                    </Badge>
                    {(companyMode === 'existing' && selectedCompany?.vat_number || vatNumber) && (
                      <span className="text-sm text-gray-500 font-mono">
                        {companyMode === 'existing' ? selectedCompany?.vat_number : vatNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Adresse Société */}
                <div className="flex items-center gap-2 pt-2 border-t border-purple-100">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    {companyMode === 'existing' && selectedCompany ? (
                      <span>
                        {selectedCompany.street} {selectedCompany.street_number}, {selectedCompany.postal_code} {selectedCompany.city}, {selectedCompany.country}
                      </span>
                    ) : (
                      <span>
                        {street} {streetNumber}, {postalCode} {city}, {country}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Carte Contact Unifiée */}
      <Card className="overflow-hidden border-gray-200 shadow-sm">
        {/* En-tête Contact */}
        <div className="bg-gray-50/50 border-b border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white border border-gray-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <User className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {contactName}
              </h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className="bg-blue-600 hover:bg-blue-700">
                  {getContactTypeLabel()}
                </Badge>
                <Badge variant="outline" className="text-gray-600">
                  {personOrCompany === 'company' ? 'Contact Société' : 'Personne physique'}
                </Badge>
                {specialty && contactType === 'prestataire' && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                    {getSpecialtyLabel(specialty)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {/* Colonne Gauche: Coordonnées */}
            <div className="p-6 space-y-6">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Coordonnées</h4>

              <div className="space-y-4">
                <div className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Mail className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="text-sm font-medium text-gray-900">{email}</div>
                  </div>
                </div>

                {phone && (
                  <div className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-green-50 transition-colors">
                      <Phone className="h-4 w-4 text-gray-400 group-hover:text-green-500" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Téléphone</div>
                      <div className="text-sm font-medium text-gray-900">{phone}</div>
                    </div>
                  </div>
                )}
              </div>

              {notes && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Notes</div>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Colonne Droite: Invitation & Accès */}
            <div className={`p-6 ${inviteToApp ? 'bg-blue-50/30' : 'bg-gray-50/30'}`}>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">Accès & Invitation</h4>

              <div className={`rounded-xl border p-4 ${inviteToApp ? 'bg-white border-blue-100 shadow-sm' : 'bg-gray-50 border-gray-200 border-dashed'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${inviteToApp ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                    {inviteToApp ? <CheckCircle className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                  </div>
                  <div className="space-y-1">
                    <div className={`font-medium text-sm ${inviteToApp ? 'text-blue-900' : 'text-gray-700'}`}>
                      {inviteToApp ? "Invitation active" : "Pas d'accès"}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {inviteToApp
                        ? `Un email sera envoyé à ${email} pour configurer son accès.`
                        : "Ce contact ne pourra pas se connecter à l'application."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

