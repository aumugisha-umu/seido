import { cn } from "@/lib/utils"

interface SummaryMetric {
  label: string
  value: string | number
  icon?: React.ReactNode
  highlight?: boolean
}

interface ConfirmationSummaryBannerProps {
  metrics: SummaryMetric[]
  className?: string
}

export function ConfirmationSummaryBanner({ metrics, className }: ConfirmationSummaryBannerProps) {
  return (
    <div className={cn(
      "grid gap-px rounded-xl overflow-hidden border bg-border",
      metrics.length <= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4",
      className
    )}>
      {metrics.map((m, i) => (
        <div key={i} className={cn("flex flex-col gap-0.5 px-4 py-3", m.highlight ? "bg-primary/5" : "bg-card")}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {m.icon}
            <span>{m.label}</span>
          </div>
          <span className={cn("text-lg font-semibold tabular-nums", m.highlight ? "text-primary" : "text-foreground")}>
            {m.value}
          </span>
        </div>
      ))}
    </div>
  )
}
