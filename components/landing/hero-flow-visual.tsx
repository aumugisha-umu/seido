'use client'

import { memo, useEffect, useRef, useCallback } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { Wrench, Check, FileText, Clock } from 'lucide-react'
import Image from 'next/image'

const SOURCE_BADGES = [
  { id: 'wa', icon: '💬', text: 'Fuite sdb', bg: 'bg-green-500/[0.06]', border: 'border-green-500/[0.08]', iconBg: 'bg-green-500/15', textColor: 'text-green-400/70' },
  { id: 'em', icon: '📧', text: 'Devis plomberie', bg: 'bg-red-500/[0.06]', border: 'border-red-500/[0.08]', iconBg: 'bg-red-500/15', textColor: 'text-red-400/70' },
  { id: 'ph', icon: '📞', text: '3 appels', bg: 'bg-purple-500/[0.06]', border: 'border-purple-500/[0.08]', iconBg: 'bg-purple-500/15', textColor: 'text-purple-400/70' },
  { id: 'sm', icon: '📱', text: 'Chauffage panne', bg: 'bg-amber-400/[0.06]', border: 'border-amber-400/[0.08]', iconBg: 'bg-amber-400/15', textColor: 'text-amber-400/70' },
] as const

const DETAIL_ROWS = [
  { icon: 'done', label: 'Prestataire assigné', value: 'Marc Dufour' },
  { icon: 'done', label: 'Locataire notifié', value: 'Emma Dubois' },
  { icon: 'pending', label: 'Rdv confirmé', value: 'Lundi 14h' },
] as const

const CONTEXT_CHIPS = [
  { icon: '📄', text: 'Bail Apt 3B', type: 'doc' as const },
  { icon: '👤', text: 'Plombier habituel', type: 'contact' as const },
  { icon: '🔧', text: '2 interventions passées', type: 'history' as const },
] as const

const CHIP_STYLES = {
  doc: { bg: 'bg-blue-500/[0.06]', border: 'border-blue-500/10', iconBg: 'bg-blue-500/[0.12]', text: 'text-blue-400/70' },
  contact: { bg: 'bg-emerald-400/[0.06]', border: 'border-emerald-400/10', iconBg: 'bg-emerald-400/[0.12]', text: 'text-emerald-400/70' },
  history: { bg: 'bg-amber-400/[0.06]', border: 'border-amber-400/10', iconBg: 'bg-amber-400/[0.12]', text: 'text-amber-400/70' },
} as const

const ANIMATION_DELAYS = {
  sources: [600, 750, 900, 1050],
  flowLines: 1300,
  flowDots: 1500,
  aiNode: 1700,
  flowDown: 2200,
  flowDotDown: 2400,
  outputCard: 2600,
  rows: [3200, 3500, 3800],
  chips: [4100, 4300, 4500],
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
    t(() => showElement('[data-output-card]'), ANIMATION_DELAYS.outputCard)
    ANIMATION_DELAYS.rows.forEach((d, i) => t(() => showElement(`[data-row="${i}"]`), d))
    ANIMATION_DELAYS.chips.forEach((d, i) => t(() => showElement(`[data-chip="${i}"]`), d))

    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion, showElement, showAll])

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-0 relative py-4">

      {/* ─── Niveau 3: Input source badges ─── */}
      <div className="grid grid-cols-2 gap-3 w-[380px] mb-6">
        {SOURCE_BADGES.map((src, i) => (
          <div
            key={src.id}
            data-animate
            data-src={i}
            className={`hero-animate-drop flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium backdrop-blur-sm border ${src.bg} ${src.border}`}
          >
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0 ${src.iconBg}`}>
              {src.icon}
            </span>
            <span className={`${src.textColor} truncate`}>{src.text}</span>
          </div>
        ))}
      </div>

      {/* ─── Flow lines (sources → AI) ─── */}
      <div className="relative w-[140px] h-10 mb-0">
        {[
          { left: '20%', gradient: 'from-green-500/30 to-violet-500/15' },
          { left: '40%', gradient: 'from-red-500/25 to-violet-500/15' },
          { left: '60%', gradient: 'from-purple-500/30 to-violet-500/15' },
          { left: '80%', gradient: 'from-amber-400/25 to-violet-500/15' },
        ].map((line, i) => (
          <div
            key={`line-${i}`}
            data-animate
            data-flow-line
            className={`hero-animate-fade absolute w-px h-full bg-gradient-to-b ${line.gradient}`}
            style={{ left: line.left }}
          />
        ))}
        {[
          { left: '20%', color: 'bg-green-500', delay: '0s' },
          { left: '40%', color: 'bg-red-500', delay: '0.4s' },
          { left: '60%', color: 'bg-purple-500', delay: '0.8s' },
          { left: '80%', color: 'bg-amber-400', delay: '1.2s' },
        ].map((dot, i) => (
          <div
            key={`dot-${i}`}
            data-animate
            data-flow-dot
            className={`hero-animate-fade absolute w-1 h-1 rounded-full ${dot.color} hero-flow-dot-active`}
            style={{ left: dot.left, animationDelay: dot.delay }}
          />
        ))}
      </div>

      {/* ─── Niveau 2: AI Node ─── */}
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
          <div className="text-xs text-white/40 mt-0.5">Analyse et organise</div>
        </div>
      </div>

      {/* ─── Flow line (AI → output) ─── */}
      <div
        data-animate
        data-flow-down
        className="hero-animate-fade relative w-px h-9 bg-gradient-to-b from-violet-500/20 to-blue-400/15"
      >
        <div
          data-animate
          data-flow-dot-down
          className="hero-animate-fade absolute left-[-1.5px] w-1 h-1 rounded-full bg-violet-400 hero-flow-dot-active"
          style={{ animationDelay: '0.6s' }}
        />
      </div>

      {/* ─── Niveau 1: Output intervention card ─── */}
      <div
        data-animate
        data-output-card
        className="hero-animate-slide-up w-[420px] bg-slate-900/60 border border-blue-400/10 rounded-2xl p-5 px-6 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.03)]"
      >
        {/* Card header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-base font-bold text-white/90">Fuite salle de bain</div>
              <div className="text-sm text-white/40 mt-0.5">Résidence Les Marronniers · Apt 3B</div>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-blue-400/[0.12] text-blue-400">
            Planifiée
          </span>
        </div>

        {/* Detail rows */}
        <div className="flex flex-col gap-2.5 pt-3 border-t border-white/[0.06]">
          {DETAIL_ROWS.map((row, i) => (
            <div
              key={i}
              data-animate
              data-row={i}
              className="hero-animate-slide-left flex items-center gap-2.5"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                row.icon === 'done' ? 'bg-emerald-400/[0.12]' : 'bg-amber-400/[0.12]'
              }`}>
                {row.icon === 'done' ? (
                  <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
                ) : (
                  <Clock className="w-3 h-3 text-amber-400" strokeWidth={2.5} />
                )}
              </div>
              <span className="text-sm text-white/60">
                <strong className="text-white/80 font-semibold">{row.label}</strong> · {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Context enrichment chips */}
        <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/[0.06]">
          <div className="text-xs font-semibold text-blue-400/50 tracking-wider uppercase">
            Contexte existant rattaché
          </div>
          <div className="flex flex-wrap gap-2">
            {CONTEXT_CHIPS.map((chip, i) => {
              const styles = CHIP_STYLES[chip.type]
              return (
                <div
                  key={i}
                  data-animate
                  data-chip={i}
                  className={`hero-animate-slide-right inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${styles.bg} ${styles.border}`}
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-xs shrink-0 ${styles.iconBg}`}>
                    {chip.icon}
                  </span>
                  <span className={styles.text}>{chip.text}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI created badge */}
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-violet-500/[0.08] border border-violet-500/10 text-xs font-medium text-violet-400/60">
          <FileText className="w-3.5 h-3.5" />
          Créé automatiquement par l&apos;assistant IA
        </div>
      </div>
    </div>
  )
})
