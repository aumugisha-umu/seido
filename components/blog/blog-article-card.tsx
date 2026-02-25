import Link from 'next/link'
import { Calendar, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ArticleMeta } from '@/lib/blog'

interface BlogArticleCardProps {
  article: ArticleMeta
  className?: string
}

export const BlogArticleCard = ({ article, className }: BlogArticleCardProps) => {
  const formattedDate = new Date(article.date).toLocaleDateString('fr-BE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Link
      href={`/blog/${article.slug}`}
      className={cn(
        'group block rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm',
        'hover:border-white/20 hover:bg-white/[0.07] transition-all duration-300',
        'p-6',
        className
      )}
    >
      {/* Category */}
      <Badge
        variant="outline"
        className="border-blue-500/50 text-blue-300 bg-blue-500/10 mb-3"
      >
        {article.category}
      </Badge>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors line-clamp-2">
        {article.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-white/60 mb-4 line-clamp-3 leading-relaxed">
        {article.description}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {formattedDate}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {article.reading_time}
        </span>
      </div>

      {/* Tags preview */}
      <div className="flex flex-wrap gap-1.5 mt-4">
        {article.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full"
          >
            {tag}
          </span>
        ))}
        {article.tags.length > 3 && (
          <span className="text-xs text-white/30">+{article.tags.length - 3}</span>
        )}
      </div>
    </Link>
  )
}
