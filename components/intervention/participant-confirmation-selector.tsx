"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  speciality?: string
  isCurrentUser?: boolean
  type?: "gestionnaire" | "prestataire" | "locataire"
}

interface ParticipantCheckboxProps {
  contact: Contact
  badge: string
  badgeVariant?: "default" | "secondary" | "outline" | "destructive"
  checked: boolean
  onToggle: (userId: string, required: boolean) => void
}

function ParticipantCheckbox({
  contact,
  badge,
  badgeVariant = "secondary",
  checked,
  onToggle
}: ParticipantCheckboxProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
        "hover:bg-slate-100",
        checked && "bg-blue-50 hover:bg-blue-100"
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(checkedState) => onToggle(contact.id, checkedState as boolean)}
        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
      />
      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-slate-900 truncate block">
          {contact.name}
        </span>
        {contact.email && (
          <span className="text-xs text-slate-500 truncate block">
            {contact.email}
          </span>
        )}
      </div>
      <Badge
        variant={badgeVariant}
        className={cn(
          "text-xs flex-shrink-0",
          badge === "Locataire" && "bg-blue-100 text-blue-800 hover:bg-blue-100"
        )}
      >
        {badge}
      </Badge>
    </label>
  )
}

export interface ParticipantConfirmationSelectorProps {
  managers: Contact[]
  providers: Contact[]
  tenants: Contact[]
  confirmationRequired: string[]
  onToggle: (userId: string, required: boolean) => void
  /** Mode obligatoire (pas de texte "Sélectionnez") */
  mandatory?: boolean
}

export function ParticipantConfirmationSelector({
  managers,
  providers,
  tenants,
  confirmationRequired,
  onToggle,
  mandatory = false
}: ParticipantConfirmationSelectorProps) {
  // Filtrer les gestionnaires pour exclure l'utilisateur courant
  const otherManagers = managers.filter(m => !m.isCurrentUser)

  // Compter le nombre total de participants sélectionnables
  const totalParticipants = otherManagers.length + providers.length + tenants.length
  const selectedCount = confirmationRequired.length

  // Si aucun participant à afficher
  if (totalParticipants === 0) {
    return (
      <div className="p-3 text-center text-sm text-slate-500 bg-slate-50 rounded-lg">
        Aucun autre participant à sélectionner
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200">
      {!mandatory && (
        <p className="text-xs text-slate-600">
          Sélectionnez les participants qui doivent confirmer leur disponibilité :
        </p>
      )}

      {/* Compteur */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{selectedCount} sur {totalParticipants} sélectionné{selectedCount > 1 ? 's' : ''}</span>
        {selectedCount === 0 && mandatory && (
          <span className="text-amber-600 font-medium">
            Sélectionnez au moins 1 participant
          </span>
        )}
      </div>

      {/* Liste des participants par catégorie */}
      <div className="space-y-3">
        {/* Gestionnaires (sauf utilisateur courant) */}
        {otherManagers.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1">
              Gestionnaires
            </div>
            {otherManagers.map(manager => (
              <ParticipantCheckbox
                key={manager.id}
                contact={manager}
                badge="Gestionnaire"
                badgeVariant="secondary"
                checked={confirmationRequired.includes(manager.id)}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}

        {/* Prestataires */}
        {providers.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1">
              Prestataires
            </div>
            {providers.map(provider => (
              <ParticipantCheckbox
                key={provider.id}
                contact={provider}
                badge="Prestataire"
                badgeVariant="outline"
                checked={confirmationRequired.includes(provider.id)}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}

        {/* Locataires */}
        {tenants.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1">
              Locataires
            </div>
            {tenants.map(tenant => (
              <ParticipantCheckbox
                key={tenant.id}
                contact={tenant}
                badge="Locataire"
                checked={confirmationRequired.includes(tenant.id)}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
