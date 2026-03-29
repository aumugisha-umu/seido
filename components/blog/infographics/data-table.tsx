'use client'

import { useState } from 'react'
import { useScrollReveal } from './use-scroll-reveal'
import type { DataTableConfig } from './types'

const BORDER_COLOR_MAP: Record<string, string> = {
  red: 'border-red-500',
  blue: 'border-blue-500',
  green: 'border-emerald-500',
  amber: 'border-amber-500',
}

const BG_HIGHLIGHT_MAP: Record<string, string> = {
  red: 'bg-red-500/[0.08]',
  blue: 'bg-blue-500/[0.08]',
  green: 'bg-emerald-500/[0.08]',
  amber: 'bg-amber-500/[0.08]',
}

const HOVER_GLOW_MAP: Record<string, string> = {
  red: 'shadow-[inset_0_0_20px_rgba(239,68,68,0.08)]',
  blue: 'shadow-[inset_0_0_20px_rgba(59,130,246,0.08)]',
  green: 'shadow-[inset_0_0_20px_rgba(16,185,129,0.08)]',
  amber: 'shadow-[inset_0_0_20px_rgba(245,158,11,0.08)]',
}

interface DataTableProps {
  config: DataTableConfig
}

export default function DataTable({ config }: DataTableProps) {
  const { ref, isVisible } = useScrollReveal()
  const { title, caption, headers, rows, footer } = config.data
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [hoveredCol, setHoveredCol] = useState<number | null>(null)

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8 hero-animate-slide-up ${isVisible ? 'hero-visible' : ''}`}
    >
      {title && (
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">
          {title}
        </h3>
      )}
      {caption && (
        <p className="text-sm text-white/40 mb-4">{caption}</p>
      )}

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/10">
              {headers.map((header, colIdx) => (
                <th
                  key={header}
                  className={`px-4 py-3 text-left text-sm font-medium first:rounded-tl-lg last:rounded-tr-lg transition-colors duration-200 ${
                    hoveredCol === colIdx ? 'text-white' : 'text-white/70'
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const borderColor = row.highlight && row.color
                ? BORDER_COLOR_MAP[row.color] ?? BORDER_COLOR_MAP.blue
                : ''
              const bgHighlight = row.highlight && row.color
                ? BG_HIGHLIGHT_MAP[row.color] ?? BG_HIGHLIGHT_MAP.blue
                : ''
              const hoverGlow = row.color
                ? HOVER_GLOW_MAP[row.color] ?? ''
                : ''
              const isHovered = hoveredRow === index
              const isDimmed = hoveredRow !== null && hoveredRow !== index

              return (
                <tr
                  key={index}
                  className={`
                    hero-animate-fade cursor-default
                    transition-all duration-200
                    ${row.highlight ? `border-l-2 ${borderColor} ${bgHighlight}` : 'border-l-2 border-transparent odd:bg-white/[0.02]'}
                    ${isHovered ? `bg-white/[0.06] ${hoverGlow}` : ''}
                    ${isDimmed ? 'opacity-40' : ''}
                  `}
                  style={{
                    transitionDelay: `${(index + 1) * 50}ms`,
                    opacity: isVisible ? (isDimmed ? 0.4 : 1) : 0,
                  }}
                  onMouseEnter={() => setHoveredRow(index)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {row.cells.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-3 transition-colors duration-200 ${
                        cellIndex === 0 ? 'font-medium' : ''
                      } ${
                        isHovered ? 'text-white' : 'text-white/80'
                      } ${
                        hoveredCol === cellIndex ? 'bg-white/[0.03]' : ''
                      }`}
                      onMouseEnter={() => setHoveredCol(cellIndex)}
                      onMouseLeave={() => setHoveredCol(null)}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {footer && (
        <p className="text-xs text-white/30 mt-3">{footer}</p>
      )}
    </div>
  )
}
