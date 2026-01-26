"use client"

import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2 } from 'lucide-react'

interface Company {
  id: string
  name: string
  vat_number?: string | null
  city?: string | null
}

interface CompanySelectorProps {
  /** Liste des sociétés (passées depuis le serveur, pas de fetch client) */
  companies: Company[]
  value: string | null
  onChange: (companyId: string) => void
  placeholder?: string
  disabled?: boolean
  /** @deprecated Plus utilisé - les sociétés sont passées en prop */
  teamId?: string
}

/**
 * CompanySelector Component
 * Dropdown pour sélectionner une société existante de l'équipe
 *
 * ✅ Utilise les sociétés pré-chargées côté serveur (pas de fetch client)
 */
export function CompanySelector({
  companies,
  value,
  onChange,
  placeholder = "Sélectionner une société",
  disabled = false
}: CompanySelectorProps) {

  if (companies.length === 0) {
    return (
      <div className="p-3 border rounded-md bg-gray-50">
        <p className="text-sm text-gray-500">
          Aucune société disponible. Créez-en une nouvelle.
        </p>
      </div>
    )
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <div className="flex flex-col">
                <span className="font-medium">{company.name}</span>
                <span className="text-xs text-gray-500">
                  {company.vat_number && `TVA: ${company.vat_number}`}
                  {company.vat_number && company.city && ' • '}
                  {company.city}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
