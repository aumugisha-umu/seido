import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface FinancialLine {
  label: string
  value: string
  empty?: boolean
  muted?: boolean
}

interface ConfirmationFinancialHighlightProps {
  title: string
  icon?: LucideIcon
  lines: FinancialLine[]
  totalLabel?: string
  totalValue?: string
  className?: string
}

export function ConfirmationFinancialHighlight({
  title, icon: Icon, lines, totalLabel, totalValue, className,
}: ConfirmationFinancialHighlightProps) {
  return (
    <div className={cn("rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h4 className="text-sm font-semibold text-primary">{title}</h4>
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className={cn("text-sm", line.muted ? "text-muted-foreground" : "text-foreground")}>{line.label}</span>
            <span className={cn("text-sm tabular-nums text-right font-medium", line.empty && "text-muted-foreground/60 italic")}>
              {line.empty ? "Non renseigne" : line.value}
            </span>
          </div>
        ))}
      </div>
      {totalLabel && totalValue && (
        <>
          <Separator className="bg-primary/20" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{totalLabel}</span>
            <span className="text-xl font-bold text-primary tabular-nums">{totalValue}</span>
          </div>
        </>
      )}
    </div>
  )
}
