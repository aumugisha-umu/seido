"use client"

/**
 * InterventionContactsNavigator - Navigator pour les contacts d'une intervention
 *
 * Affiche les contacts (gestionnaires, prestataires, locataires) avec:
 * - Vue grille / liste
 * - Recherche
 * - Onglet Sociétés (si des contacts ont une société liée)
 *
 * Basé sur ContactsNavigator mais adapté au contexte intervention.
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Building2, Search, LayoutGrid, List } from 'lucide-react'
import { ContactCardCompact } from '@/components/contacts/contact-card-compact'
import { CompanyCardCompact } from '@/components/contacts/company-card-compact'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']
type Company = Database['public']['Tables']['companies']['Row']

interface Assignment {
  id: string
  role: string
  user?: User & {
    company?: Company | null
  }
}

interface InterventionContactsNavigatorProps {
  assignments: Assignment[]
  className?: string
}

interface ContactDisplay {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  role?: string
  provider_category?: string
  speciality?: string
  is_company?: boolean
  company_id?: string | null
  company?: {
    id: string
    name: string
  } | null
}

interface CompanyDisplay {
  id: string
  name: string
  vat_number?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
  address?: string | null
}

export function InterventionContactsNavigator({
  assignments,
  className
}: InterventionContactsNavigatorProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'contacts' | 'companies'>('contacts')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')

  // Transform assignments to contact display format
  const contacts: ContactDisplay[] = useMemo(() => {
    return assignments
      .filter(a => a.user)
      .map(a => {
        const user = a.user!
        const fullAddress = [user.address, user.postal_code, user.city]
          .filter(Boolean)
          .join(', ')

        return {
          id: user.id,
          name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sans nom',
          email: user.email || '',
          phone: user.phone || undefined,
          address: fullAddress || undefined,
          role: a.role, // gestionnaire, prestataire, locataire
          provider_category: user.provider_category || undefined,
          speciality: user.speciality || undefined,
          is_company: user.is_company || false,
          company_id: user.company_id || null,
          company: user.company ? {
            id: user.company.id,
            name: user.company.name
          } : null
        }
      })
  }, [assignments])

  // Extract unique companies from contacts
  const companies: CompanyDisplay[] = useMemo(() => {
    const companyMap = new Map<string, CompanyDisplay>()

    contacts.forEach(contact => {
      if (contact.company_id && contact.company) {
        // Get company data from assignment user if available
        const assignment = assignments.find(a => a.user?.id === contact.id)
        const companyData = assignment?.user?.company

        if (companyData && !companyMap.has(companyData.id)) {
          companyMap.set(companyData.id, {
            id: companyData.id,
            name: companyData.name,
            vat_number: companyData.vat_number,
            email: companyData.email,
            phone: companyData.phone,
            city: companyData.city,
            address: [companyData.street, companyData.street_number, companyData.postal_code, companyData.city]
              .filter(Boolean)
              .join(', ') || null
          })
        }
      }
    })

    return Array.from(companyMap.values())
  }, [contacts, assignments])

  // Filter contacts by search term
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts

    const term = searchTerm.toLowerCase()
    return contacts.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.company?.name?.toLowerCase().includes(term)
    )
  }, [contacts, searchTerm])

  // Filter companies by search term
  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies

    const term = searchTerm.toLowerCase()
    return companies.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.city?.toLowerCase().includes(term)
    )
  }, [companies, searchTerm])

  const hasCompanies = companies.length > 0

  // BEM Classes - Sans border/shadow car utilisé dans ContentWrapper
  const blockClass = cn(
    "intervention-contacts-navigator",
    "flex-1 min-h-0 flex flex-col overflow-hidden",
    className
  )

  const contentClass = cn(
    "intervention-contacts-navigator__content",
    "space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden"
  )

  const headerClass = cn(
    "intervention-contacts-navigator__header",
    "flex flex-col sm:flex-row sm:items-center justify-between gap-4"
  )

  const tabsContainerClass = cn(
    "intervention-contacts-navigator__tabs",
    "flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1"
  )

  const getTabClass = (isActive: boolean) => cn(
    "intervention-contacts-navigator__tab",
    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
    isActive
      ? "bg-white text-blue-600 shadow-sm"
      : "text-slate-600 hover:bg-slate-200/60"
  )

  const getTabIconClass = (isActive: boolean) => cn(
    "h-4 w-4 mr-2",
    isActive ? "text-blue-600" : "text-slate-600"
  )

  const getTabBadgeClass = (isActive: boolean) => cn(
    "ml-2 text-xs px-2 py-0.5 rounded",
    isActive ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
  )

  const controlsClass = cn(
    "intervention-contacts-navigator__controls",
    "flex items-center gap-2 flex-1"
  )

  const searchClass = cn(
    "intervention-contacts-navigator__search",
    "relative flex-1"
  )

  const viewSwitcherClass = cn(
    "intervention-contacts-navigator__view-switcher",
    "flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1"
  )

  const getViewBtnClass = (isActive: boolean) => cn(
    "intervention-contacts-navigator__view-btn",
    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
    isActive
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-600 hover:bg-slate-200/60"
  )

  const dataClass = cn(
    "intervention-contacts-navigator__data",
    "flex-1 mt-4 overflow-y-auto"
  )

  const gridClass = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"

  // Render contacts grid
  const renderContactsGrid = () => {
    if (filteredContacts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 text-slate-300" />
          <p className="text-sm">Aucun contact trouvé</p>
        </div>
      )
    }

    return (
      <div className={gridClass}>
        {filteredContacts.map(contact => (
          <ContactCardCompact
            key={contact.id}
            contact={contact}
            onClick={() => router.push(`/gestionnaire/contacts/details/${contact.id}`)}
          />
        ))}
      </div>
    )
  }

  // Render companies grid
  const renderCompaniesGrid = () => {
    if (filteredCompanies.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mb-3 text-slate-300" />
          <p className="text-sm">Aucune société trouvée</p>
        </div>
      )
    }

    return (
      <div className={gridClass}>
        {filteredCompanies.map(company => (
          <CompanyCardCompact
            key={company.id}
            company={company}
            onClick={() => router.push(`/gestionnaire/contacts/societes/${company.id}`)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={blockClass}>
      <div className={contentClass}>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'contacts' | 'companies')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Header with tabs and search */}
          <div className={headerClass}>
            {/* Tabs */}
            <div className="flex-shrink-0">
              <div className={tabsContainerClass}>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={getTabClass(activeTab === 'contacts')}
                >
                  <Users className={getTabIconClass(activeTab === 'contacts')} />
                  Contacts
                  <span className={getTabBadgeClass(activeTab === 'contacts')}>
                    {contacts.length}
                  </span>
                </button>
                {hasCompanies && (
                  <button
                    onClick={() => setActiveTab('companies')}
                    className={getTabClass(activeTab === 'companies')}
                  >
                    <Building2 className={getTabIconClass(activeTab === 'companies')} />
                    Sociétés
                    <span className={getTabBadgeClass(activeTab === 'companies')}>
                      {companies.length}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Search and View Toggle */}
            <div className={controlsClass}>
              {/* Search */}
              <div className={searchClass}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, email, société..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              {/* View Mode Toggle */}
              <div className={viewSwitcherClass}>
                <button
                  onClick={() => setViewMode('list')}
                  className={getViewBtnClass(viewMode === 'list')}
                  title="Vue liste"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={getViewBtnClass(viewMode === 'cards')}
                  title="Vue cartes"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Contents */}
          <TabsContent value="contacts" className={dataClass}>
            {renderContactsGrid()}
          </TabsContent>

          {hasCompanies && (
            <TabsContent value="companies" className={dataClass}>
              {renderCompaniesGrid()}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
