'use client'

import { lazy, Suspense } from 'react'
import type { InfographicConfig } from './types'

const TimelineChart = lazy(() => import('./timeline-chart'))
const ComparisonBars = lazy(() => import('./comparison-bars'))
const FlowDecisionTree = lazy(() => import('./flow-decision-tree'))
const ChecklistTracker = lazy(() => import('./checklist-tracker'))
const StatHighlight = lazy(() => import('./stat-highlight'))
const DataTable = lazy(() => import('./data-table'))

interface BlogInfographicProps {
  config: InfographicConfig
}

const COMPONENT_MAP = {
  'timeline': TimelineChart,
  'comparison-bars': ComparisonBars,
  'flow-tree': FlowDecisionTree,
  'checklist': ChecklistTracker,
  'stat-highlight': StatHighlight,
  'data-table': DataTable,
} as const

export function BlogInfographic({ config }: BlogInfographicProps) {
  const Component = COMPONENT_MAP[config.type]

  if (!Component) return null

  return (
    <Suspense fallback={<InfographicSkeleton />}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Component config={config as any} />
    </Suspense>
  )
}

function InfographicSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8 animate-pulse">
      <div className="h-4 w-32 bg-white/10 rounded mb-6" />
      <div className="h-48 bg-white/5 rounded-lg" />
    </div>
  )
}
