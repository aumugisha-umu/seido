import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Building2, Mail, Phone, FileText, MapPin, CheckCircle, UserX, Bell, BellOff, Send, Info, AlertTriangle, Link2, Home } from "lucide-react"
import { getTypeLabel } from "@/components/interventions/intervention-type-icon"

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
  // Statut email (venant de Step3)
  existsInCurrentTeam?: boolean
  hasAuthAccount?: boolean
  // Liaison à une entité (optionnel)
  linkedEntityType?: 'building' | 'lot' | 'contract' | null
  linkedBuildingId?: string | null
  linkedLotId?: string | null
  linkedContractId?: string | null
  // Données pour affichage (noms/références)
  buildings?: Building[]
  lots?: Lot[]
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
  companies,
  existsInCurrentTeam,
  hasAuthAccount,
  linkedEntityType,
  linkedBuildingId,
  linkedLotId,
  linkedContractId,
  buildings,
  lots
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

  // Helper pour formater la spécialité - utilise le mapping centralisé
  const getSpecialtyLabel = (value: string) => getTypeLabel(value)

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
        <Card className="border-l-4 border-l-purple-500 bg-purple-50/30 dark:bg-purple-950/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {companyMode === 'existing' && selectedCompany ? selectedCompany.name : companyName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-card text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800">
                      Société
                    </Badge>
                    {(companyMode === 'existing' && selectedCompany?.vat_number || vatNumber) && (
                      <span className="text-sm text-muted-foreground font-mono">
                        {companyMode === 'existing' ? selectedCompany?.vat_number : vatNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Adresse Société */}
                <div className="flex items-center gap-2 pt-2 border-t border-purple-100 dark:border-purple-800">
                  <MapPin className="h-4 w-4 text-muted-foreground/70" />
                  <div className="text-sm text-muted-foreground">
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
      <Card className="overflow-hidden border-border shadow-sm">
        {/* En-tête Contact */}
        <div className="bg-muted/50 border-b border-border p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {contactName}
              </h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className="bg-blue-600 hover:bg-blue-700">
                  {getContactTypeLabel()}
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {personOrCompany === 'company' ? 'Contact Société' : 'Personne physique'}
                </Badge>
                {specialty && contactType === 'prestataire' && (
                  <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800">
                    {getSpecialtyLabel(specialty)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Colonne Gauche: Coordonnées */}
            <div className="p-6 space-y-6">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Coordonnées</h4>

              <div className="space-y-4">
                <div className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-950 transition-colors">
                    <Mail className="h-4 w-4 text-muted-foreground/70 group-hover:text-blue-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-sm font-medium text-foreground">{email}</div>
                  </div>
                </div>

                {phone && (
                  <div className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-green-50 dark:group-hover:bg-green-950 transition-colors">
                      <Phone className="h-4 w-4 text-muted-foreground/70 group-hover:text-green-500" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Téléphone</div>
                      <div className="text-sm font-medium text-foreground">{phone}</div>
                    </div>
                  </div>
                )}
              </div>

              {notes && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Notes</div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Colonne Droite: Invitation & Accès */}
            <div className={`p-6 ${inviteToApp ? 'bg-blue-50/30 dark:bg-blue-950/30' : 'bg-muted/30'}`}>
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Accès & Invitation</h4>

              <div className="space-y-3">
                {/* Statut principal */}
                <div className={`rounded-xl border p-4 ${inviteToApp ? 'bg-card border-blue-200 dark:border-blue-800 shadow-sm' : 'bg-card border-border'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${inviteToApp ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'bg-amber-100 dark:bg-amber-900 text-amber-600'}`}>
                      {inviteToApp ? <CheckCircle className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className={`font-semibold text-sm ${inviteToApp ? 'text-blue-900 dark:text-blue-100' : 'text-amber-900 dark:text-amber-100'}`}>
                        {inviteToApp ? "Invitation à l'application" : "Contact sans accès"}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {inviteToApp
                          ? "Ce contact pourra se connecter à l'application et accéder à ses informations."
                          : "Ce contact sera enregistré mais ne pourra pas se connecter à l'application."
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Alerte si contact existant - UNIQUEMENT si dans l'équipe courante */}
                {existsInCurrentTeam && (
                  <div className="rounded-xl border p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900 text-amber-600 flex-shrink-0">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-amber-800 dark:text-amber-200">
                          {hasAuthAccount ? "Contact existant avec compte" : "Contact existant"}
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          {hasAuthAccount
                            ? "Ce contact existe déjà dans votre équipe et possède déjà un compte. La création va échouer."
                            : "Ce contact existe déjà dans votre équipe. La création va échouer."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ce qui va se passer */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>Ce qui va se passer</span>
                  </div>

                  {inviteToApp ? (
                    <ul className="space-y-2.5 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2.5">
                        <Send className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        <span>Un email d'invitation sera envoyé à <strong className="text-foreground">{email}</strong></span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Bell className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                        <span>Ce contact <strong className="text-foreground">recevra des notifications</strong> pour les interventions et actions le concernant</span>
                      </li>
                    </ul>
                  ) : (
                    <ul className="space-y-2.5 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2.5">
                        <UserX className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                        <span>Le contact sera créé mais <strong className="text-foreground">aucun email</strong> ne lui sera envoyé</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <BellOff className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <span>Ce contact <strong className="text-foreground">ne recevra pas de notifications</strong> automatiques</span>
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Section Liaison à une entité (si applicable) */}
      {linkedEntityType && (linkedBuildingId || linkedLotId || linkedContractId) && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Link2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Lié à
                </h3>

                {/* Immeuble */}
                {linkedEntityType === 'building' && linkedBuildingId && (
                  <div className="flex items-center gap-3 pt-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {buildings?.find(b => b.id === linkedBuildingId)?.name || 'Immeuble sélectionné'}
                      </p>
                      {buildings?.find(b => b.id === linkedBuildingId)?.address && (
                        <p className="text-sm text-muted-foreground">
                          {buildings?.find(b => b.id === linkedBuildingId)?.address}
                        </p>
                      )}
                      <Badge variant="outline" className="mt-1 bg-card text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                        Immeuble
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Lot */}
                {linkedEntityType === 'lot' && linkedLotId && (() => {
                  const selectedLot = lots?.find(l => l.id === linkedLotId)
                  return (
                    <div className="flex items-center gap-3 pt-2">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-foreground">
                          {selectedLot?.reference || 'Lot sélectionné'}
                        </p>
                        {selectedLot?.building?.name && (
                          <p className="text-sm text-muted-foreground">
                            {selectedLot.building.name}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-1 bg-card text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                          Lot
                        </Badge>
                      </div>
                    </div>
                  )
                })()}

                {/* Contrat */}
                {linkedEntityType === 'contract' && linkedContractId && (
                  <div className="flex items-center gap-3 pt-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-foreground">
                        Contrat sélectionné
                      </p>
                      <Badge variant="outline" className="mt-1 bg-card text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800">
                        Contrat
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

