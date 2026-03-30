'use client'

import { memo, useEffect, useRef, useCallback } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { Wrench, Bell, AlertTriangle, FileText, XCircle } from 'lucide-react'
import Image from 'next/image'

// ─── Layout constants ───────────────────────────────────────
const CONTAINER_W = 460
const BADGE_H = 44
const FLOW_ZONE_H = 265 // 4 badge rows + flow gap to AI convergence

// ─── Input badges: 7 items, 4 rows (1-2-2-2 quinconce) ─────
const SOURCE_BADGES = [
  // Row 0 (1 badge, centered — face-to-face)
  { id: 'f2f', icon: '🗣️', text: 'Visite Apt 2A',
    bg: 'bg-cyan-500/[0.06]', border: 'border-cyan-500/[0.08]', iconBg: 'bg-cyan-500/15', textColor: 'text-cyan-400/70',
    pos: { top: 0, left: 160, rotate: 1 }, approxW: 142,
    lineColor: 'rgba(6,182,212,0.3)', dotColor: 'rgb(6,182,212)' },
  // Row 1 (2 badges, spread wide)
  { id: 'wa1', icon: '💬', text: 'Fuite sdb',
    bg: 'bg-green-500/[0.06]', border: 'border-green-500/[0.08]', iconBg: 'bg-green-500/15', textColor: 'text-green-400/70',
    pos: { top: 56, left: 15, rotate: -3 }, approxW: 135,
    lineColor: 'rgba(34,197,94,0.3)', dotColor: 'rgb(34,197,94)' },
  { id: 'em1', icon: '📧', text: 'Relance devis',
    bg: 'bg-red-500/[0.06]', border: 'border-red-500/[0.08]', iconBg: 'bg-red-500/15', textColor: 'text-red-400/70',
    pos: { top: 56, left: 275, rotate: 2.5 }, approxW: 155,
    lineColor: 'rgba(239,68,68,0.25)', dotColor: 'rgb(239,68,68)' },
  // Row 2 (2 badges, quinconce offset)
  { id: 'ph', icon: '📞', text: '3 appels',
    bg: 'bg-purple-500/[0.06]', border: 'border-purple-500/[0.08]', iconBg: 'bg-purple-500/15', textColor: 'text-purple-400/70',
    pos: { top: 112, left: 65, rotate: -2 }, approxW: 125,
    lineColor: 'rgba(168,85,247,0.3)', dotColor: 'rgb(168,85,247)' },
  { id: 'sm', icon: '📲', text: 'Panne chauffage',
    bg: 'bg-amber-400/[0.06]', border: 'border-amber-400/[0.08]', iconBg: 'bg-amber-400/15', textColor: 'text-amber-400/70',
    pos: { top: 112, left: 240, rotate: 3 }, approxW: 170,
    lineColor: 'rgba(251,191,36,0.25)', dotColor: 'rgb(251,191,36)' },
  // Row 3 (2 badges, back to wide spread)
  { id: 'wa2', icon: '💬', text: 'Bruit voisinage',
    bg: 'bg-green-500/[0.06]', border: 'border-green-500/[0.08]', iconBg: 'bg-green-500/15', textColor: 'text-green-400/70',
    pos: { top: 168, left: 5, rotate: -4 }, approxW: 162,
    lineColor: 'rgba(34,197,94,0.25)', dotColor: 'rgb(34,197,94)' },
  { id: 'em2', icon: '📧', text: 'Sinistre Apt 3B',
    bg: 'bg-red-500/[0.06]', border: 'border-red-500/[0.08]', iconBg: 'bg-red-500/15', textColor: 'text-red-400/70',
    pos: { top: 168, left: 265, rotate: 1.5 }, approxW: 158,
    lineColor: 'rgba(239,68,68,0.2)', dotColor: 'rgb(239,68,68)' },
] as const

// Computed: center-bottom of each badge → start of flow line
const FLOW_STARTS = SOURCE_BADGES.map(b => ({
  x: Math.round(b.pos.left + b.approxW / 2),
  y: b.pos.top + BADGE_H,
}))

// Convergence point (center-bottom of flow zone, just above AI node)
const CONV = { x: Math.round(CONTAINER_W / 2), y: FLOW_ZONE_H }

// SVG path strings for offset-path CSS
const FLOW_PATHS = FLOW_STARTS.map(pt =>
  `M ${pt.x} ${pt.y} L ${CONV.x} ${CONV.y}`
)

const DOT_DELAYS = ['0s', '0.3s', '0.6s', '0.9s', '1.2s', '0.2s', '0.8s']

// ─── Output cards (3 organized results from AI) ─────────────
const OUTPUT_CARDS = [
  { id: 'intervention', icon: Wrench,
    iconColor: 'text-blue-400', iconBg: 'bg-blue-400/10',
    title: 'Intervention', subtitle: 'Fuite salle de bain',
    status: 'Planifiée', statusBg: 'bg-blue-400/[0.12]', statusColor: 'text-blue-400',
    detail: 'Marc Dufour · Lun 14h' },
  { id: 'rappel', icon: Bell,
    iconColor: 'text-amber-400', iconBg: 'bg-amber-400/10',
    title: 'Rappel', subtitle: 'Relance devis plomberie',
    status: 'Dans 3 jours', statusBg: 'bg-amber-400/[0.12]', statusColor: 'text-amber-400',
    detail: 'Plombier habituel' },
  { id: 'sinistre', icon: AlertTriangle,
    iconColor: 'text-red-400', iconBg: 'bg-red-400/10',
    title: 'Sinistre', subtitle: 'Dégât des eaux',
    status: 'Déclaré', statusBg: 'bg-red-400/[0.12]', statusColor: 'text-red-400',
    detail: 'Apt 3B · Assurance notifiée' },
  { id: 'rejet', icon: XCircle,
    iconColor: 'text-zinc-400', iconBg: 'bg-zinc-400/10',
    title: 'Rejetée', subtitle: 'Ampoule salon',
    status: 'Rejetée', statusBg: 'bg-zinc-500/[0.12]', statusColor: 'text-zinc-400',
    detail: 'Charge locative' },
] as const

const ANIMATION_DELAYS = {
  sources: [350, 500, 750, 600, 900, 700, 1050],
  flowLines: 1300,
  flowDots: 1500,
  aiNode: 1700,
  flowDown: 2200,
  flowDotDown: 2400,
  outputCards: [2700, 2950, 3200, 3450],
  aiBadge: 3600,
} as const

export const HeroFlowVisual = memo(function HeroFlowVisual() {
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const animatedRef = useRef(false)

  const showElement = useCallback((selector: string) => {
    const el = containerRef.current?.querySelector(selector)
    if (el) el.classList.add('hero-visible')
  }, [])

  const showAll = useCallback((selector: string) => {
    const els = containerRef.current?.querySelectorAll(selector)
    els?.forEach(el => el.classList.add('hero-visible'))
  }, [])

  useEffect(() => {
    if (animatedRef.current || !containerRef.current) return
    animatedRef.current = true

    if (prefersReducedMotion) {
      containerRef.current.querySelectorAll('[data-animate]').forEach(el => el.classList.add('hero-visible'))
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    const t = (fn: () => void, delay: number) => timers.push(setTimeout(fn, delay))

    ANIMATION_DELAYS.sources.forEach((d, i) => t(() => showElement(`[data-src="${i}"]`), d))
    t(() => showAll('[data-flow-line]'), ANIMATION_DELAYS.flowLines)
    t(() => showAll('[data-flow-dot]'), ANIMATION_DELAYS.flowDots)
    t(() => showElement('[data-ai-node]'), ANIMATION_DELAYS.aiNode)
    t(() => showElement('[data-flow-down]'), ANIMATION_DELAYS.flowDown)
    t(() => showElement('[data-flow-dot-down]'), ANIMATION_DELAYS.flowDotDown)
    ANIMATION_DELAYS.outputCards.forEach((d, i) => t(() => showElement(`[data-output="${i}"]`), d))
    t(() => showElement('[data-ai-badge]'), ANIMATION_DELAYS.aiBadge)

    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion, showElement, showAll])

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-0 relative py-4">

      {/* ─── Top zone: badges (staggered quinconce) + SVG flow lines ─── */}
      <div className="relative mb-0" style={{ width: CONTAINER_W, height: FLOW_ZONE_H }}>

        {/* Badges — 3 rows, quinconce layout */}
        {SOURCE_BADGES.map((src, i) => (
          <div
            key={src.id}
            data-animate
            data-src={i}
            className={`hero-animate-drop absolute flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium backdrop-blur-sm border ${src.bg} ${src.border}`}
            style={{
              top: src.pos.top,
              left: src.pos.left,
              '--hero-rotate': `${src.pos.rotate}deg`,
            } as React.CSSProperties}
          >
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0 ${src.iconBg}`}>
              {src.icon}
            </span>
            <span className={`${src.textColor} truncate`}>{src.text}</span>
          </div>
        ))}

        {/* SVG flow lines: badge center-bottom → convergence point */}
        <svg
          className="absolute inset-0 pointer-events-none"
          viewBox={`0 0 ${CONTAINER_W} ${FLOW_ZONE_H}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {SOURCE_BADGES.map((src, i) => (
              <linearGradient
                key={`grad-${i}`}
                id={`flowGrad${i}`}
                x1={FLOW_STARTS[i].x} y1={FLOW_STARTS[i].y}
                x2={CONV.x} y2={CONV.y}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={src.lineColor} />
                <stop offset="100%" stopColor="rgba(139,92,246,0.15)" />
              </linearGradient>
            ))}
          </defs>
          {FLOW_STARTS.map((pt, i) => (
            <line
              key={`line-${i}`}
              data-animate
              data-flow-line
              className="hero-animate-fade"
              x1={pt.x} y1={pt.y}
              x2={CONV.x} y2={CONV.y}
              stroke={`url(#flowGrad${i})`}
              strokeWidth={1}
            />
          ))}
        </svg>

        {/* Flow dots — path-following via offset-path CSS */}
        {SOURCE_BADGES.map((src, i) => (
          <div
            key={`dot-${i}`}
            data-animate
            data-flow-dot
            className="hero-flow-svg-dot absolute top-0 left-0 w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: src.dotColor,
              offsetPath: `path('${FLOW_PATHS[i]}')`,
              animationDelay: DOT_DELAYS[i],
            }}
          />
        ))}
      </div>

      {/* ─── AI Node ─── */}
      <div
        data-animate
        data-ai-node
        className="hero-animate-scale flex items-center gap-3 px-5 pl-3 py-3 rounded-2xl bg-violet-500/[0.08] border border-violet-500/[0.12] my-2"
      >
        <div className="relative w-12 h-12 rounded-full flex items-center justify-center bg-[radial-gradient(circle_at_40%_35%,rgba(139,92,246,0.5),rgba(59,130,246,0.3)_60%,transparent)] shadow-[0_0_24px_rgba(139,92,246,0.2)]">
          <Image
            src="/images/Logo/Picto_Seido_White.webp"
            alt="SEIDO"
            width={28}
            height={28}
            className="relative z-10 brightness-110"
          />
          <div className="absolute inset-[-3px] rounded-full border border-transparent [background:conic-gradient(from_0deg,rgba(96,165,250,0.4),rgba(139,92,246,0.4),rgba(59,130,246,0.2),rgba(96,165,250,0.4))_border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] animate-spin [animation-duration:6s]" />
        </div>
        <div>
          <div className="text-sm font-semibold text-violet-400/80 tracking-wide">SEIDO AI</div>
          <div className="text-xs text-white/40 mt-0.5">Votre assistant personnel</div>
        </div>
      </div>

      {/* ─── Flow line (AI → output) ─── */}
      <div
        data-animate
        data-flow-down
        className="hero-animate-fade relative w-px h-7 bg-gradient-to-b from-violet-500/20 to-blue-400/15"
      >
        <div
          data-animate
          data-flow-dot-down
          className="hero-animate-fade absolute left-[-1.5px] w-1 h-1 rounded-full bg-violet-400 hero-flow-dot-active"
          style={{ animationDelay: '0.6s' }}
        />
      </div>

      {/* ─── Output: 3 organized result cards ─── */}
      <div className="flex gap-2.5 mt-1">
        {OUTPUT_CARDS.map((card, i) => {
          const Icon = card.icon
          const isRejected = card.id === 'rejet'
          return (
            <div
              key={card.id}
              data-animate
              data-output={i}
              className={`hero-animate-slide-up w-[120px] border rounded-xl p-3 backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.03)] ${
                isRejected ? 'bg-zinc-900/25 border-zinc-500/8' : 'bg-slate-900/60 border-blue-400/10'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                  <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
                </div>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${card.statusBg} ${card.statusColor}`}>
                  {card.status}
                </span>
              </div>
              <div className={`text-xs font-bold leading-tight ${isRejected ? 'text-white/40 line-through' : 'text-white/85'}`}>{card.subtitle}</div>
              <div className="text-xs text-white/40 mt-1">{card.detail}</div>
            </div>
          )
        })}
      </div>

      {/* AI created badge */}
      <div
        data-animate
        data-ai-badge
        className="hero-animate-fade inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-violet-500/[0.08] border border-violet-500/10 text-xs font-medium text-violet-400/60"
      >
        <FileText className="w-3.5 h-3.5" />
        Créé automatiquement par l&apos;assistant IA
      </div>
    </div>
  )
})
