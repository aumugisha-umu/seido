"use client"

import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Users, Shield, ScrollText, Plus, Edit, Calendar, CreditCard, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ContactSection } from "@/components/ui/contact-section"
import { cn } from "@/lib/utils"
import { transformContactsByRole } from "./lot-card-header"
import type { LotCardExpandedContentProps, BaseContact, LotContract } from "./types"

// ── Helpers (mirrored from locataire-dashboard-hybrid) ──

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatCurrency = (amount?: number | null) => {
  if (!amount) return null
  return new Intl.NumberFormat('fr-FR').format(amount)
}

const calculateRemainingTime = (endDate?: string) => {
  if (!endDate) return null
  const end = new Date(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  const diffMs = end.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { text: `Expiré il y a ${Math.abs(diffDays)}j`, isExpired: true, isExpiringSoon: false }
  if (diffDays === 0) return { text: "Expire aujourd'hui", isExpired: false, isExpiringSoon: true }
  if (diffDays <= 30) return { text: `${diffDays}j restants`, isExpired: false, isExpiringSoon: true }
  const months = Math.floor(diffDays / 30)
  return { text: `${months} mois restants`, isExpired: false, isExpiringSoon: false }
}

const getContractProgress = (contract: LotContract) => {
  const start = new Date(contract.start_date)
  const end = new Date(contract.end_date)
  const today = new Date()
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))
}

/**
 * Expanded content section with:
 * - Contact sections grid (3 columns: managers, providers, others)
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
  const { managers, providers, others } = transformContactsByRole(lot.lot_contacts || [])

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
      {/* Contact sections grid - 3 columns on desktop (tenants are managed via contracts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
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

      {/* Contract section (bail details + contacts) */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Contrats
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
              const remaining = calculateRemainingTime(contract.end_date)
              const progressPercent = getContractProgress(contract)
              const rentFormatted = formatCurrency(contract.rent_amount)
              const chargesFormatted = formatCurrency(contract.charges_amount)
              const returnUrl = buildReturnUrl(lot.id)

              return (
                <div key={contract.id} className="bg-gray-50 rounded-lg p-3">
                  {/* Header: title + status + edit */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          contract.status === 'actif'
                            ? 'text-green-700 border-green-300 bg-green-50'
                            : 'text-amber-700 border-amber-300 bg-amber-50'
                        }
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        {contract.status === 'actif' ? 'Bail en cours' : 'Bail à venir'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/gestionnaire/contrats/${contract.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        Voir le bail
                      </Link>
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
                    </div>
                  </div>

                  {/* Dates + progress bar + remaining */}
                  <p className="text-sm font-medium text-gray-800">
                    {formatDate(contract.start_date)} — {formatDate(contract.end_date)}
                  </p>
                  {remaining && (
                    <div className="mt-1.5">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            progressPercent >= 90 ? 'bg-red-400' :
                            progressPercent >= 75 ? 'bg-amber-400' : 'bg-primary'
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className={cn(
                        "text-xs mt-0.5",
                        remaining.isExpired ? 'text-red-600 font-medium' :
                        remaining.isExpiringSoon ? 'text-amber-600 font-medium' : 'text-muted-foreground'
                      )}>
                        {remaining.text}
                      </p>
                    </div>
                  )}

                  {/* Rent info */}
                  {rentFormatted && (
                    <p className="text-sm text-gray-700 mt-2 flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                      <span>Loyer: </span>
                      <span className="font-semibold">{rentFormatted}€</span>
                      {chargesFormatted && (
                        <span className="text-muted-foreground"> (+{chargesFormatted}€ charges)</span>
                      )}
                    </p>
                  )}

                  {/* Tenants + Guarantors */}
                  {(contractTenants.length > 0 || contractGuarantors.length > 0) && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-2 border-t border-gray-200">
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
                  )}
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
