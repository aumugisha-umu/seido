import { User, CheckCircle, UserX, Bell, BellOff, Send, Info, AlertTriangle, Crown, Shield } from "lucide-react"
import { getTypeLabel } from "@/components/interventions/intervention-type-icon"
import {
  ConfirmationPageShell,
  ConfirmationEntityHeader,
  ConfirmationSection,
  ConfirmationKeyValueGrid,
} from "@/components/confirmation"

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

interface Contract {
  id: string
  reference?: string | null
  lot?: {
    id: string
    reference: string
    building?: {
      name: string
    } | null
  } | null
  start_date?: string | null
  status?: string | null
}

interface Step4ConfirmationProps {
  contactType: 'locataire' | 'prestataire' | 'gestionnaire' | 'proprietaire' | 'garant'
  personOrCompany: 'person' | 'company'
  specialty?: string
  providerCategory?: string
  customRoleDescription?: string
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
  linkedEntityType?: 'building' | 'lot' | 'contract' | 'supplier_contract' | null
  linkedBuildingId?: string | null
  linkedLotId?: string | null
  linkedContractId?: string | null
  linkedSupplierContractId?: string | null
  // Données pour affichage (noms/références)
  buildings?: Building[]
  lots?: Lot[]
  contracts?: Contract[]
}

export function Step4Confirmation({
  contactType,
  personOrCompany,
  specialty,
  providerCategory,
  customRoleDescription,
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
  linkedSupplierContractId,
  buildings,
  lots,
  contracts
}: Step4ConfirmationProps) {
  // Helper pour formater le type de contact
  const getContactTypeLabel = () => {
    const labels = {
      locataire: 'Locataire',
      prestataire: 'Prestataire',
      gestionnaire: 'Gestionnaire',
      proprietaire: 'Propriétaire',
      garant: 'Garant'
    }
    return labels[contactType]
  }

  // Helper pour la couleur de l'icône selon le type
  const getIconColor = (): "green" | "blue" | "amber" | "purple" | "primary" => {
    const colors = {
      prestataire: 'green' as const,
      locataire: 'blue' as const,
      gestionnaire: 'purple' as const,
      proprietaire: 'purple' as const,
      garant: 'amber' as const,
    }
    return colors[contactType]
  }

  // Helper pour formater la spécialité - utilise le mapping centralisé
  const getSpecialtyLabel = (value: string) => getTypeLabel(value)

  // Trouver le nom de la société si existante
  const selectedCompany = companyId ? companies.find(c => c.id === companyId) : null

  // Nom du contact
  const contactName = firstName && lastName
    ? `${firstName} ${lastName}`
    : firstName || lastName || (personOrCompany === 'company' ? (companyName || selectedCompany?.name || 'Société') : 'Contact')

  // Sous-titre: type + spécialité/catégorie si prestataire
  const subtitle = (() => {
    if (contactType === 'prestataire') {
      if (specialty) return `${getContactTypeLabel()} — ${getSpecialtyLabel(specialty)}`
      if (providerCategory) return `${getContactTypeLabel()} — ${providerCategory.charAt(0).toUpperCase() + providerCategory.slice(1)}`
    }
    // Garant has no subtitle variation
    return getContactTypeLabel()
  })()

  // Badges
  const badges: Array<{ label: string; variant?: "default" | "secondary" | "outline"; className?: string }> = [
    { label: getContactTypeLabel(), variant: "default", className: "bg-blue-600 hover:bg-blue-700" },
    { label: personOrCompany === 'company' ? 'Contact Société' : 'Personne physique', variant: "outline" },
  ]
  if (contactType === 'prestataire') {
    if (specialty) {
      badges.push({
        label: getSpecialtyLabel(specialty),
        variant: "secondary",
        className: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800",
      })
    } else if (providerCategory) {
      badges.push({
        label: providerCategory.charAt(0).toUpperCase() + providerCategory.slice(1),
        variant: "secondary",
        className: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800",
      })
    }
  }

  // Société: adresse formatée
  const companyDisplayName = companyMode === 'existing' && selectedCompany
    ? selectedCompany.name
    : companyName || undefined

  const companyVat = companyMode === 'existing' && selectedCompany
    ? selectedCompany.vat_number
    : vatNumber

  const companyAddress = (() => {
    if (companyMode === 'existing' && selectedCompany) {
      const parts = [
        selectedCompany.street,
        selectedCompany.street_number,
        selectedCompany.postal_code,
        selectedCompany.city,
        selectedCompany.country,
      ].filter(Boolean)
      return parts.length > 0 ? parts.join(', ') : undefined
    }
    const parts = [street, streetNumber, postalCode, city, country].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : undefined
  })()

  // Liaison entité
  const linkedEntityPairs = (() => {
    if (!linkedEntityType) return null

    if (linkedEntityType === 'building' && linkedBuildingId) {
      const b = buildings?.find(b => b.id === linkedBuildingId)
      return [
        { label: "Type", value: "Immeuble" },
        { label: "Entité", value: b?.name || 'Immeuble sélectionné' },
        ...(b?.address ? [{ label: "Adresse", value: b.address }] : []),
      ]
    }

    if (linkedEntityType === 'lot' && linkedLotId) {
      const l = lots?.find(l => l.id === linkedLotId)
      return [
        { label: "Type", value: "Lot" },
        { label: "Entité", value: l?.reference || 'Lot sélectionné' },
        ...(l?.building?.name ? [{ label: "Immeuble parent", value: l.building.name }] : []),
      ]
    }

    if (linkedEntityType === 'contract' && linkedContractId) {
      const c = contracts?.find(c => c.id === linkedContractId)
      return [
        { label: "Type", value: "Contrat" },
        { label: "Entité", value: c?.reference || c?.lot?.reference || 'Contrat sélectionné' },
        ...(c?.lot?.building?.name ? [{ label: "Immeuble parent", value: c.lot.building.name }] : []),
      ]
    }

    if (linkedEntityType === 'supplier_contract' && linkedSupplierContractId) {
      return [
        { label: "Type", value: "Contrat fournisseur" },
        { label: "Entité", value: `Contrat fournisseur sélectionné` },
      ]
    }

    return null
  })()

  return (
    <ConfirmationPageShell maxWidth="3xl">
      {/* En-tête */}
      <ConfirmationEntityHeader
        icon={User}
        iconColor={getIconColor()}
        title={contactName}
        subtitle={subtitle}
        badges={badges}
      />

      {/* Section Société */}
      <ConfirmationSection title="Société" card>
        {personOrCompany === 'company' ? (
          <ConfirmationKeyValueGrid
            columns={1}
            pairs={[
              { label: "Nom de la société", value: companyDisplayName, empty: !companyDisplayName },
              { label: "N° TVA", value: companyVat || undefined, empty: !companyVat },
              { label: "Adresse complète", value: companyAddress, empty: !companyAddress },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">Aucune société liée (personne physique)</p>
        )}
      </ConfirmationSection>

      {/* Section Contact */}
      <ConfirmationSection title="Contact" card>
        <ConfirmationKeyValueGrid
          columns={2}
          pairs={[
            { label: "Nom complet", value: contactName },
            { label: "Type", value: getContactTypeLabel() },
            {
              label: "Catégorie",
              value: providerCategory && contactType === 'prestataire' ? providerCategory.charAt(0).toUpperCase() + providerCategory.slice(1) : undefined,
              empty: !providerCategory || contactType !== 'prestataire',
            },
            {
              label: "Spécialité",
              value: specialty && contactType === 'prestataire' ? getSpecialtyLabel(specialty) : undefined,
              empty: !specialty || contactType !== 'prestataire',
            },
            // customRoleDescription row removed — garant is a defined role
          ]}
        />
      </ConfirmationSection>

      {/* Section Coordonnées */}
      <ConfirmationSection title="Coordonnées" card>
        <ConfirmationKeyValueGrid
          columns={2}
          pairs={[
            { label: "Email", value: email },
            { label: "Téléphone", value: phone || undefined, empty: !phone },
            { label: "Notes", value: notes || undefined, empty: !notes, fullWidth: true },
          ]}
        />
      </ConfirmationSection>

      {/* Section Accès & Invitation */}
      <ConfirmationSection title="Accès & invitation" card>
        <div className="space-y-3">
          {/* Proprietaire: dedicated card */}
          {contactType === 'proprietaire' ? (
            <div className="rounded-xl border p-4 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900 text-purple-600 flex-shrink-0">
                  <Crown className="h-4 w-4" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                    Pas d&apos;accès à l&apos;application (fonctionnalité à venir)
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
                    L&apos;invitation des propriétaires est sur notre roadmap. Ce contact sera enregistré dans votre base.
                  </p>
                </div>
              </div>
            </div>
          ) : contactType === 'garant' ? (
            /* Garant: dedicated card */
            <div className="rounded-xl border p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900 text-amber-600 flex-shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                    Garant — pas d&apos;accès à l&apos;application
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                    Ce contact sera enregistré et pourra être lié à un bail en tant que garant.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Statut principal — gestionnaire / prestataire / locataire */}
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
                      <span>Un email d&apos;invitation sera envoyé à <strong className="text-foreground">{email}</strong></span>
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
            </>
          )}

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
        </div>
      </ConfirmationSection>

      {/* Section Liaison entité */}
      <ConfirmationSection title="Liaison entité" card>
        {linkedEntityPairs ? (
          <ConfirmationKeyValueGrid columns={1} pairs={linkedEntityPairs} />
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">Aucune liaison — contact indépendant</p>
        )}
      </ConfirmationSection>
    </ConfirmationPageShell>
  )
}
