'use client'

import { useState } from 'react'
import { CountUp } from '@/components/ui/count-up'
import { useScrollReveal } from './use-scroll-reveal'
import type { ComparisonBarsConfig } from './types'

const BAR_COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
}

const TEXT_COLOR_MAP: Record<string, string> = {
  blue: 'text-blue-400',
  red: 'text-red-400',
  green: 'text-emerald-400',
  amber: 'text-amber-400',
}

const GLOW_MAP: Record<string, string> = {
  blue: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
  red: 'shadow-[0_0_12px_rgba(239,68,68,0.3)]',
  green: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
  amber: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
}

interface ComparisonBarsProps {
  config: ComparisonBarsConfig
}

export default function ComparisonBars({ config }: ComparisonBarsProps) {
  const { ref, isVisible } = useScrollReveal()
  const { title, items, showValues = true, baselineLabel, baselineValue } = config.data
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const maxValue = Math.max(...items.map((item) => item.value))

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
      <div className="relative flex flex-col gap-3">
        {items.map((item, index) => {
          const barColor = BAR_COLOR_MAP[item.color ?? ''] ?? BAR_COLOR_MAP.blue
          const textColor = TEXT_COLOR_MAP[item.color ?? ''] ?? TEXT_COLOR_MAP.blue
          const glow = item.highlight ? (GLOW_MAP[item.color ?? ''] ?? GLOW_MAP.blue) : ''
          const widthPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          const isHovered = hoveredIndex === index
          const isDimmed = hoveredIndex !== null && hoveredIndex !== index

          return (
            <div
              key={item.label}
              className={`hero-animate-scale transition-all duration-300 ${isDimmed ? 'opacity-40' : ''}`}
              style={{
                transitionDelay: `${(index + 1) * 100}ms`,
                opacity: isVisible ? (isDimmed ? 0.4 : 1) : 0,
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 cursor-default">
                <span className={`text-sm md:w-40 md:text-right shrink-0 truncate transition-colors duration-300 ${
                  isHovered ? 'text-white font-medium' : 'text-white/70'
                }`}>
                  {item.label}
                </span>
                <div className="flex-1 flex items-center gap-3">
                  <div className="relative flex-1 h-7 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} ${glow} transition-all duration-300 ${
                        item.highlight || isHovered ? 'opacity-100' : 'opacity-80'
                      } ${isHovered ? 'brightness-125' : ''}`}
                      style={{
                        width: `${widthPercent}%`,
                        transform: isVisible ? `scaleX(1)${isHovered ? ' scaleY(1.15)' : ''}` : 'scaleX(0)',
                        transformOrigin: 'left',
                        transition: `transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${(index + 1) * 100}ms, filter 0.3s`,
                      }}
                    />
                    {baselineValue !== undefined && maxValue > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-px border-l border-dashed border-white/30"
                        style={{ left: `${(baselineValue / maxValue) * 100}%` }}
                      />
                    )}
                  </div>
                  {showValues && (
                    <span className={`text-sm font-semibold ${textColor} w-20 shrink-0 tabular-nums transition-all duration-300 ${
                      isHovered ? 'scale-110' : ''
                    }`}>
                      {isVisible ? (
                        <CountUp
                          end={item.value}
                          prefix={item.prefix ?? ''}
                          suffix={item.suffix ?? ''}
                          separator=" "
                        />
                      ) : (
                        <span>{item.prefix ?? ''}{0}{item.suffix ?? ''}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {baselineValue !== undefined && baselineLabel && maxValue > 0 && (
          <div
            className="text-xs text-white/40 mt-1"
            style={{ paddingLeft: `calc(${(baselineValue / maxValue) * 100}% + 10rem)` }}
          >
            {baselineLabel}
          </div>
        )}
      </div>
    </div>
  )
}
