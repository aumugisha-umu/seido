'use client'

/**
 * 📊 Stats Section - SEIDO Landing Page
 *
 * Section avec chiffres clés animés au scroll
 * - 500+ lots gérés
 * - 90 min gagnés/jour
 * - 98% satisfaction
 * - 2400+ interventions
 *
 * Utilise useIntersectionObserver + useCounterAnimation pour animations performantes
 */

import { useRef } from 'react'
import { Building2, Clock, TrendingUp, Zap } from 'lucide-react'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { useCounterAnimation } from '@/hooks/use-counter-animation'

interface StatCardProps {
  icon: React.ReactNode
  number: number
  suffix: string
  label: string
  description: string
  isVisible: boolean
}

function StatCard({ icon, number, suffix, label, description, isVisible }: StatCardProps) {
  const animatedNumber = useCounterAnimation(number, 2000, 0, isVisible)

  return (
    <div
      className={`
        text-center p-6 rounded-xl bg-white border border-gray-200 shadow-md
        hover:shadow-xl hover:-translate-y-1
        transition-all duration-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
      style={{
        transitionDelay: isVisible ? '0ms' : '0ms'
      }}
    >
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-lg bg-brand-purple/10">
        <div className="text-brand-purple">
          {icon}
        </div>
      </div>

      {/* Number */}
      <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-1 tabular-nums">
        {animatedNumber}{suffix}
      </div>

      {/* Label */}
      <div className="text-sm font-medium text-brand-purple mb-2">
        {label}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600">
        {description}
      </p>
    </div>
  )
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isVisible = useIntersectionObserver(ref)

  return (
    <section ref={ref} className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Des résultats qui parlent d'eux-mêmes
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Rejoignez des centaines de gestionnaires qui ont déjà transformé leur quotidien
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <StatCard
            icon={<Building2 className="w-6 h-6" />}
            number={500}
            suffix="+"
            label="Lots gérés"
            description="Appartements, maisons, commerces"
            isVisible={isVisible}
          />

          <StatCard
            icon={<Clock className="w-6 h-6" />}
            number={90}
            suffix=" min"
            label="Gagnés par jour"
            description="Temps moyen économisé"
            isVisible={isVisible}
          />

          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            number={98}
            suffix="%"
            label="Satisfaction"
            description="Locataires et gestionnaires"
            isVisible={isVisible}
          />

          <StatCard
            icon={<Zap className="w-6 h-6" />}
            number={2400}
            suffix="+"
            label="Interventions"
            description="Traitées chaque mois"
            isVisible={isVisible}
          />
        </div>
      </div>
    </section>
  )
}
