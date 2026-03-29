'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Clock, Calendar, ChevronRight } from 'lucide-react'
import { useScrollReveal } from './use-scroll-reveal'
import type { TimelineConfig } from './types'

const DOT_COLORS: Record<string, { ring: string; bg: string; glow: string; cardBorder: string }> = {
  blue: { ring: 'border-blue-500', bg: 'bg-blue-500/20', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]', cardBorder: 'border-l-blue-500' },
  red: { ring: 'border-red-500', bg: 'bg-red-500/20', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]', cardBorder: 'border-l-red-500' },
  green: { ring: 'border-emerald-500', bg: 'bg-emerald-500/20', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]', cardBorder: 'border-l-emerald-500' },
  amber: { ring: 'border-amber-500', bg: 'bg-amber-500/20', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]', cardBorder: 'border-l-amber-500' },
}

const ZONE_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/10',
  red: 'bg-red-500/10',
}

const ICON_MAP = {
  alert: AlertTriangle,
  check: Check,
  clock: Clock,
  calendar: Calendar,
} as const

type Milestone = TimelineConfig['data']['milestones'][number]

interface TimelineChartProps {
  config: TimelineConfig
}

export default function TimelineChart({ config }: TimelineChartProps) {
  const { ref, isVisible } = useScrollReveal()
  const { title, milestones, zones } = config.data

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8 hero-animate-slide-up ${isVisible ? 'hero-visible' : ''}`}
    >
      {title && (
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-6">
          {title}
        </h3>
      )}

      {/* Desktop: horizontal timeline */}
      <div className="hidden md:block">
        <HorizontalTimeline milestones={milestones} zones={zones} isVisible={isVisible} />
      </div>

      {/* Mobile: vertical timeline */}
      <div className="md:hidden">
        <VerticalTimeline milestones={milestones} isVisible={isVisible} />
      </div>
    </div>
  )
}

/* ─── Hover Card (shared) ─── */

function MilestoneHoverCard({
  milestone,
  color,
  position,
}: {
  milestone: Milestone
  color: string
  position: 'above' | 'below'
}) {
  const colors = DOT_COLORS[color] ?? DOT_COLORS.blue
  const hasActions = milestone.actions && milestone.actions.length > 0

  return (
    <div
      className={`absolute z-20 w-64 ${
        position === 'above' ? 'bottom-full mb-4' : 'top-full mt-4'
      } left-1/2 -translate-x-1/2`}
    >
      <div className={`rounded-xl border border-white/15 bg-[#131b2e]/95 backdrop-blur-md p-4 border-l-4 ${colors.cardBorder} ${colors.glow}`}>
        <p className="text-base font-bold text-white">{milestone.date}</p>
        <p className="text-sm text-white/80 mt-1 leading-snug">{milestone.label}</p>
        {milestone.detail && (
          <p className="text-xs text-white/50 mt-1 leading-snug">{milestone.detail}</p>
        )}

        {hasActions && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              A faire
            </p>
            <ul className="space-y-1.5">
              {milestone.actions!.map((action, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-white/70 leading-snug">
                  <ChevronRight size={12} className="shrink-0 mt-0.5 text-white/30" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Horizontal (Desktop) ─── */

function HorizontalTimeline({
  milestones,
  zones,
  isVisible,
}: {
  milestones: TimelineConfig['data']['milestones']
  zones?: TimelineConfig['data']['zones']
  isVisible: boolean
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className="relative pt-36 pb-36 px-12">
      {/* Zones */}
      {zones?.map((zone, i) => {
        const leftPct = (zone.from / (milestones.length - 1)) * 100
        const widthPct = ((zone.to - zone.from) / (milestones.length - 1)) * 100
        return (
          <div
            key={i}
            className={`absolute top-0 bottom-0 ${ZONE_COLORS[zone.color] ?? 'bg-white/5'} rounded-lg transition-opacity duration-300 ${
              hoveredIndex !== null ? 'opacity-30' : 'opacity-100'
            }`}
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          >
            <span className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-white/30 uppercase tracking-wider whitespace-nowrap">
              {zone.label}
            </span>
          </div>
        )
      })}

      {/* Central line */}
      <div className="absolute left-12 right-12 top-1/2 -translate-y-1/2 h-0.5 bg-white/10">
        <div
          className="h-full bg-white/25 transition-all duration-1000 ease-out"
          style={{ width: isVisible ? '100%' : '0%' }}
        />
      </div>

      {/* Milestones */}
      <div className="relative flex justify-between">
        {milestones.map((milestone, index) => {
          const isAbove = index % 2 === 0
          const color = milestone.color ?? 'blue'
          const IconComponent = milestone.icon ? ICON_MAP[milestone.icon] : null
          const isHovered = hoveredIndex === index
          const isDimmed = hoveredIndex !== null && hoveredIndex !== index

          return (
            <div
              key={`${milestone.date}-${index}`}
              className={`relative flex flex-col items-center hero-animate-drop cursor-pointer ${isVisible ? 'hero-visible' : ''}`}
              style={{ transitionDelay: `${(index + 1) * 150}ms` }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {isAbove ? (
                <>
                  {/* Compact label (default) */}
                  <div className={`absolute bottom-full mb-4 text-center w-36 transition-all duration-300 ${
                    isHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  } ${isDimmed ? 'opacity-40' : ''}`}>
                    <p className="text-sm font-bold text-white">{milestone.date}</p>
                    <p className="text-sm text-white/70 mt-1 leading-snug">{milestone.label}</p>
                    {milestone.detail && (
                      <p className="text-xs text-white/40 mt-1 leading-snug max-h-10 overflow-hidden">{milestone.detail}</p>
                    )}
                  </div>

                  {/* Expanded hover card */}
                  {isHovered && (
                    <MilestoneHoverCard milestone={milestone} color={color} position="above" />
                  )}

                  <MilestoneDot color={color} icon={IconComponent} isHovered={isHovered} isDimmed={isDimmed} />
                  <div className="h-14" />
                </>
              ) : (
                <>
                  <div className="h-14" />
                  <MilestoneDot color={color} icon={IconComponent} isHovered={isHovered} isDimmed={isDimmed} />

                  {/* Compact label (default) */}
                  <div className={`absolute top-full mt-4 text-center w-36 transition-all duration-300 ${
                    isHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  } ${isDimmed ? 'opacity-40' : ''}`}>
                    <p className="text-sm font-bold text-white">{milestone.date}</p>
                    <p className="text-sm text-white/70 mt-1 leading-snug">{milestone.label}</p>
                    {milestone.detail && (
                      <p className="text-xs text-white/40 mt-1 leading-snug max-h-10 overflow-hidden">{milestone.detail}</p>
                    )}
                  </div>

                  {/* Expanded hover card */}
                  {isHovered && (
                    <MilestoneHoverCard milestone={milestone} color={color} position="below" />
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Vertical (Mobile) ─── */

function VerticalTimeline({
  milestones,
  isVisible,
}: {
  milestones: TimelineConfig['data']['milestones']
  isVisible: boolean
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  return (
    <div className="relative pl-10">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10">
        <div
          className="w-full bg-white/25 transition-all duration-1000 ease-out"
          style={{ height: isVisible ? '100%' : '0%' }}
        />
      </div>

      <div className="space-y-5">
        {milestones.map((milestone, index) => {
          const color = milestone.color ?? 'blue'
          const colors = DOT_COLORS[color] ?? DOT_COLORS.blue
          const IconComponent = milestone.icon ? ICON_MAP[milestone.icon] : null
          const isExpanded = expandedIndex === index
          const hasActions = milestone.actions && milestone.actions.length > 0

          return (
            <div
              key={`${milestone.date}-${index}`}
              className={`relative flex items-start gap-4 hero-animate-drop cursor-pointer min-h-[48px] ${isVisible ? 'hero-visible' : ''}`}
              style={{ transitionDelay: `${(index + 1) * 150}ms` }}
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
            >
              <div className="absolute -left-10 top-0.5">
                <MilestoneDot color={color} icon={IconComponent} size="sm" isHovered={isExpanded} isDimmed={false} />
              </div>

              <div className={`flex-1 transition-all duration-300 rounded-xl ${
                isExpanded ? `bg-white/[0.04] border border-white/10 border-l-4 ${colors.cardBorder} p-4` : ''
              }`}>
                <p className="text-sm font-bold text-white">{milestone.date}</p>
                <p className="text-sm text-white/70 mt-0.5 leading-snug">{milestone.label}</p>
                {milestone.detail && (
                  <p className={`text-xs mt-1 leading-snug transition-all duration-300 ${
                    isExpanded ? 'text-white/60' : 'text-white/40 max-h-5 overflow-hidden'
                  }`}>
                    {milestone.detail}
                  </p>
                )}

                {isExpanded && hasActions && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                      A faire
                    </p>
                    <ul className="space-y-1.5">
                      {milestone.actions!.map((action, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-white/70 leading-snug">
                          <ChevronRight size={12} className="shrink-0 mt-0.5 text-white/30" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Milestone Dot ─── */

function MilestoneDot({
  color,
  icon: IconComponent,
  size = 'md',
  isHovered,
  isDimmed,
}: {
  color: string
  icon: React.ComponentType<{ size: number; className?: string }> | null
  size?: 'sm' | 'md'
  isHovered: boolean
  isDimmed: boolean
}) {
  const colors = DOT_COLORS[color] ?? DOT_COLORS.blue
  const sizeClasses = size === 'sm'
    ? isHovered ? 'w-10 h-10' : 'w-8 h-8'
    : isHovered ? 'w-14 h-14' : 'w-10 h-10'
  const iconSize = size === 'sm'
    ? isHovered ? 18 : 16
    : isHovered ? 22 : 18

  return (
    <div
      className={`${sizeClasses} rounded-full border-2 ${colors.ring} ${colors.bg} flex items-center justify-center shrink-0 transition-all duration-300 ${
        isHovered ? colors.glow : ''
      } ${isDimmed ? 'opacity-40 scale-90' : ''}`}
    >
      {IconComponent && (
        <IconComponent size={iconSize} className="text-white/80 transition-all duration-300" />
      )}
    </div>
  )
}
