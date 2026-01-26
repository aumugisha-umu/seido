'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import type { ContactWithCompany, RoleConfig, CategoryOption } from './types'

interface ContactInfoCardProps {
  contact: ContactWithCompany
  getRoleConfig: (role: string) => RoleConfig
  getProviderCategoryLabel: (category: string) => string
  getSpecialityLabel: (speciality: string) => string
}

/**
 * Card displaying personal information for a contact
 */
export function ContactInfoCard({
  contact,
  getRoleConfig,
  getProviderCategoryLabel,
  getSpecialityLabel
}: ContactInfoCardProps) {
  const roleConfig = getRoleConfig(contact.role)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-foreground">
          <User className="h-5 w-5 text-muted-foreground" />
          <span>Informations Personnelles</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground text-sm">Nom complet</span>
          <span className="font-medium text-foreground">{contact.name}</span>
        </div>

        {contact.first_name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Prénom</span>
            <span className="font-medium text-foreground">{contact.first_name}</span>
          </div>
        )}

        {contact.last_name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Nom de famille</span>
            <span className="font-medium text-foreground">{contact.last_name}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground text-sm">Email</span>
          <span className="font-medium text-foreground text-sm">{contact.email}</span>
        </div>

        {contact.phone && (
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Téléphone</span>
            <span className="font-medium text-foreground">{contact.phone}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground text-sm">Rôle</span>
          <Badge variant="secondary" className={roleConfig.color}>
            {roleConfig.label}
          </Badge>
        </div>

        {contact.provider_category && (
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Catégorie</span>
            <Badge variant="outline" className="text-xs bg-muted text-foreground border-border">
              {getProviderCategoryLabel(contact.provider_category)}
            </Badge>
          </div>
        )}

        {contact.speciality && (
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Spécialité</span>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              {getSpecialityLabel(contact.speciality)}
            </Badge>
          </div>
        )}

        {contact.notes && (
          <div className="pt-2 border-t border-border">
            <span className="text-muted-foreground text-sm">Notes</span>
            <p className="text-sm font-medium mt-1 text-foreground">{contact.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
