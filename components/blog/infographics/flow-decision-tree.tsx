'use client'

import { useMemo, useState } from 'react'
import { HelpCircle, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useScrollReveal } from './use-scroll-reveal'
import type { FlowTreeConfig } from './types'

interface FlowDecisionTreeProps {
  config: FlowTreeConfig
}

interface LayoutNode {
  id: string
  label: string
  type: 'question' | 'action' | 'result' | 'warning'
  level: number
  bfsIndex: number
}

interface LayoutEdge {
  from: string
  to: string
  label?: string
  type: 'yes' | 'no' | 'default'
}

/* ─── Layout: BFS levels from root ─── */

function buildLevels(
  nodes: FlowTreeConfig['data']['nodes'],
  edges: FlowTreeConfig['data']['edges']
): Map<number, LayoutNode[]> {
  const incomingCount = new Map<string, number>()
  for (const node of nodes) incomingCount.set(node.id, 0)
  for (const edge of edges) {
    incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1)
  }

  const root = nodes.find(n => (incomingCount.get(n.id) ?? 0) === 0) ?? nodes[0]

  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    const children = adjacency.get(edge.from) ?? []
    children.push(edge.to)
    adjacency.set(edge.from, children)
  }

  const visited = new Set<string>()
  const queue: Array<{ id: string; level: number }> = [{ id: root.id, level: 0 }]
  visited.add(root.id)

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const levels = new Map<number, LayoutNode[]>()
  let bfsIndex = 0

  while (queue.length > 0) {
    const { id, level } = queue.shift()!
    const node = nodeMap.get(id)
    if (!node) continue

    const layoutNode: LayoutNode = { ...node, level, bfsIndex }
    bfsIndex++

    const levelNodes = levels.get(level) ?? []
    levelNodes.push(layoutNode)
    levels.set(level, levelNodes)

    const children = adjacency.get(id) ?? []
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId)
        queue.push({ id: childId, level: level + 1 })
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const maxLevel = Math.max(...Array.from(levels.keys()), 0)
      const layoutNode: LayoutNode = { ...node, level: maxLevel + 1, bfsIndex }
      bfsIndex++
      const levelNodes = levels.get(maxLevel + 1) ?? []
      levelNodes.push(layoutNode)
      levels.set(maxLevel + 1, levelNodes)
    }
  }

  return levels
}

/* ─── Node styling ─── */

const NODE_STYLES: Record<string, { base: string; hover: string; glow: string }> = {
  question: {
    base: 'border-blue-500/50 bg-blue-500/10 text-blue-200',
    hover: 'border-blue-500 bg-blue-500/20 text-blue-100',
    glow: 'shadow-[0_0_16px_rgba(59,130,246,0.3)]',
  },
  action: {
    base: 'border-white/20 bg-white/5 text-white/90',
    hover: 'border-white/40 bg-white/10 text-white',
    glow: 'shadow-[0_0_16px_rgba(255,255,255,0.1)]',
  },
  result: {
    base: 'border-l-4 border-l-emerald-500 border-white/10 bg-emerald-500/5 text-emerald-300',
    hover: 'border-l-4 border-l-emerald-400 border-white/20 bg-emerald-500/15 text-emerald-200',
    glow: 'shadow-[0_0_16px_rgba(16,185,129,0.3)]',
  },
  warning: {
    base: 'border-l-4 border-l-amber-500 border-white/10 bg-amber-500/5 text-amber-300',
    hover: 'border-l-4 border-l-amber-400 border-white/20 bg-amber-500/15 text-amber-200',
    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.3)]',
  },
}

const EDGE_LABEL_COLORS: Record<string, string> = {
  yes: 'text-emerald-400',
  no: 'text-red-400',
  default: 'text-white/50',
}

function NodeIcon({ type, size = 16 }: { type: string; size?: number }) {
  if (type === 'question') return <HelpCircle size={size} className="shrink-0 text-blue-400" />
  if (type === 'result') return <CheckCircle2 size={size} className="shrink-0 text-emerald-400" />
  if (type === 'warning') return <AlertTriangle size={size} className="shrink-0 text-amber-400" />
  return <ArrowRight size={size} className="shrink-0 text-white/40" />
}

/* ─── Helper: connected node ids ─── */

function getConnectedIds(nodeId: string, edges: LayoutEdge[]): Set<string> {
  const ids = new Set<string>()
  ids.add(nodeId)
  for (const edge of edges) {
    if (edge.from === nodeId) ids.add(edge.to)
    if (edge.to === nodeId) ids.add(edge.from)
  }
  return ids
}

/* ─── Desktop: Grid-based tree ─── */

function DesktopTree({
  levels,
  edges,
  isVisible,
}: {
  levels: Map<number, LayoutNode[]>
  edges: LayoutEdge[]
  isVisible: boolean
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const connectedIds = useMemo(
    () => hoveredId ? getConnectedIds(hoveredId, edges) : new Set<string>(),
    [hoveredId, edges]
  )

  const sortedLevels = Array.from(levels.entries()).sort(([a], [b]) => a - b)
  const edgeMap = new Map<string, LayoutEdge[]>()
  for (const edge of edges) {
    const fromEdges = edgeMap.get(edge.from) ?? []
    fromEdges.push(edge)
    edgeMap.set(edge.from, fromEdges)
  }

  return (
    <div className="flex flex-col items-center gap-0">
      {sortedLevels.map(([level, nodes], levelIdx) => {
        const outgoingEdges = nodes.flatMap(n => edgeMap.get(n.id) ?? [])

        return (
          <div key={level}>
            {/* Node row */}
            <div className="flex justify-center gap-6">
              {nodes.map(node => {
                const style = NODE_STYLES[node.type]
                const isHovered = hoveredId === node.id
                const isConnected = connectedIds.has(node.id)
                const isDimmed = hoveredId !== null && !isConnected

                return (
                  <div
                    key={node.id}
                    className={`
                      rounded-lg border px-4 py-3 min-h-[48px] max-w-[240px] text-center cursor-default
                      flex items-center justify-center
                      hero-animate-scale ${isVisible ? 'hero-visible' : ''}
                      transition-all duration-300
                      ${isHovered ? `${style.hover} ${style.glow} scale-110` : style.base}
                      ${isDimmed ? 'opacity-30 scale-95' : ''}
                    `}
                    style={{ transitionDelay: `${(node.bfsIndex + 1) * 150}ms` }}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <NodeIcon type={node.type} size={isHovered ? 18 : 16} />
                      <span className={`leading-snug transition-all duration-300 ${isHovered ? 'text-base font-medium' : 'text-sm'}`}>
                        {node.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Connector row between levels */}
            {levelIdx < sortedLevels.length - 1 && outgoingEdges.length > 0 && (
              <div className="flex justify-center gap-10 py-1.5">
                {outgoingEdges.map((edge, edgeIdx) => {
                  const isEdgeActive = hoveredId !== null && (connectedIds.has(edge.from) && connectedIds.has(edge.to))
                  return (
                    <div
                      key={`${edge.from}-${edge.to}-${edgeIdx}`}
                      className={`flex flex-col items-center transition-opacity duration-300 ${
                        hoveredId !== null && !isEdgeActive ? 'opacity-20' : ''
                      }`}
                    >
                      <div className={`w-px h-5 transition-colors duration-300 ${isEdgeActive ? 'bg-white/40' : 'bg-white/15'}`} />
                      {edge.label && (
                        <span className={`text-xs font-medium ${EDGE_LABEL_COLORS[edge.type ?? 'default']}`}>
                          {edge.label}
                        </span>
                      )}
                      <div className={`w-px h-5 transition-colors duration-300 ${isEdgeActive ? 'bg-white/40' : 'bg-white/15'}`} />
                      <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] transition-colors duration-300 ${
                        isEdgeActive ? 'border-t-white/40' : 'border-t-white/20'
                      }`} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Mobile: Linear vertical stack ─── */

function MobileTree({
  levels,
  edges,
  isVisible,
}: {
  levels: Map<number, LayoutNode[]>
  edges: LayoutEdge[]
  isVisible: boolean
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const sortedLevels = Array.from(levels.entries()).sort(([a], [b]) => a - b)

  const incomingEdgeMap = new Map<string, LayoutEdge>()
  for (const edge of edges) {
    incomingEdgeMap.set(edge.to, edge)
  }

  const flatNodes: LayoutNode[] = sortedLevels.flatMap(([, nodes]) => nodes)

  return (
    <div className="relative pl-5">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/10" />

      <div className="space-y-4">
        {flatNodes.map(node => {
          const incomingEdge = incomingEdgeMap.get(node.id)
          const indent = node.level * 16
          const style = NODE_STYLES[node.type]
          const isExpanded = expandedId === node.id

          return (
            <div key={node.id} style={{ marginLeft: indent }}>
              {incomingEdge?.label && (
                <div className={`text-xs font-medium mb-1 ml-1 ${EDGE_LABEL_COLORS[incomingEdge.type ?? 'default']}`}>
                  {incomingEdge.label} ↓
                </div>
              )}

              <div
                className={`
                  rounded-lg border px-4 py-3 min-h-[48px] cursor-pointer
                  flex items-center
                  hero-animate-scale ${isVisible ? 'hero-visible' : ''}
                  transition-all duration-300
                  ${isExpanded ? `${style.hover} ${style.glow}` : style.base}
                `}
                style={{ transitionDelay: `${(node.bfsIndex + 1) * 150}ms` }}
                onClick={() => setExpandedId(isExpanded ? null : node.id)}
              >
                <div className="flex items-center gap-2">
                  <NodeIcon type={node.type} size={isExpanded ? 18 : 16} />
                  <span className={`leading-snug transition-all duration-300 ${isExpanded ? 'text-base font-medium' : 'text-sm'}`}>
                    {node.label}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Main Component ─── */

export default function FlowDecisionTree({ config }: FlowDecisionTreeProps) {
  const { ref, isVisible } = useScrollReveal()
  const { title, nodes, edges: rawEdges } = config.data

  const edges: LayoutEdge[] = useMemo(
    () => rawEdges.map(e => ({ ...e, type: e.type ?? 'default' })),
    [rawEdges]
  )

  const levels = useMemo(() => buildLevels(nodes, rawEdges), [nodes, rawEdges])

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

      <div className="hidden md:block">
        <DesktopTree levels={levels} edges={edges} isVisible={isVisible} />
      </div>

      <div className="md:hidden">
        <MobileTree levels={levels} edges={edges} isVisible={isVisible} />
      </div>
    </div>
  )
}
