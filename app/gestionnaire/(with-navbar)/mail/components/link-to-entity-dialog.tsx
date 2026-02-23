'use client'

import { useState, useEffect, useCallback } from 'react'
import { UnifiedModal } from '@/components/ui/unified-modal/unified-modal'
import { UnifiedModalHeader } from '@/components/ui/unified-modal/unified-modal-header'
import { UnifiedModalBody } from '@/components/ui/unified-modal/unified-modal-body'
import { UnifiedModalFooter } from '@/components/ui/unified-modal/unified-modal-footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
    Building2,
    Home,
    FileText,
    User,
    Briefcase,
    Wrench,
    Search,
    X,
    Loader2,
    Link2,
    ChevronDown,
    Check
} from 'lucide-react'
import {
    EmailLinkEntityType,
    EmailLinkWithDetails,
    EMAIL_LINK_DISPLAY_CONFIG,
    EntitySearchResult
} from '@/lib/types/email-links'

interface LinkToEntityDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    emailId: string
    teamId?: string
    currentLinks: EmailLinkWithDetails[]
    onLinksUpdated: () => void
}

// Icons mapping (static JSX for badges)
const ENTITY_ICONS: Record<EmailLinkEntityType, React.ReactNode> = {
    building: <Building2 className="h-3.5 w-3.5" />,
    lot: <Home className="h-3.5 w-3.5" />,
    contract: <FileText className="h-3.5 w-3.5" />,
    contact: <User className="h-3.5 w-3.5" />,
    company: <Briefcase className="h-3.5 w-3.5" />,
    intervention: <Wrench className="h-3.5 w-3.5" />
}

// Icon components for empty state (need className override)
const ENTITY_ICON_COMPONENTS: Record<EmailLinkEntityType, React.ComponentType<{ className?: string }>> = {
    building: Building2,
    lot: Home,
    contract: FileText,
    contact: User,
    company: Briefcase,
    intervention: Wrench
}

// Subtle color config for empty state + chip accents
const ENTITY_COLORS: Record<EmailLinkEntityType, { bg: string; text: string }> = {
    building: { bg: 'bg-blue-50', text: 'text-blue-600' },
    lot: { bg: 'bg-green-50', text: 'text-green-600' },
    contract: { bg: 'bg-purple-50', text: 'text-purple-600' },
    contact: { bg: 'bg-amber-50', text: 'text-amber-600' },
    company: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    intervention: { bg: 'bg-orange-50', text: 'text-orange-600' },
}

const entityTypes = Object.keys(EMAIL_LINK_DISPLAY_CONFIG) as EmailLinkEntityType[]

export function LinkToEntityDialog({
    open,
    onOpenChange,
    emailId,
    teamId,
    currentLinks,
    onLinksUpdated
}: LinkToEntityDialogProps) {
    const [activeTab, setActiveTab] = useState<EmailLinkEntityType>('building')
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<EntitySearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [pendingLinks, setPendingLinks] = useState<Array<{ type: EmailLinkEntityType; id: string; name: string }>>([])
    const [pendingUnlinks, setPendingUnlinks] = useState<string[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [liaisonsExpanded, setLiaisonsExpanded] = useState(false)

    // Initialize pending state when dialog opens
    useEffect(() => {
        if (open) {
            setPendingLinks([])
            setPendingUnlinks([])
            setSearchQuery('')
            setSearchResults([])
            setLiaisonsExpanded(false)
        }
    }, [open, teamId])

    // Fetch entities (either search or initial load)
    const fetchEntities = useCallback(async (type: EmailLinkEntityType, query: string = '') => {
        setIsSearching(true)
        try {
            const endpoint = getSearchEndpoint(type, teamId)

            if (!endpoint) {
                console.warn('[LINK-DIALOG] No endpoint available for type:', type)
                setSearchResults([])
                setIsSearching(false)
                return
            }

            const searchParam = query.length >= 2 ? `search=${encodeURIComponent(query)}&` : ''
            const response = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}${searchParam}limit=20`)

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Endpoint not found: ${endpoint}`)
                    setSearchResults([])
                    return
                }
                throw new Error('Erreur de chargement')
            }

            const data = await response.json()

            if (data.success === false) {
                console.warn(`API error for ${type}:`, data.error)
                setSearchResults([])
                return
            }

            const entities = extractEntities(type, data)

            const linkedIds = new Set([
                ...currentLinks.filter(l => l.entity_type === type).map(l => l.entity_id),
                ...pendingLinks.filter(l => l.type === type).map(l => l.id)
            ])

            const results: EntitySearchResult[] = entities.map(entity => ({
                id: entity.id,
                name: entity.name,
                subtitle: entity.subtitle,
                type,
                isLinked: linkedIds.has(entity.id)
            }))

            setSearchResults(results)
        } catch (error) {
            console.error('Fetch error:', error)
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }, [currentLinks, pendingLinks, teamId])

    // Load initial entities when dialog opens
    useEffect(() => {
        if (open) {
            fetchEntities(activeTab)
        }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEntities(activeTab, searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, activeTab, fetchEntities])

    // Reset search when tab changes
    useEffect(() => {
        setSearchQuery('')
        if (open) {
            fetchEntities(activeTab)
        }
    }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleToggleEntity = (entity: EntitySearchResult) => {
        if (entity.isLinked) {
            const existingLink = currentLinks.find(
                l => l.entity_type === entity.type && l.entity_id === entity.id
            )

            if (existingLink) {
                if (pendingUnlinks.includes(existingLink.id)) {
                    setPendingUnlinks(prev => prev.filter(id => id !== existingLink.id))
                } else {
                    setPendingUnlinks(prev => [...prev, existingLink.id])
                }
            } else {
                setPendingLinks(prev => prev.filter(
                    l => !(l.type === entity.type && l.id === entity.id)
                ))
            }
        } else {
            setPendingLinks(prev => {
                const alreadyPending = prev.some(l => l.type === entity.type && l.id === entity.id)
                if (alreadyPending) return prev
                return [...prev, { type: entity.type, id: entity.id, name: entity.name }]
            })
        }

        setSearchResults(prev => prev.map(r =>
            r.id === entity.id ? { ...r, isLinked: !r.isLinked } : r
        ))
    }

    const handleRemovePendingLink = (type: EmailLinkEntityType, id: string) => {
        setPendingLinks(prev => prev.filter(l => !(l.type === type && l.id === id)))
    }

    const handleCancelUnlink = (linkId: string) => {
        setPendingUnlinks(prev => prev.filter(id => id !== linkId))
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            for (const linkId of pendingUnlinks) {
                const response = await fetch(`/api/emails/${emailId}/links?linkId=${linkId}`, {
                    method: 'DELETE'
                })
                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Erreur lors de la suppression du lien')
                }
            }

            for (const link of pendingLinks) {
                const response = await fetch(`/api/emails/${emailId}/links`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        entity_type: link.type,
                        entity_id: link.id
                    })
                })
                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Erreur lors de la création du lien')
                }
            }

            const totalChanges = pendingLinks.length + pendingUnlinks.length
            toast.success(`${totalChanges} modification${totalChanges > 1 ? 's' : ''} enregistrée${totalChanges > 1 ? 's' : ''}`)
            onLinksUpdated()
            onOpenChange(false)
        } catch (error: any) {
            console.error('Save error:', error)
            toast.error(error.message || 'Erreur lors de l\'enregistrement')
        } finally {
            setIsSaving(false)
        }
    }

    const effectiveLinks = [
        ...currentLinks.filter(l => !pendingUnlinks.includes(l.id)),
        ...pendingLinks.map(l => ({
            id: `pending-${l.id}`,
            email_id: emailId,
            entity_type: l.type,
            entity_id: l.id,
            entity_name: l.name,
            linked_at: new Date().toISOString(),
            linked_by: null,
            notes: null,
            team_id: ''
        }))
    ] as EmailLinkWithDetails[]

    const hasChanges = pendingLinks.length > 0 || pendingUnlinks.length > 0
    const totalChanges = pendingLinks.length + pendingUnlinks.length
    const activeColorConfig = ENTITY_COLORS[activeTab]
    const ActiveIcon = ENTITY_ICON_COMPONENTS[activeTab]

    return (
        <UnifiedModal
            open={open}
            onOpenChange={onOpenChange}
            size="lg"
            preventCloseOnOutsideClick={isSaving}
            preventCloseOnEscape={isSaving}
        >
            <UnifiedModalHeader
                title="Lier cet email"
                icon={<Link2 className="h-5 w-5" />}
                variant="default"
            />

            <UnifiedModalBody noPadding className="flex flex-col min-h-0">
                {/* Filter chips - MD3 style */}
                <div className="flex-shrink-0 px-4 pt-3 pb-2">
                    <div className="flex overflow-x-auto gap-2 scrollbar-hide">
                        {entityTypes.map(type => {
                            const isActive = activeTab === type
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setActiveTab(type)}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all",
                                        "border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                                        isActive
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "bg-transparent text-muted-foreground border-slate-200 hover:bg-slate-50 hover:text-foreground hover:border-slate-300"
                                    )}
                                >
                                    {isActive && <Check className="h-3.5 w-3.5" />}
                                    {ENTITY_ICONS[type]}
                                    <span>{EMAIL_LINK_DISPLAY_CONFIG[type].label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
                    {/* Search Input */}
                    <div className="relative flex-shrink-0 mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`Rechercher ${EMAIL_LINK_DISPLAY_CONFIG[activeTab].labelPlural.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Results list — no wrapping border, flows directly */}
                    <div className="flex-1 max-h-[min(300px,40vh)] overflow-y-auto mt-2 -mx-1">
                        {isSearching ? (
                            /* Skeleton loader */
                            <div className="space-y-1 px-1">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                                        <div className="h-4 w-4 rounded bg-slate-200 flex-shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3.5 w-3/5 rounded bg-slate-200" />
                                            <div className="h-3 w-2/5 rounded bg-slate-100" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : searchResults.length === 0 ? (
                            /* Empty state */
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center mb-3",
                                    activeColorConfig.bg
                                )}>
                                    <ActiveIcon className={cn("h-5 w-5", activeColorConfig.text)} />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {searchQuery.length >= 2
                                        ? 'Aucun résultat trouvé'
                                        : `Aucun ${EMAIL_LINK_DISPLAY_CONFIG[activeTab].label.toLowerCase()} disponible`
                                    }
                                </p>
                            </div>
                        ) : (
                            /* Results */
                            <div className="px-1 space-y-1.5">
                                {searchResults.map(entity => (
                                    <div
                                        key={entity.id}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors border",
                                            entity.isLinked
                                                ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                                                : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                                        )}
                                        onClick={() => handleToggleEntity(entity)}
                                    >
                                        <Checkbox
                                            checked={entity.isLinked}
                                            onCheckedChange={() => handleToggleEntity(entity)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm truncate",
                                                entity.isLinked ? "font-semibold text-foreground" : "font-medium text-foreground"
                                            )}>
                                                {entity.name}
                                            </p>
                                            {entity.subtitle && (
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {entity.subtitle}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Collapsible Liaisons section */}
                    {effectiveLinks.length > 0 && (
                        <div className="flex-shrink-0 mt-2 pt-2 border border-slate-100 rounded-lg bg-white px-3">
                            <button
                                type="button"
                                onClick={() => setLiaisonsExpanded(!liaisonsExpanded)}
                                className="flex items-center justify-between w-full py-1.5 text-left group"
                            >
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Liaisons ({effectiveLinks.length})
                                </span>
                                <div className="flex items-center gap-2">
                                    {hasChanges && (
                                        <span className="text-xs text-primary font-medium">
                                            {pendingLinks.length > 0 && `+${pendingLinks.length}`}
                                            {pendingLinks.length > 0 && pendingUnlinks.length > 0 && ' / '}
                                            {pendingUnlinks.length > 0 && `-${pendingUnlinks.length}`}
                                        </span>
                                    )}
                                    <ChevronDown className={cn(
                                        "h-4 w-4 text-muted-foreground transition-transform",
                                        liaisonsExpanded && "rotate-180"
                                    )} />
                                </div>
                            </button>

                            {liaisonsExpanded && (
                                <div className="flex flex-wrap gap-1.5 pb-1 pt-1">
                                    {effectiveLinks.map(link => {
                                        const config = EMAIL_LINK_DISPLAY_CONFIG[link.entity_type]
                                        const isPending = link.id.startsWith('pending-')
                                        const isMarkedForRemoval = pendingUnlinks.includes(link.id)

                                        return (
                                            <Badge
                                                key={link.id}
                                                variant="outline"
                                                className={cn(
                                                    config.color,
                                                    isMarkedForRemoval && 'opacity-50 line-through',
                                                    isPending && 'border-dashed'
                                                )}
                                            >
                                                {ENTITY_ICONS[link.entity_type]}
                                                <span className="ml-1">{link.entity_name}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (isPending) {
                                                            handleRemovePendingLink(link.entity_type, link.entity_id)
                                                        } else if (isMarkedForRemoval) {
                                                            handleCancelUnlink(link.id)
                                                        } else {
                                                            setPendingUnlinks(prev => [...prev, link.id])
                                                        }
                                                    }}
                                                    className="ml-1 hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </UnifiedModalBody>

            <UnifiedModalFooter align="right">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                    Annuler
                </Button>
                <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enregistrement...
                        </>
                    ) : (
                        hasChanges ? `Enregistrer (${totalChanges})` : 'Enregistrer'
                    )}
                </Button>
            </UnifiedModalFooter>
        </UnifiedModal>
    )
}

// Helper functions

function getSearchEndpoint(type: EmailLinkEntityType, teamId?: string): string | null {
    switch (type) {
        case 'building':
            return '/api/buildings'
        case 'lot':
            return '/api/lots'
        case 'contract':
            return '/api/contracts'
        case 'contact':
            // teamId no longer required - API uses auth context
            return '/api/team-contacts'
        case 'company':
            return '/api/companies'
        case 'intervention':
            return '/api/interventions'
        default:
            return null
    }
}

function extractEntities(
    type: EmailLinkEntityType,
    data: any
): Array<{ id: string; name: string; subtitle?: string }> {
    const items = data.data || data.buildings || data.lots || data.contracts ||
                  data.contacts || data.companies || data.interventions || []

    return items.map((item: any) => {
        switch (type) {
            case 'building':
                return { id: item.id, name: item.name, subtitle: item.address }
            case 'lot':
                return {
                    id: item.id,
                    name: item.name || item.reference || `Lot ${item.apartment_number || item.id.slice(0, 8)}`,
                    subtitle: item.building?.name || item.building_name
                }
            case 'contract':
                return {
                    id: item.id,
                    name: item.title || `Contrat ${item.contract_type || 'N/A'}`,
                    subtitle: item.lot?.reference || item.lot?.building?.name
                }
            case 'contact':
                return {
                    id: item.id,
                    name: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Contact',
                    subtitle: item.email || item.phone || item.role
                }
            case 'company':
                return {
                    id: item.id,
                    name: item.name || 'Société',
                    subtitle: item.vat_number || item.city
                }
            case 'intervention':
                return {
                    id: item.id,
                    name: item.title,
                    subtitle: item.reference || item.reference_number || item.status
                }
            default:
                return { id: item.id, name: item.name || item.title || 'Unknown' }
        }
    })
}
