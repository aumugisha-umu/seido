'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
    Building2,
    Home,
    FileText,
    User,
    Briefcase,
    Wrench,
    Search,
    X,
    Loader2
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

// Icons mapping
const ENTITY_ICONS: Record<EmailLinkEntityType, React.ReactNode> = {
    building: <Building2 className="h-4 w-4" />,
    lot: <Home className="h-4 w-4" />,
    contract: <FileText className="h-4 w-4" />,
    contact: <User className="h-4 w-4" />,
    company: <Briefcase className="h-4 w-4" />,
    intervention: <Wrench className="h-4 w-4" />
}

export function LinkToEntityDialog({
    open,
    onOpenChange,
    emailId,
    teamId,
    currentLinks,
    onLinksUpdated
}: LinkToEntityDialogProps) {
    // Debug: Log props on every render
    console.log('🔍 [LINK-DIALOG] Component rendered with teamId:', teamId, 'open:', open)

    const [activeTab, setActiveTab] = useState<EmailLinkEntityType>('building')
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<EntitySearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [pendingLinks, setPendingLinks] = useState<Array<{ type: EmailLinkEntityType; id: string; name: string }>>([])
    const [pendingUnlinks, setPendingUnlinks] = useState<string[]>([]) // Link IDs to remove
    const [isSaving, setIsSaving] = useState(false)

    // Initialize pending state from current links
    useEffect(() => {
        if (open) {
            console.log('🔍 [LINK-DIALOG] Dialog opened, teamId:', teamId)
            setPendingLinks([])
            setPendingUnlinks([])
            setSearchQuery('')
            setSearchResults([])
        }
    }, [open, teamId])

    // Fetch entities (either search or initial load)
    const fetchEntities = useCallback(async (type: EmailLinkEntityType, query: string = '') => {
        console.log('🔍 [LINK-DIALOG] fetchEntities called:', { type, query, teamId })
        setIsSearching(true)
        try {
            // Build URL based on entity type
            const endpoint = getSearchEndpoint(type, teamId)
            console.log('🔍 [LINK-DIALOG] endpoint resolved:', endpoint)

            // Skip if endpoint not available (e.g., missing teamId for contacts)
            if (!endpoint) {
                console.warn('🔍 [LINK-DIALOG] No endpoint - teamId missing?', { type, teamId })
                setSearchResults([])
                setIsSearching(false)
                return
            }

            const searchParam = query.length >= 2 ? `search=${encodeURIComponent(query)}&` : ''
            const response = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}${searchParam}limit=20`)

            if (!response.ok) {
                // Handle 404 gracefully - endpoint doesn't exist
                if (response.status === 404) {
                    console.warn(`Endpoint not found: ${endpoint}`)
                    setSearchResults([])
                    return
                }
                throw new Error('Erreur de chargement')
            }

            const data = await response.json()

            // Check if API returned success: false
            if (data.success === false) {
                console.warn(`API error for ${type}:`, data.error)
                setSearchResults([])
                return
            }

            const entities = extractEntities(type, data)

            // Mark entities that are already linked
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
            // Show empty results instead of error toast for graceful degradation
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

    // Debounced search when query changes
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEntities(activeTab, searchQuery)
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery, activeTab, fetchEntities])

    // Load entities when tab changes
    useEffect(() => {
        setSearchQuery('')
        if (open) {
            fetchEntities(activeTab)
        }
    }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

    // Handle selecting an entity to link
    const handleToggleEntity = (entity: EntitySearchResult) => {
        if (entity.isLinked) {
            // Check if it's in currentLinks (existing) or pendingLinks (new)
            const existingLink = currentLinks.find(
                l => l.entity_type === entity.type && l.entity_id === entity.id
            )

            if (existingLink) {
                // Add to pending unlinks
                if (pendingUnlinks.includes(existingLink.id)) {
                    setPendingUnlinks(prev => prev.filter(id => id !== existingLink.id))
                } else {
                    setPendingUnlinks(prev => [...prev, existingLink.id])
                }
            } else {
                // Remove from pending links
                setPendingLinks(prev => prev.filter(
                    l => !(l.type === entity.type && l.id === entity.id)
                ))
            }
        } else {
            // Add to pending links - prevent duplicates
            setPendingLinks(prev => {
                const alreadyPending = prev.some(l => l.type === entity.type && l.id === entity.id)
                if (alreadyPending) return prev
                return [...prev, {
                    type: entity.type,
                    id: entity.id,
                    name: entity.name
                }]
            })
        }

        // Update search results to reflect the change
        setSearchResults(prev => prev.map(r =>
            r.id === entity.id ? { ...r, isLinked: !r.isLinked } : r
        ))
    }

    // Remove a pending link
    const handleRemovePendingLink = (type: EmailLinkEntityType, id: string) => {
        setPendingLinks(prev => prev.filter(l => !(l.type === type && l.id === id)))
    }

    // Cancel pending unlink
    const handleCancelUnlink = (linkId: string) => {
        setPendingUnlinks(prev => prev.filter(id => id !== linkId))
    }

    // Save all changes
    const handleSave = async () => {
        setIsSaving(true)
        try {
            // Process unlinks
            for (const linkId of pendingUnlinks) {
                const response = await fetch(`/api/emails/${emailId}/links?linkId=${linkId}`, {
                    method: 'DELETE'
                })
                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Erreur lors de la suppression du lien')
                }
            }

            // Process new links
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

    // Get effective links (current - pending unlinks + pending links)
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Lier cet email</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EmailLinkEntityType)} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid grid-cols-6 flex-shrink-0">
                        {(Object.keys(EMAIL_LINK_DISPLAY_CONFIG) as EmailLinkEntityType[]).map(type => (
                            <TabsTrigger
                                key={type}
                                value={type}
                                className="flex items-center gap-1 text-xs px-2"
                            >
                                {ENTITY_ICONS[type]}
                                <span className="hidden sm:inline">{EMAIL_LINK_DISPLAY_CONFIG[type].label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="flex-1 flex flex-col min-h-0 mt-4">
                        {/* Search Input */}
                        <div className="relative flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`Rechercher ${EMAIL_LINK_DISPLAY_CONFIG[activeTab].labelPlural.toLowerCase()}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Search Results - Native CSS scroll */}
                        <div className="max-h-[min(300px,40vh)] overflow-y-auto mt-4 border rounded-md">
                            <div className="p-2">
                                {isSearching ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        {searchQuery.length >= 2
                                            ? 'Aucun résultat trouvé'
                                            : `Aucun ${EMAIL_LINK_DISPLAY_CONFIG[activeTab].label.toLowerCase()} disponible`
                                        }
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {searchResults.map(entity => (
                                            <div
                                                key={entity.id}
                                                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                                                onClick={() => handleToggleEntity(entity)}
                                            >
                                                <Checkbox
                                                    checked={entity.isLinked}
                                                    onCheckedChange={() => handleToggleEntity(entity)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{entity.name}</p>
                                                    {entity.subtitle && (
                                                        <p className="text-sm text-muted-foreground truncate">
                                                            {entity.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                                {entity.isLinked && (
                                                    <Badge variant="secondary" className="flex-shrink-0">
                                                        Lié
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Current Links Section */}
                        {effectiveLinks.length > 0 && (
                            <div className="mt-4 flex-shrink-0">
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                    Liaisons ({effectiveLinks.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {effectiveLinks.map(link => {
                                        const config = EMAIL_LINK_DISPLAY_CONFIG[link.entity_type]
                                        const isPending = link.id.startsWith('pending-')
                                        const isMarkedForRemoval = pendingUnlinks.includes(link.id)

                                        return (
                                            <Badge
                                                key={link.id}
                                                variant="outline"
                                                className={`
                                                    ${config.color}
                                                    ${isMarkedForRemoval ? 'opacity-50 line-through' : ''}
                                                    ${isPending ? 'border-dashed' : ''}
                                                `}
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
                            </div>
                        )}
                    </div>
                </Tabs>

                <DialogFooter className="flex-shrink-0">
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
                            'Enregistrer'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
            // Requires teamId for team-contacts endpoint
            if (!teamId) return null
            return `/api/team-contacts?teamId=${teamId}`
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
    // Handle different API response formats
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
                // team-contacts returns name directly, not first_name/last_name
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
