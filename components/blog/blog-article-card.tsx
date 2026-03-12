import Link from 'next/link'
import { Calendar, Clock, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ArticleMeta } from '@/lib/blog'

type CardVariant = 'default' | 'featured' | 'recap'

interface BlogArticleCardProps {
  article: ArticleMeta
  variant?: CardVariant
  isEssential?: boolean
  className?: string
}

export const BlogArticleCard = ({
  article,
  variant = 'default',
  isEssential = false,
  className,
}: BlogArticleCardProps) => {
  if (variant === 'featured') {
    return (
      <Link
        href={`/blog/${article.slug}`}
        className={cn(
          'group relative block rounded-xl overflow-hidden',
          'border border-amber-500/25 bg-amber-500/[0.04]',
          'hover:border-amber-500/40 hover:bg-amber-500/[0.07]',
          'transition-all duration-300 hover:-translate-y-0.5',
          'p-6 md:p-8',
          className
        )}
      >
        {/* Corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative">
          {/* Top badges */}
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant="outline"
              className="border-amber-500/50 text-amber-300 bg-amber-500/10"
            >
              {article.category}
            </Badge>
            <span className="flex items-center gap-1.5 text-xs text-amber-400/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              </span>
              Nouveau
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl md:text-2xl font-semibold text-white mb-3 group-hover:text-amber-200 transition-colors leading-tight">
            {article.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-white/50 mb-5 leading-relaxed line-clamp-3">
            {article.description}
          </p>

          {/* Meta footer */}
          <div className="flex items-center gap-4 text-xs text-white/35">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-400/50" />
              <span className="text-amber-300/60">Articles résumés</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.reading_time}
            </span>
            <span className="ml-auto text-amber-400/60 group-hover:text-amber-300 transition-colors font-medium">
              Lire →
            </span>
          </div>
        </div>
      </Link>
    )
  }

  if (variant === 'recap') {
    return (
      <Link
        href={`/blog/${article.slug}`}
        className={cn(
          'group block rounded-xl',
          'border border-amber-500/15 bg-amber-500/[0.02]',
          'hover:border-amber-500/30 hover:bg-amber-500/[0.05]',
          'transition-all duration-300 hover:-translate-y-0.5',
          'p-5',
          className
        )}
      >
        <Badge
          variant="outline"
          className="border-amber-500/40 text-amber-300/70 bg-amber-500/5 mb-3 text-xs"
        >
          {article.category}
        </Badge>

        <h3 className="text-base font-semibold text-white mb-2 group-hover:text-amber-200 transition-colors line-clamp-2 leading-snug">
          {article.title}
        </h3>

        <p className="text-xs text-white/40 mb-3 line-clamp-2 leading-relaxed">
          {article.description}
        </p>

        <div className="flex items-center gap-3 text-xs text-white/30">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.reading_time}
          </span>
          <span className="ml-auto text-amber-400/50 group-hover:text-amber-300 transition-colors text-xs">
            Lire →
          </span>
        </div>
      </Link>
    )
  }

  // Default variant — only compute formattedDate here
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
        'hover:border-white/20 hover:bg-white/[0.07]',
        'transition-all duration-300 hover:-translate-y-0.5',
        'p-6',
        className
      )}
    >
      {/* Category */}
      <Badge
        variant="outline"
        className={cn(
          'mb-3',
          isEssential
            ? 'border-amber-500/50 text-amber-300 bg-amber-500/10'
            : 'border-blue-500/50 text-blue-300 bg-blue-500/10'
        )}
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
