'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Building2,
  Clock,
  FileText,
  Home,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Search,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

// ─── Types ──────────────────────────────────────────────────────────

interface SearchResult {
  entity_type: string
  entity_id: string
  title: string
  subtitle: string
  url: string
  rank: number
}

interface GroupedResults {
  heading: string
  icon: React.ReactNode
  items: SearchResult[]
}

// ─── Entity config ──────────────────────────────────────────────────

const ENTITY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  intervention: { label: 'Interventions', icon: <Wrench className="h-4 w-4 text-orange-500" /> },
  contact: { label: 'Contacts', icon: <Users className="h-4 w-4 text-blue-500" /> },
  lot: { label: 'Lots', icon: <Home className="h-4 w-4 text-emerald-500" /> },
  building: { label: 'Immeubles', icon: <Building2 className="h-4 w-4 text-violet-500" /> },
  contract: { label: 'Contrats', icon: <FileText className="h-4 w-4 text-amber-500" /> },
  email: { label: 'Emails', icon: <Mail className="h-4 w-4 text-sky-500" /> },
  conversation: { label: 'Conversations', icon: <MessageSquare className="h-4 w-4 text-pink-500" /> },
  reminder: { label: 'Rappels', icon: <Bell className="h-4 w-4 text-red-500" /> },
  document: { label: 'Documents', icon: <Paperclip className="h-4 w-4 text-gray-500" /> },
}

// ─── Recent searches ────────────────────────────────────────────────

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
const RECENT_SEARCHES_KEY = 'seido-recent-searches'
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter((q) => q !== query)
    recent.unshift(query)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {
    // localStorage unavailable (SSR, private mode)
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {
    // noop
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function groupResults(results: SearchResult[]): GroupedResults[] {
  const groups: Record<string, SearchResult[]> = {}

  for (const result of results) {
    if (!groups[result.entity_type]) {
      groups[result.entity_type] = []
    }
    groups[result.entity_type].push(result)
  }

  return Object.entries(groups)
    .map(([type, items]) => ({
      heading: ENTITY_CONFIG[type]?.label || type,
      icon: ENTITY_CONFIG[type]?.icon || <Search className="h-4 w-4" />,
      items,
    }))
}

// ─── Component ──────────────────────────────────────────────────────

export function GlobalSearchPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Load recents on open, cleanup on close
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
      setQuery('')
      setResults([])
      setLoading(false)
    }
  }, [open])

  // Debounced search
  const search = useCallback((q: string) => {
    // Cancel previous
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(
          `/api/search/global?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        setResults(data.results || [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setResults([])
      }
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }, 200)
  }, [])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    search(value)
  }

  const handleSelect = (url: string) => {
    if (query.length >= 2) {
      saveRecentSearch(query)
    }
    setOpen(false)
    router.push(url)
  }

  const handleRecentClick = (recentQuery: string) => {
    setQuery(recentQuery)
    search(recentQuery)
  }

  const handleClearRecents = () => {
    clearRecentSearches()
    setRecentSearches([])
  }

  const grouped = useMemo(() => groupResults(results), [results])

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center h-9 w-9 rounded-lg border border-transparent text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted hover:border-border sm:w-auto sm:px-3 sm:gap-2"
        aria-label="Recherche globale"
      >
        <Search className="h-4.5 w-4.5" />
        <span className="hidden sm:inline text-sm text-muted-foreground">Rechercher</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">{IS_MAC ? '⌘' : 'Ctrl+'}</span>K
        </kbd>
      </button>

      {/* Command palette dialog */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Recherche globale"
        description="Rechercher un contact, une intervention, un bien..."
        showCloseButton={false}
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Rechercher..."
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList>
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recherche...
            </div>
          )}

          {/* Empty state */}
          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>Aucun resultat pour &quot;{query}&quot;</CommandEmpty>
          )}

          {/* Recent searches — shown when input is empty */}
          {!loading && query.length === 0 && recentSearches.length > 0 && (
            <CommandGroup heading={
              <span className="flex items-center justify-between">
                <span>Recherches recentes</span>
                <button
                  onClick={handleClearRecents}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Effacer les recherches recentes"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            }>
              {recentSearches.map((recent) => (
                <CommandItem
                  key={recent}
                  value={recent}
                  onSelect={() => handleRecentClick(recent)}
                  className="cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{recent}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Hint when typing but too short */}
          {!loading && query.length === 1 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Tapez au moins 2 caracteres
            </div>
          )}

          {/* Grouped results */}
          {!loading && grouped.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem
                  key={`${item.entity_type}-${item.entity_id}`}
                  value={`${item.title} ${item.subtitle}`}
                  onSelect={() => handleSelect(item.url)}
                  className="cursor-pointer"
                >
                  {ENTITY_CONFIG[item.entity_type]?.icon || <Search className="h-4 w-4" />}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium">{item.title}</span>
                    {item.subtitle && (
                      <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
