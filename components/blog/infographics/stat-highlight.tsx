'use client'

import { CountUp } from '@/components/ui/count-up'
import { useScrollReveal } from './use-scroll-reveal'
import type { StatHighlightConfig } from './types'

const COLOR_MAP: Record<string, { text: string; glow: string }> = {
  blue: { text: 'text-blue-400', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
  red: { text: 'text-red-400', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]' },
  green: { text: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
  amber: { text: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
}

function getGridCols(count: number): string {
  if (count <= 2) return 'grid-cols-2'
  if (count === 3) return 'grid-cols-2 md:grid-cols-3'
  return 'grid-cols-2 md:grid-cols-4'
}

interface StatHighlightProps {
  config: StatHighlightConfig
}

export default function StatHighlight({ config }: StatHighlightProps) {
  const { ref, isVisible } = useScrollReveal()
  const { title, stats } = config.data

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8 hero-animate-slide-up ${isVisible ? 'hero-visible' : ''}`}
    >
      {title && (
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
          {title}
        </h3>
      )}
      <div className={`grid ${getGridCols(stats.length)} gap-4 md:gap-6`}>
        {stats.map((stat, index) => {
          const colors = COLOR_MAP[stat.color ?? ''] ?? { text: 'text-white', glow: '' }
          return (
            <div
              key={stat.label}
              className={`text-center p-4 rounded-xl bg-white/[0.02] border border-transparent
                hero-animate-scale ${isVisible ? 'hero-visible' : ''}
                transition-all duration-300
                hover:bg-white/[0.06] hover:border-white/10 hover:scale-105 hover:${colors.glow}
                cursor-default group`}
              style={{ transitionDelay: `${(index + 1) * 150}ms` }}
            >
              <p className={`text-3xl md:text-4xl font-bold ${colors.text} transition-transform duration-300 group-hover:scale-110`}>
                <CountUp
                  end={stat.value}
                  prefix={stat.prefix ?? ''}
                  suffix={stat.suffix ?? ''}
                  separator=" "
                />
              </p>
              <p className="text-sm text-white/60 mt-2 transition-colors duration-300 group-hover:text-white/80">
                {stat.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
