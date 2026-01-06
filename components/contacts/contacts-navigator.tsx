"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { useDataNavigator } from '@/hooks/use-data-navigator'
import { DataTable } from '@/components/ui/data-table/data-table'
import { DataCards } from '@/components/ui/data-table/data-cards'
import { Users, Send, Building2, Search, Filter, LayoutGrid, List, Archive, Mail, RefreshCw, XCircle, UserX } from 'lucide-react'
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
import { cn } from '@/lib/utils'

// ============================================================================
// CONTACTS NAVIGATOR - Composant BEM Unifié
// ============================================================================
// Block:    contacts-section
// Elements: contacts-section__content, __tabs, __tab, __controls, __search,
//           __filter-btn, __view-switcher, __view-btn, __add-btn, __data
// Modifiers: contacts-section__tab--active, __view-btn--active, __filter-btn--active
// ============================================================================

interface ContactsNavigatorProps {
    contacts: ContactData[]
    invitations: InvitationData[]
    companies: CompanyData[]
    /** Number of pending invitations to display in badge (different from total invitations count) */
    pendingInvitationsCount?: number
    loading?: boolean
    onRefresh?: () => void
    // Invitation tab actions (with confirmation modal)
    onResendInvitationModal?: (invitation: InvitationData) => void
    onCancelInvitationModal?: (invitation: InvitationData) => void
    // Contact actions
    onArchiveContact?: (id: string) => void
    // Contact invitation actions (based on invitationStatus)
    onSendContactInvitation?: (contact: ContactData) => void
    onResendContactInvitation?: (contact: ContactData) => void
    onCancelContactInvitation?: (contact: ContactData) => void
    onRevokeContactAccess?: (contact: ContactData) => void
    className?: string
}

export function ContactsNavigator({
    contacts,
    invitations,
    companies,
    pendingInvitationsCount,
    loading = false,
    onRefresh,
    onResendInvitationModal,
    onCancelInvitationModal,
    onArchiveContact,
    onSendContactInvitation,
    onResendContactInvitation,
    onCancelContactInvitation,
    onRevokeContactAccess,
    className
}: ContactsNavigatorProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'contacts' | 'invitations' | 'companies'>('contacts')

    // Get current config and data based on active tab
    const getCurrentConfig = () => {
        switch (activeTab) {
            case 'contacts':
                return {
                    ...contactsTableConfig,
                    actions: [
                        ...(contactsTableConfig.actions || []),
                        // Action "Inviter" - visible si pas d'invitation ou annulée
                        {
                            id: 'invite',
                            label: 'Inviter',
                            icon: Mail,
                            show: (contact: ContactData) => !contact.invitationStatus || contact.invitationStatus === 'cancelled',
                            onClick: (contact: ContactData) => onSendContactInvitation?.(contact)
                        },
                        // Action "Relancer" - visible si pending ou expired
                        {
                            id: 'resend-contact',
                            label: 'Relancer invitation',
                            icon: RefreshCw,
                            show: (contact: ContactData) => contact.invitationStatus === 'pending' || contact.invitationStatus === 'expired',
                            onClick: (contact: ContactData) => onResendContactInvitation?.(contact)
                        },
                        // Action "Annuler invitation" - visible si pending ou expired
                        {
                            id: 'cancel-contact-invite',
                            label: 'Annuler invitation',
                            icon: XCircle,
                            variant: 'destructive' as const,
                            show: (contact: ContactData) => contact.invitationStatus === 'pending' || contact.invitationStatus === 'expired',
                            onClick: (contact: ContactData) => onCancelContactInvitation?.(contact)
                        },
                        // Action "Retirer l'accès" - visible si accepted
                        {
                            id: 'revoke',
                            label: "Retirer l'accès",
                            icon: UserX,
                            variant: 'destructive' as const,
                            show: (contact: ContactData) => contact.invitationStatus === 'accepted',
                            onClick: (contact: ContactData) => onRevokeContactAccess?.(contact)
                        },
                        // Action "Archiver"
                        {
                            id: 'archive',
                            label: 'Archiver',
                            icon: Archive,
                            variant: 'destructive' as const,
                            onClick: (contact: ContactData) => onArchiveContact?.(contact.id)
                        }
                    ]
                }
            case 'invitations':
                return {
                    ...invitationsTableConfig,
                    actions: invitationsTableConfig.actions?.map(action => {
                        if (action.id === 'resend') {
                            return { ...action, onClick: (invitation: InvitationData) => onResendInvitationModal?.(invitation) }
                        }
                        if (action.id === 'cancel') {
                            return { ...action, onClick: (invitation: InvitationData) => onCancelInvitationModal?.(invitation) }
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

    // Use shared hook for search, view mode, and filtering
    const {
        searchTerm,
        setSearchTerm,
        activeFilters,
        handleFilterChange,
        resetFilters,
        activeFilterCount,
        viewMode,
        setViewMode,
        mounted,
        filteredData,
        createRowClickHandler
    } = useDataNavigator({
        data: currentData,
        searchableFields: currentConfig.searchConfig.searchableFields as string[],
        defaultView: 'cards'
    })

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
                    onRowClick={createRowClickHandler(config.rowHref)}
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
        resetFilters() // Reset search and filters when switching tabs
    }

    // ========================================
    // BEM Classes
    // ========================================
    const blockClass = cn(
        "contacts-section",
        "flex-1 min-h-0 flex flex-col overflow-hidden",
        "border border-slate-200 rounded-lg shadow-sm bg-white",
        className
    )

    const contentClass = cn(
        "contacts-section__content",
        "p-4 space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden"
    )

    const headerClass = cn(
        "contacts-section__header",
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    )

    const tabsContainerClass = cn(
        "contacts-section__tabs",
        "flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1"
    )

    const getTabClass = (isActive: boolean) => cn(
        "contacts-section__tab",
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
        isActive
            ? "contacts-section__tab--active bg-white text-blue-600 shadow-sm"
            : "text-slate-600 hover:bg-slate-200/60"
    )

    const getTabIconClass = (isActive: boolean) => cn(
        "contacts-section__tab-icon",
        "h-4 w-4 mr-2",
        isActive ? "text-blue-600" : "text-slate-600"
    )

    const getTabBadgeClass = (isActive: boolean) => cn(
        "contacts-section__tab-badge",
        "ml-2 text-xs px-2 py-0.5 rounded",
        isActive ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
    )

    const controlsClass = cn(
        "contacts-section__controls",
        "flex items-center gap-2 flex-1"
    )

    const getFilterBtnClass = (hasFilters: boolean) => cn(
        "contacts-section__filter-btn",
        "h-10 w-10 p-0 border-slate-200 flex-shrink-0 relative",
        hasFilters
            ? "contacts-section__filter-btn--active text-blue-600 border-blue-200 bg-blue-50"
            : "text-slate-600 hover:text-slate-900"
    )

    const searchClass = cn(
        "contacts-section__search",
        "relative flex-1"
    )

    const viewSwitcherClass = cn(
        "contacts-section__view-switcher",
        "flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1"
    )

    const getViewBtnClass = (isActive: boolean) => cn(
        "contacts-section__view-btn",
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
        isActive
            ? "contacts-section__view-btn--active bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:bg-slate-200/60"
    )

    const dataClass = cn(
        "contacts-section__data",
        "flex-1 mt-4 overflow-y-auto"
    )

    // ========================================
    // Render
    // ========================================
    return (
        <div className={blockClass}>
            <div className={contentClass}>
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
                    {/* Header with tabs and search */}
                    <div className={headerClass}>
                        {/* Tabs */}
                        <div className="flex-shrink-0">
                            <div className={tabsContainerClass}>
                                <button
                                    onClick={() => handleTabChange('contacts')}
                                    className={getTabClass(activeTab === 'contacts')}
                                >
                                    <Users className={getTabIconClass(activeTab === 'contacts')} />
                                    Contacts
                                    <span className={getTabBadgeClass(activeTab === 'contacts')}>
                                        {contacts.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('invitations')}
                                    className={getTabClass(activeTab === 'invitations')}
                                >
                                    <Send className={getTabIconClass(activeTab === 'invitations')} />
                                    Invitations
                                    <span className={getTabBadgeClass(activeTab === 'invitations')}>
                                        {pendingInvitationsCount ?? invitations.filter(i => i.status === 'pending').length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('companies')}
                                    className={getTabClass(activeTab === 'companies')}
                                >
                                    <Building2 className={getTabIconClass(activeTab === 'companies')} />
                                    Sociétés
                                    <span className={getTabBadgeClass(activeTab === 'companies')}>
                                        {companies.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Search, Filter and View Toggle */}
                        <div className={controlsClass}>
                            {/* Filter Icon */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={getFilterBtnClass(activeFilterCount > 0)}
                                        title="Filtres"
                                    >
                                        <Filter className="h-4 w-4" />
                                        {activeFilterCount > 0 && (
                                            <span className="contacts-section__filter-indicator absolute -top-1 -right-1 h-3 w-3 bg-blue-600 rounded-full border-2 border-white" />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[480px] p-4"
                                    align="end"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 id="filters-heading" className="font-medium leading-none">Filtres</h4>
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
                                            <div
                                                className="flex flex-col sm:flex-row gap-3 sm:gap-4"
                                                role="group"
                                                aria-labelledby="filters-heading"
                                            >
                                                {currentConfig.filters.map((filter) => (
                                                    <div key={filter.id} className="space-y-1.5 flex-1">
                                                        <Label
                                                            htmlFor={`filter-${filter.id}`}
                                                            className="text-sm font-medium text-slate-600"
                                                        >
                                                            {filter.label}
                                                        </Label>
                                                        <Select
                                                            value={activeFilters[filter.id] || filter.defaultValue || 'all'}
                                                            onValueChange={(value) => handleFilterChange(filter.id, value)}
                                                        >
                                                            <SelectTrigger
                                                                id={`filter-${filter.id}`}
                                                                className="h-10 w-full"
                                                                aria-label={`Filtrer par ${filter.label}`}
                                                            >
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
                            <div className={searchClass}>
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
                            )}
                        </div>
                    </div>

                    {/* Tab Contents */}
                    <TabsContent value="contacts" className={dataClass}>
                        {renderContent(filteredData as any, currentConfig)}
                    </TabsContent>

                    <TabsContent value="invitations" className={dataClass}>
                        {renderContent(filteredData as any, currentConfig)}
                    </TabsContent>

                    <TabsContent value="companies" className={dataClass}>
                        {renderContent(filteredData as any, currentConfig)}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
