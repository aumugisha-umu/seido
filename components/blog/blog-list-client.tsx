'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ArticleMeta } from '@/lib/blog'
import { BlogArticleCard } from './blog-article-card'

interface BlogListClientProps {
  articles: ArticleMeta[]
  categories: string[]
  tags: string[]
}

export const BlogListClient = ({
  articles,
  categories,
  tags,
}: BlogListClientProps) => {
  const searchParams = useSearchParams()
  const initialTag = searchParams.get('tag') || ''

  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string>(initialTag)
  const [searchQuery, setSearchQuery] = useState('')

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

  const hasActiveFilter = selectedCategory || selectedTag || searchQuery

  const clearFilters = () => {
    setSelectedCategory('')
    setSelectedTag('')
    setSearchQuery('')
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un article..."
          className={cn(
            'w-full pl-10 pr-4 py-2.5 rounded-lg',
            'bg-white/5 border border-white/10 text-white placeholder:text-white/30',
            'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25',
            'transition-colors'
          )}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSelectedCategory('')}
          className={cn(
            'px-3 py-1 rounded-full text-sm transition-colors',
            !selectedCategory
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
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
              'px-3 py-1 rounded-full text-sm transition-colors',
              selectedCategory === cat
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white hover:border-white/20'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-1.5 mb-8">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
            className={cn(
              'cursor-pointer transition-colors text-xs',
              selectedTag === tag
                ? 'border-purple-500/50 text-purple-300 bg-purple-500/10'
                : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
            )}
          >
            {tag}
          </Badge>
        ))}
      </div>

      {/* Active filter clear */}
      {hasActiveFilter && (
        <div className="flex items-center gap-2 mb-6">
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

      {/* Article grid */}
      {filteredArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <BlogArticleCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-white/50 text-lg mb-2">Aucun article trouve</p>
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
      )}
    </div>
  )
}
