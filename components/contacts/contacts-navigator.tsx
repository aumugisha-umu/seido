"use client"

import { useState, useMemo } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    contactsTableConfig,
    invitationsTableConfig,
    companiesTableConfig,
    type ContactData,
    type InvitationData,
    type CompanyData
} from '@/config/table-configs/contacts.config'
import { useViewMode } from '@/hooks/use-view-mode'
import { DataTable } from '@/components/ui/data-table/data-table'
import { DataCards } from '@/components/ui/data-table/data-cards'
import { Users, Send, Building2, Search, Filter, LayoutGrid, List, UserPlus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface ContactsNavigatorProps {
    contacts: ContactData[]
    invitations: InvitationData[]
    companies: CompanyData[]
    loading?: boolean
    onRefresh?: () => void
    onResendInvitation?: (id: string) => void
    onCancelInvitation?: (id: string) => void
    onDeleteContact?: (id: string) => void
}

export function ContactsNavigator({
    contacts,
    invitations,
    companies,
    loading = false,
    onRefresh,
    onResendInvitation,
    onCancelInvitation,
    onDeleteContact
}: ContactsNavigatorProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'contacts' | 'invitations' | 'companies'>('contacts')
    const [searchTerm, setSearchTerm] = useState('')
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

    // View mode state
    const { viewMode, setViewMode, mounted } = useViewMode({
        defaultMode: 'cards',
        syncWithUrl: false
    })

    // Get current config and data based on active tab
    const getCurrentConfig = () => {
        switch (activeTab) {
            case 'contacts':
                return {
                    ...contactsTableConfig,
                    actions: [
                        ...(contactsTableConfig.actions || []),
                        {
                            id: 'delete',
                            label: 'Supprimer',
                            icon: Trash2,
                            variant: 'destructive' as const,
                            onClick: (contact: ContactData) => onDeleteContact?.(contact.id)
                        }
                    ]
                }
            case 'invitations':
                return {
                    ...invitationsTableConfig,
                    actions: invitationsTableConfig.actions?.map(action => {
                        if (action.id === 'resend') {
                            return { ...action, onClick: (invitation: InvitationData) => onResendInvitation?.(invitation.id) }
                        }
                        if (action.id === 'cancel') {
                            return { ...action, onClick: (invitation: InvitationData) => onCancelInvitation?.(invitation.id) }
                        }
                        return action
                    })
                }
            case 'companies': return companiesTableConfig
        }
    }

    const getCurrentData = () => {
        switch (activeTab) {
            case 'contacts': return contacts
            case 'invitations': return invitations
            case 'companies': return companies
        }
    }

    const currentConfig = getCurrentConfig()
    const currentData = getCurrentData()

    // Apply search filter
    const getNestedValue = (obj: any, path: string): any => {
        return path.split('.').reduce((current: any, key: string) => current?.[key], obj)
    }

    const filteredData = useMemo(() => {
        let data = currentData

        // Apply search
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase()
            data = data.filter((item: any) => {
                return currentConfig.searchConfig.searchableFields.some(field => {
                    const value = getNestedValue(item, field as string)
                    return value?.toString().toLowerCase().includes(searchLower)
                })
            })
        }

        // Apply filters
        if (currentConfig.filters) {
            Object.entries(activeFilters).forEach(([filterId, filterValue]) => {
                if (filterValue && filterValue !== 'all') {
                    data = data.filter((item: any) => {
                        const value = getNestedValue(item, filterId)
                        return value === filterValue
                    })
                }
            })
        }

        return data
    }, [currentData, searchTerm, currentConfig, activeFilters])

    // Count active filters
    const activeFilterCount = Object.values(activeFilters).filter(v => v && v !== 'all').length

    // Handle filter change
    const handleFilterChange = (filterId: string, value: string) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterId]: value
        }))
    }

    // Reset filters
    const resetFilters = () => {
        setActiveFilters({})
    }

    // Render content based on view mode
    const renderContent = (data: any[], config: any) => {
        if (!mounted) {
            return (
                <div className="animate-pulse space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-200 rounded-lg" />
                    ))}
                </div>
            )
        }

        const emptyConfig = config.emptyState || {
            title: 'Aucune donnée',
            description: 'Aucun élément à afficher'
        }

        if (viewMode === 'list') {
            return (
                <DataTable
                    data={data}
                    columns={config.columns}
                    actions={config.actions}
                    loading={loading}
                    emptyMessage={emptyConfig.description}
                />
            )
        }

        return (
            <DataCards
                data={data}
                CardComponent={config.views.card.component}
                actions={config.actions}
                loading={loading}
                emptyMessage={emptyConfig.description}
                compact={config.views.card.compact}
            />
        )
    }

    // Handle tab change
    const handleTabChange = (value: string) => {
        setActiveTab(value as 'contacts' | 'invitations' | 'companies')
        setSearchTerm('') // Reset search when switching tabs
        setActiveFilters({}) // Reset filters when switching tabs
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden border border-slate-200 rounded-lg shadow-sm bg-white">
            <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
                    {/* Header with tabs and search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Tabs */}
                        <div className="flex-shrink-0">
                            <div className="inline-flex h-10 bg-slate-100 rounded-md p-1">
                                <button
                                    onClick={() => handleTabChange('contacts')}
                                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${activeTab === 'contacts'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200/60'
                                        }`}
                                >
                                    <Users className={`h-4 w-4 mr-2 ${activeTab === 'contacts' ? 'text-blue-600' : 'text-slate-600'}`} />
                                    Contacts
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${activeTab === 'contacts'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {contacts.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('invitations')}
                                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${activeTab === 'invitations'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200/60'
                                        }`}
                                >
                                    <Send className={`h-4 w-4 mr-2 ${activeTab === 'invitations' ? 'text-blue-600' : 'text-slate-600'}`} />
                                    Invitations
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${activeTab === 'invitations'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {invitations.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('companies')}
                                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${activeTab === 'companies'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200/60'
                                        }`}
                                >
                                    <Building2 className={`h-4 w-4 mr-2 ${activeTab === 'companies' ? 'text-blue-600' : 'text-slate-600'}`} />
                                    Sociétés
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${activeTab === 'companies'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {companies.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Search, Filter and View Toggle */}
                        <div className="flex items-center gap-2 flex-1">
                            {/* Filter Icon */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-10 w-10 p-0 border-slate-200 flex-shrink-0 relative ${activeFilterCount > 0 ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-slate-600 hover:text-slate-900'}`}
                                        title="Filtres"
                                    >
                                        <Filter className="h-4 w-4" />
                                        {activeFilterCount > 0 && (
                                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-600 rounded-full border-2 border-white" />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4" align="end">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium leading-none">Filtres</h4>
                                            {activeFilterCount > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto p-0 text-xs text-slate-500 hover:text-slate-900"
                                                    onClick={resetFilters}
                                                >
                                                    Réinitialiser
                                                </Button>
                                            )}
                                        </div>

                                        {currentConfig.filters && currentConfig.filters.length > 0 ? (
                                            <div className="space-y-3">
                                                {currentConfig.filters.map((filter) => (
                                                    <div key={filter.id} className="space-y-1.5">
                                                        <Label className="text-xs text-slate-500">{filter.label}</Label>
                                                        <Select
                                                            value={activeFilters[filter.id] || filter.defaultValue || 'all'}
                                                            onValueChange={(value) => handleFilterChange(filter.id, value)}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue placeholder="Sélectionner..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {filter.options.map((option) => (
                                                                    <SelectItem key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-500 py-2 text-center">
                                                Aucun filtre disponible pour cette vue.
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Search - Takes all available space */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder={currentConfig.searchConfig.placeholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-10"
                                />
                            </div>

                            {/* View Mode Toggle (Cards/List only) */}
                            {mounted && (
                                <div className="flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1">
                                    <button
                                        onClick={() => setViewMode('cards')}
                                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${viewMode === 'cards'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-200/60'
                                            }`}
                                        title="Vue cartes"
                                    >
                                        <LayoutGrid className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${viewMode === 'list'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-200/60'
                                            }`}
                                        title="Vue liste"
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {/* Add Button */}
                            <Button
                                onClick={() => router.push('/gestionnaire/contacts/nouveau')}
                                className="ml-2"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Ajouter
                            </Button>
                        </div>
                    </div>

                    {/* Tab Contents */}
                    <TabsContent value="contacts" className="flex-1 mt-4 overflow-y-auto">
                        {renderContent(filteredData as any, currentConfig)}
                    </TabsContent>

                    <TabsContent value="invitations" className="flex-1 mt-4 overflow-y-auto">
                        {renderContent(filteredData as any, currentConfig)}
                    </TabsContent>

                    <TabsContent value="companies" className="flex-1 mt-4 overflow-y-auto">
                        {renderContent(filteredData as any, currentConfig)}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
