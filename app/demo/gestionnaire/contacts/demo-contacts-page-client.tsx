/**
 * Demo Contacts Page Client - Matching Production Layout
 *
 * ✅ Matches production ContactsPageClient visual design
 * ✅ Uses demo data from LokiJS store
 * ✅ Adds impersonation feature (demo-specific)
 *
 * Note: This is a simplified version that matches the production layout
 * while preserving the demo impersonation functionality.
 */

'use client'

import { useState, useMemo } from 'react'
import { useDemoContext } from '@/lib/demo/demo-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Filter, UserCircle2, LogIn, MoreVertical, Mail, Phone, MapPin } from 'lucide-react'

interface DemoContact {
  id: string
  first_name: string
  last_name: string
  name: string
  email: string
  phone?: string
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  company_name?: string
  address?: string
  city?: string
  postal_code?: string
  auth_user_id?: string
}

export function DemoContactsPageClient() {
  const { store, setImpersonatedUser, currentRole, impersonatedUsers } = useDemoContext()

  // Fetch all users from demo store
  const allUsers = store.query('users') as DemoContact[]

  // State for filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [currentTab, setCurrentTab] = useState('contacts')

  // Filter contacts based on search and role
  const filteredContacts = useMemo(() => {
    return allUsers.filter((contact) => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.company_name && contact.company_name.toLowerCase().includes(searchTerm.toLowerCase()))

      // Role filter
      const matchesRole = roleFilter === 'all' || contact.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [allUsers, searchTerm, roleFilter])

  // Separate by type
  const contacts = filteredContacts
  const invitations = allUsers.filter(u => !u.auth_user_id) // Users without auth are "invitations"
  const companies = useMemo(() => {
    return store.query('companies')
  }, [store])

  const handleImpersonate = (userId: string, userRole: string) => {
    setImpersonatedUser(userRole as any, userId)
    // Show feedback
    console.log(`Impersonating user ${userId} as ${userRole}`)
  }

  const isCurrentlyImpersonated = (userId: string) => {
    return Object.values(impersonatedUsers).includes(userId)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 content-max-width mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="font-semibold text-gray-900 text-xl sm:text-2xl leading-tight">
                Contacts
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gérez vos contacts ({filteredContacts.length})
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 content-max-width mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="gestionnaire">Gestionnaires</SelectItem>
                <SelectItem value="locataire">Locataires</SelectItem>
                <SelectItem value="prestataire">Prestataires</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 content-max-width min-h-0 overflow-hidden flex flex-col">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full sm:w-auto mb-4">
              <TabsTrigger value="contacts">
                Contacts ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="invitations">
                Invitations ({invitations.length})
              </TabsTrigger>
              <TabsTrigger value="companies">
                Entreprises ({companies.length})
              </TabsTrigger>
            </TabsList>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="flex-1 overflow-auto mt-0">
              {filteredContacts.length === 0 ? (
                <Card className="p-8">
                  <div className="text-center text-gray-500">
                    Aucun contact trouvé
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredContacts.map((contact) => (
                    <Card key={contact.id} className={`p-4 relative ${isCurrentlyImpersonated(contact.id) ? 'ring-2 ring-orange-500' : ''}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserCircle2 className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{contact.name}</h3>
                            <p className="text-xs text-gray-500 capitalize">{contact.role}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleImpersonate(contact.id, contact.role)}>
                              <LogIn className="h-4 w-4 mr-2" />
                              Se connecter en tant que
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2 text-xs">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {contact.company_name && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <UserCircle2 className="h-3.5 w-3.5" />
                            <span>{contact.company_name}</span>
                          </div>
                        )}
                        {contact.city && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{contact.city}</span>
                          </div>
                        )}
                      </div>

                      {isCurrentlyImpersonated(contact.id) && (
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <span className="text-xs font-medium text-orange-600">
                            👤 Impersonné actuellement
                          </span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Invitations Tab */}
            <TabsContent value="invitations" className="flex-1 overflow-auto mt-0">
              <Card className="p-8">
                <div className="text-center text-gray-500">
                  {invitations.length} invitation(s) en attente
                </div>
              </Card>
            </TabsContent>

            {/* Companies Tab */}
            <TabsContent value="companies" className="flex-1 overflow-auto mt-0">
              <Card className="p-8">
                <div className="text-center text-gray-500">
                  {companies.length} entreprise(s) enregistrée(s)
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
