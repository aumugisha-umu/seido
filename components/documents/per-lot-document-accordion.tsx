"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DocumentChecklistGeneric } from "@/components/documents/document-checklist-generic"
import type { UsePropertyDocumentUploadReturn } from "@/hooks/use-property-document-upload"
import { getLotCategoryConfig, type LotCategory } from "@/lib/lot-types"

interface LotInfo {
  id: string
  reference: string
  category: string
}

interface ExistingDoc {
  id: string
  document_type: string
  original_filename: string
  uploaded_at: string
}

interface PerLotDocumentAccordionProps {
  lots: LotInfo[]
  lotDocUploads: { [lotId: string]: UsePropertyDocumentUploadReturn }
  /** Optional building-level document upload (rendered above lot accordion) */
  buildingDocUpload?: UsePropertyDocumentUploadReturn
  /** Building name for the building-level checklist title */
  buildingName?: string
  /** Existing building documents (read-only display) */
  existingBuildingDocs?: ExistingDoc[]
}

const DOC_TYPE_LABELS: Record<string, string> = {
  'certificat_peb': 'Certificat PEB/EPC',
  'entretien_chaudiere': 'Entretien chaudière',
  'etat_des_lieux': 'État des lieux',
  'controle_ascenseur': 'Contrôle ascenseur',
  'autre': 'Autre document',
}

/**
 * Shared accordion for per-lot document checklists.
 *
 * Used in both building and lot creation wizards.
 * All lot cards are expanded by default.
 * Optionally renders a building-level document checklist above the lots.
 */
export function PerLotDocumentAccordion({
  lots,
  lotDocUploads,
  buildingDocUpload,
  buildingName,
  existingBuildingDocs
}: PerLotDocumentAccordionProps) {
  // All lots expanded by default — undefined = open, explicit false = closed
  const [expandedLots, setExpandedLots] = useState<Record<string, boolean>>({})

  const toggleExpansion = (lotId: string) => {
    setExpandedLots(prev => ({ ...prev, [lotId]: prev[lotId] === false ? true : false }))
  }

  return (
    <div className="space-y-6">
      {/* Existing building documents (read-only) */}
      {existingBuildingDocs && existingBuildingDocs.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <h4 className="text-sm font-semibold text-green-800">
              Documents existants — {buildingName || 'Immeuble'}
            </h4>
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
              {existingBuildingDocs.length} fichier{existingBuildingDocs.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="space-y-1">
            {existingBuildingDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm text-green-700 pl-6">
                <span className="font-medium">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</span>
                <span className="text-green-500">·</span>
                <span className="text-green-600 truncate">{doc.original_filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Building-level documents (optional) */}
      {buildingDocUpload && (
        <DocumentChecklistGeneric
          title={`Documents — ${buildingName || 'Immeuble'}`}
          slots={buildingDocUpload.slots}
          onAddFilesToSlot={buildingDocUpload.addFilesToSlot}
          onRemoveFileFromSlot={buildingDocUpload.removeFileFromSlot}
          progress={buildingDocUpload.progress}
          missingRecommendedTypes={buildingDocUpload.missingRecommendedTypes}
          isUploading={buildingDocUpload.isUploading}
          onSetSlotDocumentDate={buildingDocUpload.setSlotDocumentDate}
          onSetSlotValidityDuration={buildingDocUpload.setSlotValidityDuration}
          onSetSlotCustomExpiry={buildingDocUpload.setSlotCustomExpiry}
        />
      )}

      {/* Per-lot document accordion */}
      {lots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-sm font-semibold text-gray-700">
              Documents spécifiques aux lots
            </h3>
            <span className="text-xs text-muted-foreground">
              ({lots.length} lot{lots.length > 1 ? 's' : ''})
            </span>
          </div>

          <div className="space-y-3">
            {lots.map((lot, index) => {
              const lotNumber = lots.length - index
              const upload = lotDocUploads[lot.id]
              if (!upload) return null

              const isExpanded = expandedLots[lot.id] !== false
              const categoryConfig = getLotCategoryConfig(lot.category as LotCategory)

              return (
                <div key={lot.id} className="border rounded-lg bg-white overflow-hidden">
                  {/* Lot header — clickable accordion */}
                  <button
                    type="button"
                    onClick={() => toggleExpansion(lot.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold",
                      "bg-blue-100 text-blue-700"
                    )}>
                      #{lotNumber}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-medium text-sm">{lot.reference}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {categoryConfig.label}
                      </Badge>
                    </div>
                    {upload.hasFiles && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        {upload.progress.percentage}%
                      </Badge>
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {/* Expanded: document checklist */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t">
                      <DocumentChecklistGeneric
                        title={`Documents — ${lot.reference}`}
                        slots={upload.slots}
                        onAddFilesToSlot={upload.addFilesToSlot}
                        onRemoveFileFromSlot={upload.removeFileFromSlot}
                        progress={upload.progress}
                        missingRecommendedTypes={upload.missingRecommendedTypes}
                        isUploading={upload.isUploading}
                        onSetSlotDocumentDate={upload.setSlotDocumentDate}
                        onSetSlotValidityDuration={upload.setSlotValidityDuration}
                        onSetSlotCustomExpiry={upload.setSlotCustomExpiry}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
