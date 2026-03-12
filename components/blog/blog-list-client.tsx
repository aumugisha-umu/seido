'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, X, ChevronDown, ChevronUp, Newspaper, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { ESSENTIEL_CATEGORY } from '@/lib/constants/blog'
import type { ArticleMeta, TagWithFrequency } from '@/lib/blog'
import { BlogArticleCard } from './blog-article-card'

const TAG_THRESHOLD_PRIMARY = 3
const TAG_THRESHOLD_SECONDARY = 2

interface BlogListClientProps {
  articles: ArticleMeta[]
  categories: string[]
  tagsWithFrequency: TagWithFrequency[]
}

const formatMonthLabel = (dateStr: string): string => {
  const date = new Date(dateStr)
  const month = date.toLocaleDateString('fr-BE', { month: 'long' })
  const year = date.getFullYear()
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`
}

const getMonthKey = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const BlogListClient = ({
  articles,
  categories,
  tagsWithFrequency,
}: BlogListClientProps) => {
  const searchParams = useSearchParams()
  const initialTag = searchParams.get('tag') || ''

  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string>(initialTag)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagsExpanded, setTagsExpanded] = useState(false)

  // Split tags by frequency threshold
  const primaryTags = useMemo(
    () => tagsWithFrequency.filter((t) => t.count >= TAG_THRESHOLD_PRIMARY),
    [tagsWithFrequency]
  )
  const secondaryTags = useMemo(
    () => tagsWithFrequency.filter((t) => t.count === TAG_THRESHOLD_SECONDARY),
    [tagsWithFrequency]
  )

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (selectedCategory && article.category !== selectedCategory) return false
      if (selectedTag && !article.tags.includes(selectedTag)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          article.title.toLowerCase().includes(q) ||
          article.description.toLowerCase().includes(q) ||
          article.tags.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [articles, selectedCategory, selectedTag, searchQuery])

  const hasActiveFilter = !!(selectedCategory || selectedTag || searchQuery)

  // Split into recap vs thematic articles
  const recapArticles = useMemo(
    () => filteredArticles.filter((a) => a.category === ESSENTIEL_CATEGORY),
    [filteredArticles]
  )
  const thematicArticles = useMemo(
    () => filteredArticles.filter((a) => a.category !== ESSENTIEL_CATEGORY),
    [filteredArticles]
  )

  // Group thematic articles by month
  const articlesByMonth = useMemo(() => {
    const groups = new Map<string, { label: string; articles: ArticleMeta[] }>()
    thematicArticles.forEach((article) => {
      const key = getMonthKey(article.date)
      if (!groups.has(key)) {
        groups.set(key, { label: formatMonthLabel(article.date), articles: [] })
      }
      groups.get(key)!.articles.push(article)
    })
    // Sort by month key descending
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [thematicArticles])

  const clearFilters = () => {
    setSelectedCategory('')
    setSelectedTag('')
    setSearchQuery('')
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un article..."
          className={cn(
            'w-full pl-11 pr-4 py-3 rounded-xl',
            'bg-white/5 border border-white/10 text-white placeholder:text-white/30',
            'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25',
            'transition-colors text-sm'
          )}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.15em] text-white/30 mb-2.5 font-medium">Catégories</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm transition-all duration-200',
              !selectedCategory
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white hover:border-white/20'
            )}
          >
            Toutes
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setSelectedCategory(selectedCategory === cat ? '' : cat)
              }
              className={cn(
                'px-3 py-1.5 rounded-full text-sm transition-all duration-200',
                selectedCategory === cat
                  ? cat === ESSENTIEL_CATEGORY
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:text-white hover:border-white/20'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filters — smart frequency-based */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.15em] text-white/30 mb-2.5 font-medium">Tags</p>
        {secondaryTags.length > 0 ? (
          <Collapsible open={tagsExpanded} onOpenChange={setTagsExpanded}>
            {/* Single flex container — primary + secondary tags flow inline */}
            <div className="flex flex-wrap gap-1.5">
              {primaryTags.map(({ tag }) => (
                <Badge
                  key={tag}
                  variant="outline"
                  onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                  className={cn(
                    'cursor-pointer transition-all duration-200 text-xs',
                    selectedTag === tag
                      ? 'border-purple-500/50 text-purple-300 bg-purple-500/10 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
                      : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                  )}
                >
                  {tag}
                </Badge>
              ))}
              {/* Secondary tags inline — rendered inside CollapsibleContent but within same flex parent */}
              <CollapsibleContent className="contents">
                {secondaryTags.map(({ tag }) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                    className={cn(
                      'cursor-pointer transition-all duration-200 text-xs',
                      selectedTag === tag
                        ? 'border-purple-500/50 text-purple-300 bg-purple-500/10'
                        : 'border-white/5 text-white/25 hover:text-white/40 hover:border-white/15'
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
              </CollapsibleContent>
            </div>
            {/* Toggle trigger below the tags */}
            <CollapsibleTrigger className="flex items-center gap-1.5 mt-2.5 text-xs text-white/30 hover:text-white/50 transition-colors cursor-pointer">
              {tagsExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Réduire
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Voir tous les tags ({secondaryTags.length} de plus)
                </>
              )}
            </CollapsibleTrigger>
          </Collapsible>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {primaryTags.map(({ tag }) => (
              <Badge
                key={tag}
                variant="outline"
                onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                className={cn(
                  'cursor-pointer transition-all duration-200 text-xs',
                  selectedTag === tag
                    ? 'border-purple-500/50 text-purple-300 bg-purple-500/10 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
                    : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                )}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Active filter indicator */}
      {hasActiveFilter && (
        <div className="flex items-center gap-2 mb-6 pb-6 border-b border-white/5">
          <span className="text-sm text-white/50">
            {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Effacer les filtres
          </button>
        </div>
      )}

      {/* Content area */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/50 text-lg mb-2">Aucun article trouvé</p>
          <p className="text-white/30 text-sm mb-4">
            Essayez de modifier vos filtres ou votre recherche.
          </p>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Effacer les filtres
          </button>
        </div>
      ) : hasActiveFilter ? (
        /* Flat grid when filter is active */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <BlogArticleCard
              key={article.slug}
              article={article}
              isEssential={article.category === ESSENTIEL_CATEGORY}
            />
          ))}
        </div>
      ) : (
        /* Editorial layout: pinned recaps + monthly sections */
        <div className="space-y-12">
          {/* Pinned recaps section */}
          {recapArticles.length > 0 && (
            <section className="relative rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-6 md:p-8">
              {/* Subtle amber glow */}
              <div className="absolute -top-20 -left-20 w-60 h-60 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Newspaper className="h-4 w-4 text-amber-400" />
                  </div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-300/80">
                    Synthèses mensuelles
                  </h2>
                </div>
                {recapArticles.length > 3 && (
                  <button
                    onClick={() => setSelectedCategory(ESSENTIEL_CATEGORY)}
                    className="flex items-center gap-1 text-xs text-amber-400/60 hover:text-amber-300 transition-colors"
                  >
                    Voir tous
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Featured card — latest recap takes 2 cols */}
                {recapArticles[0] && (
                  <div className="md:col-span-2">
                    <BlogArticleCard
                      article={recapArticles[0]}
                      variant="featured"
                    />
                  </div>
                )}
                {/* Standard recap cards */}
                {recapArticles.slice(1, 3).map((article) => (
                  <BlogArticleCard
                    key={article.slug}
                    article={article}
                    variant="recap"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Gradient separator */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Monthly grouped articles */}
          {articlesByMonth.map(([monthKey, { label, articles: monthArticles }]) => (
            <section key={monthKey}>
              {/* Month header */}
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white/30 whitespace-nowrap">
                  {label}
                </h2>
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-white/20 whitespace-nowrap">
                  {monthArticles.length} article{monthArticles.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Articles grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {monthArticles.map((article) => (
                  <BlogArticleCard
                    key={article.slug}
                    article={article}
                    isEssential={article.category === ESSENTIEL_CATEGORY}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
