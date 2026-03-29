'use client'

import { useState } from 'react'
import { X, Check, AlertTriangle, Info, Clock } from 'lucide-react'
import { useScrollReveal } from './use-scroll-reveal'
import type { ChecklistConfig } from './types'

const STATUS_CONFIG = {
  required: {
    icon: X,
    iconClass: 'text-red-400',
    bgClass: 'bg-red-500/10',
    hoverBg: 'hover:bg-red-500/[0.06]',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.15)]',
  },
  done: {
    icon: Check,
    iconClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    hoverBg: 'hover:bg-emerald-500/[0.06]',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    hoverBg: 'hover:bg-amber-500/[0.06]',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    hoverBg: 'hover:bg-blue-500/[0.06]',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.15)]',
  },
} as const

interface ChecklistTrackerProps {
  config: ChecklistConfig
}

export default function ChecklistTracker({ config }: ChecklistTrackerProps) {
  const { ref, isVisible } = useScrollReveal()
  const { title, deadline, items } = config.data
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

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

      {deadline && (
        <div
          className={`bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3 hero-animate-slide-up
            transition-all duration-300 hover:bg-red-500/15 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] cursor-default
            ${isVisible ? 'hero-visible' : ''}`}
          style={{
            transitionDelay: '100ms',
            animation: isVisible ? 'pulse 2s ease-in-out 1' : 'none',
          }}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-red-400 font-bold text-lg">{deadline.date}</p>
            <p className="text-white/50 text-xs mt-0.5">{deadline.label}</p>
          </div>
        </div>
      )}

      <div className="space-y-0">
        {items.map((item, index) => {
          const statusCfg = STATUS_CONFIG[item.status]
          const StatusIcon = statusCfg.icon
          const isLast = index === items.length - 1
          const isHovered = hoveredIndex === index
          const isDimmed = hoveredIndex !== null && hoveredIndex !== index

          return (
            <div
              key={item.label}
              className={`flex items-start gap-3 py-3 rounded-lg px-2 -mx-2 cursor-default
                hero-animate-slide-up ${isVisible ? 'hero-visible' : ''}
                ${!isLast ? 'border-b border-white/5' : ''}
                transition-all duration-300
                ${isHovered ? `bg-white/[0.03] ${statusCfg.glow}` : ''}
                ${isDimmed ? 'opacity-40' : ''}`}
              style={{ transitionDelay: `${(index + 2) * 100}ms` }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full ${statusCfg.bgClass} flex items-center justify-center mt-0.5 transition-transform duration-300 ${
                  isHovered ? 'scale-110' : ''
                }`}
              >
                <StatusIcon className={`w-4 h-4 ${statusCfg.iconClass}`} />
              </div>
              <div>
                <p className={`text-sm font-medium transition-colors duration-300 ${isHovered ? 'text-white' : 'text-white/90'}`}>
                  {item.label}
                </p>
                {item.detail && (
                  <p className={`text-xs mt-0.5 transition-all duration-300 ${
                    isHovered ? 'text-white/60 max-h-20' : 'text-white/50 max-h-5 overflow-hidden'
                  }`}>
                    {item.detail}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
