'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Mail, Phone, MapPin, ExternalLink } from 'lucide-react'
import type { CompanyData } from './types'

interface ContactCompanyCardProps {
  company: CompanyData
  onNavigateToCompany: (companyId: string) => void
}

/**
 * Card displaying company information linked to a contact
 */
export function ContactCompanyCard({ company, onNavigateToCompany }: ContactCompanyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-foreground">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <span>Société</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company name with link */}
        <div
          className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onNavigateToCompany(company.id)}
        >
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{company.name}</p>
            {company.vat_number && (
              <p className="text-sm text-muted-foreground">TVA: {company.vat_number}</p>
            )}
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Company details */}
        {company.email && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </span>
            <a
              href={`mailto:${company.email}`}
              className="text-sm font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {company.email}
            </a>
          </div>
        )}

        {company.phone && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Téléphone
            </span>
            <a
              href={`tel:${company.phone}`}
              className="text-sm font-medium text-foreground hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {company.phone}
            </a>
          </div>
        )}

        {(company.address_record?.street || company.address_record?.city) && (
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Adresse
            </span>
            <div className="text-sm font-medium text-foreground text-right max-w-[60%]">
              {company.address_record?.street && (
                <p>{company.address_record.street}</p>
              )}
              {(company.address_record?.postal_code || company.address_record?.city) && (
                <p className="text-muted-foreground">
                  {company.address_record?.postal_code && `${company.address_record.postal_code} `}
                  {company.address_record?.city}
                </p>
              )}
              {company.address_record?.country && <p className="text-muted-foreground">{company.address_record.country}</p>}
            </div>
          </div>
        )}

        {/* View company button */}
        <div className="pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onNavigateToCompany(company.id)}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Voir la fiche société
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
