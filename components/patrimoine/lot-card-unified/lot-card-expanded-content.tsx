"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Users, Shield, ScrollText, Plus, Edit } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ContactSection } from "@/components/ui/contact-section"
import { transformContactsByRole } from "./lot-card-header"
import type { LotCardExpandedContentProps, BaseContact } from "./types"

/**
 * Expanded content section with:
 * - Contact sections grid (5 columns: managers, tenants, providers, owners, others)
 * - Contract contacts section (tenants + guarantors from active contracts)
 */
export function LotCardExpandedContent({
  lot,
  buildingContext,
  lotContactIdsMap: _lotContactIdsMap,
  teamId: _teamId,
  onAddContact,
  onRemoveContact,
  readOnly = false
}: LotCardExpandedContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Note: lotContactIdsMap and teamId are passed for future contact selector integration
  void _lotContactIdsMap
  void _teamId
  // Note: tenants are not extracted here - they are managed via contracts
  const { managers, providers, owners, others } = transformContactsByRole(lot.lot_contacts || [])

  /**
   * Build return URL dynamically from current location.
   * This makes the "Modifier" button work from ANY context (building details, lot list, etc.)
   */
  const buildReturnUrl = (lotId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('expandLot', lotId)
    return `${pathname}?${params.toString()}`
  }

  // Handle contact removal via the parent callback
  const handleRemoveContact = (contact: BaseContact, lotId: string) => {
    onRemoveContact?.(contact.id, lotId)
  }

  return (
    <div className="pt-0 pb-2 px-0">
      {/* Contact sections grid - 4 columns on desktop (tenants are managed via contracts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <ContactSection
          sectionType="managers"
          contacts={managers}
          readOnly={readOnly}
          onAddContact={readOnly ? undefined : () => onAddContact?.('gestionnaires', lot.id)}
          onRemoveContact={readOnly ? undefined : (id) => {
            const contact = managers.find(c => c.id === id)
            if (contact) handleRemoveContact(contact, lot.id)
          }}
          inheritedContacts={buildingContext?.managers}
          showInheritedSummary={true}
        />
        <ContactSection
          sectionType="providers"
          contacts={providers}
          readOnly={readOnly}
          onAddContact={readOnly ? undefined : () => onAddContact?.('prestataires', lot.id)}
          onRemoveContact={readOnly ? undefined : (id) => {
            const contact = providers.find(c => c.id === id)
            if (contact) handleRemoveContact(contact, lot.id)
          }}
          inheritedContacts={buildingContext?.providers}
          showInheritedSummary={true}
        />
        <ContactSection
          sectionType="owners"
          contacts={owners}
          readOnly={readOnly}
          onAddContact={readOnly ? undefined : () => onAddContact?.('propriétaires', lot.id)}
          onRemoveContact={readOnly ? undefined : (id) => {
            const contact = owners.find(c => c.id === id)
            if (contact) handleRemoveContact(contact, lot.id)
          }}
          inheritedContacts={buildingContext?.owners}
          showInheritedSummary={true}
        />
        <ContactSection
          sectionType="others"
          contacts={others}
          readOnly={readOnly}
          onAddContact={readOnly ? undefined : () => onAddContact?.('autres contacts', lot.id)}
          onRemoveContact={readOnly ? undefined : (id) => {
            const contact = others.find(c => c.id === id)
            if (contact) handleRemoveContact(contact, lot.id)
          }}
          inheritedContacts={buildingContext?.others}
          showInheritedSummary={true}
        />
      </div>

      {/* Contract contacts section (tenants, guarantors from active contracts) */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Contacts liés aux contrats
          </h4>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/gestionnaire/contrats/nouveau?lot=${lot.id}`)
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Ajouter un contrat
            </Button>
          )}
        </div>
        {lot.contracts && lot.contracts.length > 0 ? (
          <div className="space-y-3">
            {lot.contracts.map((contract) => {
              const contractTenants = contract.contacts?.filter(
                c => c.role === 'locataire' || c.role === 'colocataire'
              ) || []
              const contractGuarantors = contract.contacts?.filter(
                c => c.role === 'garant'
              ) || []

              if (contractTenants.length === 0 && contractGuarantors.length === 0) {
                return null
              }

              // Build modular return URL from current location
              const returnUrl = buildReturnUrl(lot.id)

              return (
                <div key={contract.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">
                      {contract.title}
                    </span>
                    <div className="flex items-center gap-2">
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/gestionnaire/contrats/modifier/${contract.id}?step=2&returnTo=${encodeURIComponent(returnUrl)}`)
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Modifier
                        </Button>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          contract.status === 'actif'
                            ? 'text-green-700 border-green-300 bg-green-50'
                            : 'text-amber-700 border-amber-300 bg-amber-50'
                        }
                      >
                        {contract.status === 'actif' ? 'Actif' : 'À venir'}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Tenants column */}
                    {contractTenants.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Locataires ({contractTenants.length})
                        </div>
                        <div className="space-y-1">
                          {contractTenants.map((contact) => (
                            <div
                              key={contact.id}
                              className="text-xs bg-white rounded px-2 py-1 border border-blue-100"
                            >
                              <span className="font-medium text-blue-700">
                                {contact.user.name}
                              </span>
                              {contact.role === 'colocataire' && (
                                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                                  Coloc
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Guarantors column */}
                    {contractGuarantors.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Garants ({contractGuarantors.length})
                        </div>
                        <div className="space-y-1">
                          {contractGuarantors.map((contact) => (
                            <div
                              key={contact.id}
                              className="text-xs bg-white rounded px-2 py-1 border border-amber-100"
                            >
                              <span className="font-medium text-amber-700">
                                {contact.user.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            Aucun contrat actif pour ce lot
          </p>
        )}
      </div>
    </div>
  )
}

export default LotCardExpandedContent
