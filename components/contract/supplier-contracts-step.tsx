"use client"

/**
 * Supplier Contracts Step — Repeatable form for adding multiple supplier contracts
 * Used in step 2 of the supplier contract wizard
 *
 * Design: Matches lease-form-details-merged-v1 patterns —
 * section icons, Separator groups, Label with icon/size props,
 * inline flex layouts with fixed widths, highlighted reference row.
 * Cards are collapsible via chevron; new cards prepend at top.
 */

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Trash2,
  Plus,
  Paperclip,
  X,
  FileText,
  User,
  Euro,
  Calendar,
  Bell,
  Upload,
  ChevronDown,
} from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import type { SupplierContractFormItem } from '@/lib/types/supplier-contract.types'
import {
  createEmptySupplierContractItem,
  COST_FREQUENCY_OPTIONS,
  NOTICE_PERIOD_UNIT_OPTIONS,
} from '@/lib/types/supplier-contract.types'
import { ContactSelector, type ContactSelectorRef } from '@/components/contact-selector'

interface SupplierContractsStepProps {
  contracts: SupplierContractFormItem[]
  onContractsChange: (contracts: SupplierContractFormItem[]) => void
  propertyReference: string
  teamId: string
  /** Number of existing supplier contracts in DB for offset numbering */
  existingContractCount?: number
  onRequestContactCreation?: (contactType: string) => void
}

export function SupplierContractsStep({
  contracts,
  onContractsChange,
  propertyReference,
  teamId,
  existingContractCount = 0,
  onRequestContactCreation,
}: SupplierContractsStepProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contactSelectorRef = useRef<ContactSelectorRef>(null)
  // Track which contract card is currently selecting a supplier
  const [selectingForTempId, setSelectingForTempId] = useState<string | null>(null)
  // Track which cards are collapsed (by tempId). New cards start expanded.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  // Per-card field validation errors keyed by `${tempId}.${field}`
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleCardBlur = useCallback((tempId: string, field: string, value: unknown) => {
    const key = `${tempId}.${field}`
    setFieldErrors(prev => {
      const next = { ...prev }
      switch (field) {
        case 'reference':
          if (!value || !(value as string).trim()) next[key] = 'La référence est requise'
          else delete next[key]
          break
        case 'supplier':
          if (!value) next[key] = 'Le fournisseur est requis'
          else delete next[key]
          break
      }
      return next
    })
  }, [])

  const clearCardFieldError = useCallback((tempId: string, field: string) => {
    const key = `${tempId}.${field}`
    setFieldErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const toggleCollapse = useCallback((tempId: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(tempId)) next.delete(tempId)
      else next.add(tempId)
      return next
    })
  }, [])

  const updateContract = useCallback((tempId: string, field: keyof SupplierContractFormItem, value: unknown) => {
    onContractsChange(contracts.map(c =>
      c.tempId === tempId ? { ...c, [field]: value } : c
    ))
  }, [contracts, onContractsChange])

  const addContract = useCallback(() => {
    const ref = propertyReference.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'CF'
    const newContract = createEmptySupplierContractItem(ref, existingContractCount + contracts.length + 1)
    // Prepend new card at the top; collapse all existing cards
    setCollapsedIds(new Set(contracts.map(c => c.tempId)))
    onContractsChange([newContract, ...contracts])
    // Scroll to top of container (new card is first)
    requestAnimationFrame(() => {
      const firstCard = containerRef.current?.querySelector('[data-contract-card]')
      firstCard?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [contracts, onContractsChange, propertyReference, existingContractCount])

  const removeContract = useCallback((tempId: string) => {
    if (contracts.length <= 1) return
    onContractsChange(contracts.filter(c => c.tempId !== tempId))
    setCollapsedIds(prev => {
      const next = new Set(prev)
      next.delete(tempId)
      return next
    })
  }, [contracts, onContractsChange])

  const handleFileAdd = useCallback((tempId: string, files: FileList | null) => {
    if (!files) return
    onContractsChange(contracts.map(c =>
      c.tempId === tempId ? { ...c, files: [...c.files, ...Array.from(files)] } : c
    ))
  }, [contracts, onContractsChange])

  const handleFileRemove = useCallback((tempId: string, fileIndex: number) => {
    onContractsChange(contracts.map(c =>
      c.tempId === tempId ? { ...c, files: c.files.filter((_, i) => i !== fileIndex) } : c
    ))
  }, [contracts, onContractsChange])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center max-w-2xl mx-auto mb-2">
        <h2 className="text-2xl font-bold mb-2">Contrats fournisseurs</h2>
        <p className="text-sm text-muted-foreground">
          Ajoutez un ou plusieurs contrats fournisseurs. Chaque contrat peut avoir ses propres pièces jointes.
        </p>
      </div>

      <div ref={containerRef} className="space-y-4 max-w-3xl mx-auto">
        {/* Add contract button — at the top */}
        <Button
          variant="outline"
          className="w-full border-dashed border-border/80 h-11 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
          onClick={addContract}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un contrat fournisseur
        </Button>

        {contracts.map((contract, index) => {
          const isCollapsed = collapsedIds.has(contract.tempId)
          const supplierName = contract.supplierName

          return (
            <Card key={contract.tempId} data-contract-card className="shadow-sm overflow-hidden">
              {/* ── Clickable header row (always visible) ── */}
              <div
                role="button"
                tabIndex={0}
                className="w-full flex items-center gap-3 px-6 py-3.5 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => toggleCollapse(contract.tempId)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapse(contract.tempId) } }}
              >
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {contract.reference || `Contrat #${index + 1}`}
                    </span>
                    {supplierName && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        — {supplierName}
                      </span>
                    )}
                  </div>
                  {isCollapsed && contract.cost !== null && contract.cost > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {contract.cost.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      {contract.costFrequency && ` / ${COST_FREQUENCY_OPTIONS.find(o => o.value === contract.costFrequency)?.label.toLowerCase()}`}
                      {contract.endDate && ` · Fin ${contract.endDate}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-xs font-mono hidden sm:flex">
                    {contract.reference || 'CF-...'}
                  </Badge>
                  {contracts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeContract(contract.tempId) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    !isCollapsed && "rotate-180"
                  )} />
                </div>
              </div>

              {/* ── Collapsible content ── */}
              <div className={cn(
                "grid transition-all duration-200 ease-in-out",
                isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
              )}>
                <div className="overflow-hidden">
                  <CardContent className="px-6 pb-5 pt-0 space-y-5">

                    {/* ── Reference + Supplier ── */}
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="space-y-1.5 flex-1">
                          <Label size="sm">Référence</Label>
                          <Input
                            value={contract.reference}
                            onChange={(e) => {
                              updateContract(contract.tempId, 'reference', e.target.value)
                              clearCardFieldError(contract.tempId, 'reference')
                            }}
                            onBlur={() => handleCardBlur(contract.tempId, 'reference', contract.reference)}
                            aria-invalid={!!fieldErrors[`${contract.tempId}.reference`]}
                            aria-describedby={fieldErrors[`${contract.tempId}.reference`] ? `${contract.tempId}-reference-error` : undefined}
                            placeholder="CF-IMM-001"
                            className="h-9 font-mono bg-white/80"
                          />
                          {fieldErrors[`${contract.tempId}.reference`] && (
                            <p id={`${contract.tempId}-reference-error`} className="text-xs text-destructive mt-1">{fieldErrors[`${contract.tempId}.reference`]}</p>
                          )}
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <Label icon={User} size="sm" required>Fournisseur</Label>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-9 w-full justify-start font-normal bg-white/80",
                              !contract.supplierId && "text-muted-foreground",
                              fieldErrors[`${contract.tempId}.supplier`] && "border-destructive"
                            )}
                            aria-invalid={!!fieldErrors[`${contract.tempId}.supplier`]}
                            aria-describedby={fieldErrors[`${contract.tempId}.supplier`] ? `${contract.tempId}-supplier-error` : undefined}
                            onClick={() => {
                              setSelectingForTempId(contract.tempId)
                              contactSelectorRef.current?.openContactModal(
                                'provider', undefined,
                                contract.supplierId ? [contract.supplierId] : []
                              )
                            }}
                            onBlur={() => handleCardBlur(contract.tempId, 'supplier', contract.supplierId)}
                          >
                            <User className="h-3.5 w-3.5 mr-2 shrink-0" />
                            <span className="truncate">
                              {contract.supplierName || 'Sélectionner un prestataire'}
                            </span>
                          </Button>
                          {fieldErrors[`${contract.tempId}.supplier`] && (
                            <p id={`${contract.tempId}-supplier-error`} className="text-xs text-destructive mt-1">{fieldErrors[`${contract.tempId}.supplier`]}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* ── Section: Conditions & Dates (single row) ── */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Euro className="h-4 w-4 text-primary" />
                        Conditions et dates
                      </div>

                      <div className="flex flex-wrap items-end gap-3">
                        {/* Cost */}
                        <div className="space-y-1.5 w-28">
                          <Label icon={Euro} size="sm">Coût</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={contract.cost ?? ''}
                              onChange={(e) => updateContract(contract.tempId, 'cost', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="0.00"
                              step="0.01"
                              className="h-9 pr-6 text-right"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">€</span>
                          </div>
                        </div>

                        {/* Frequency */}
                        <div className="space-y-1.5 w-32">
                          <Label size="sm">Fréquence</Label>
                          <Select
                            value={contract.costFrequency || ''}
                            onValueChange={(value) => updateContract(contract.tempId, 'costFrequency', value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {COST_FREQUENCY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Subtle divider */}
                        <div className="hidden md:block w-px h-9 bg-border/60" />

                        {/* End date */}
                        <div className="space-y-1.5 w-[10rem]">
                          <Label icon={Calendar} size="sm" required>Fin</Label>
                          <DatePicker
                            value={contract.endDate}
                            onChange={(value) => updateContract(contract.tempId, 'endDate', value)}
                            className="h-9"
                          />
                        </div>

                        {/* Notice period — inline after end date */}
                        <div className="space-y-1.5">
                          <Label icon={Bell} size="sm">Préavis</Label>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={0}
                              value={contract.noticePeriodValue ?? ''}
                              onChange={(e) => updateContract(contract.tempId, 'noticePeriodValue', e.target.value ? parseInt(e.target.value) : null)}
                              placeholder="0"
                              className="h-9 w-14 text-center"
                            />
                            <Select
                              value={contract.noticePeriodUnit}
                              onValueChange={(value) => updateContract(contract.tempId, 'noticePeriodUnit', value)}
                            >
                              <SelectTrigger className="h-9 w-[6.5rem]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {NOTICE_PERIOD_UNIT_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* ── Section: Pièces jointes ── */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Paperclip className="h-4 w-4 text-primary" />
                        Pièces jointes
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {contract.files.map((file, fileIndex) => (
                          <div
                            key={fileIndex}
                            className="flex items-center gap-1.5 bg-muted/60 border border-border/50 px-2.5 py-1.5 rounded-md text-sm group transition-colors hover:bg-muted"
                          >
                            <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="max-w-[160px] truncate">{file.name}</span>
                            <button
                              type="button"
                              className="ml-0.5 text-muted-foreground/60 hover:text-destructive transition-colors"
                              onClick={() => handleFileRemove(contract.tempId, fileIndex)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}

                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border/80 cursor-pointer text-sm text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Ajouter un fichier</span>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFileAdd(contract.tempId, e.target.files)}
                          />
                        </label>
                      </div>

                      {contract.files.length === 0 && (
                        <p className="text-xs text-muted-foreground/60">
                          Aucun fichier. Vous pouvez ajouter des contrats, factures ou autres documents.
                        </p>
                      )}
                    </div>

                  </CardContent>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Shared ContactSelector modal — single-select for providers */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={teamId}
        displayMode="compact"
        hideUI={true}
        selectionMode="single"
        allowedContactTypes={['provider']}
        onRequestContactCreation={(contactType) => {
          onRequestContactCreation?.(contactType)
        }}
        onContactSelected={(contact) => {
          if (selectingForTempId) {
            onContractsChange(contracts.map(c =>
              c.tempId === selectingForTempId
                ? { ...c, supplierId: contact.id, supplierName: contact.name }
                : c
            ))
            setSelectingForTempId(null)
          }
        }}
        onContactRemoved={() => {
          if (selectingForTempId) {
            onContractsChange(contracts.map(c =>
              c.tempId === selectingForTempId
                ? { ...c, supplierId: null, supplierName: '' }
                : c
            ))
          }
        }}
      />
    </div>
  )
}
