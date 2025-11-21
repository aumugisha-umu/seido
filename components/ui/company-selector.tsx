"use client"

import React, { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Loader2 } from 'lucide-react'
import { createBrowserCompanyRepository } from '@/lib/services/repositories/company.repository'
import { logger } from '@/lib/logger'

interface CompanySelectorProps {
  teamId: string
  value: string | null
  onChange: (companyId: string) => void
  placeholder?: string
  disabled?: boolean
}

/**
 * CompanySelector Component
 * Dropdown pour sélectionner une société existante de l'équipe
 */
export function CompanySelector({
  teamId,
  value,
  onChange,
  placeholder = "Sélectionner une société",
  disabled = false
}: CompanySelectorProps) {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true)
        setError(null)

        const repository = createBrowserCompanyRepository()
        const result = await repository.findActiveByTeam(teamId)

        if (result.success && result.data) {
          setCompanies(result.data)
          logger.info(`[COMPANY-SELECTOR] Loaded ${result.data.length} companies for team ${teamId}`)
        } else {
          logger.error('[COMPANY-SELECTOR] Failed to load companies:', result.error)
          setError('Erreur lors du chargement des sociétés')
        }
      } catch (err) {
        logger.error('[COMPANY-SELECTOR] Exception loading companies:', err)
        setError('Erreur lors du chargement des sociétés')
      } finally {
        setLoading(false)
      }
    }

    if (teamId) {
      fetchCompanies()
    }
  }, [teamId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Chargement des sociétés...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 border border-red-200 rounded-md bg-red-50">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

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
