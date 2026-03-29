/* ============================================
 * Blog Infographic Types
 * Defines config interfaces for all 7 infographic types.
 * Parsed from YAML frontmatter in blog articles.
 * ============================================ */

export interface TimelineConfig {
  type: 'timeline'
  data: {
    title?: string
    milestones: Array<{
      date: string
      label: string
      detail?: string
      actions?: string[]
      color?: 'red' | 'blue' | 'green' | 'amber'
      icon?: 'alert' | 'check' | 'clock' | 'calendar'
    }>
    zones?: Array<{
      from: number
      to: number
      label: string
      color: 'red' | 'blue'
    }>
  }
}

export interface ComparisonBarsConfig {
  type: 'comparison-bars'
  data: {
    title?: string
    items: Array<{
      label: string
      value: number
      suffix?: string
      prefix?: string
      color?: 'red' | 'blue' | 'green' | 'amber'
      highlight?: boolean
    }>
    direction?: 'horizontal' | 'vertical'
    showValues?: boolean
    baselineLabel?: string
    baselineValue?: number
  }
}

export interface FlowTreeConfig {
  type: 'flow-tree'
  data: {
    title?: string
    nodes: Array<{
      id: string
      label: string
      type: 'question' | 'action' | 'result' | 'warning'
    }>
    edges: Array<{
      from: string
      to: string
      label?: string
      type?: 'yes' | 'no' | 'default'
    }>
  }
}

export interface ChecklistConfig {
  type: 'checklist'
  data: {
    title?: string
    deadline?: { date: string; label: string }
    items: Array<{
      label: string
      status: 'required' | 'done' | 'warning' | 'info'
      detail?: string
    }>
  }
}

export interface StatHighlightConfig {
  type: 'stat-highlight'
  data: {
    title?: string
    stats: Array<{
      value: number
      prefix?: string
      suffix?: string
      label: string
      color?: 'blue' | 'red' | 'green' | 'amber'
    }>
  }
}

export interface DataTableConfig {
  type: 'data-table'
  data: {
    title?: string
    caption?: string
    headers: string[]
    rows: Array<{
      cells: string[]
      highlight?: boolean
      color?: string
    }>
    footer?: string
  }
}

export type InfographicConfig =
  | TimelineConfig
  | ComparisonBarsConfig
  | FlowTreeConfig
  | ChecklistConfig
  | StatHighlightConfig
  | DataTableConfig
