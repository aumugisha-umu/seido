import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ConfirmationSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  compact?: boolean
  card?: boolean
  className?: string
}

export function ConfirmationSection({ title, icon, children, compact, card, className }: ConfirmationSectionProps) {
  return (
    <div className={cn("space-y-3", card && "rounded-xl border bg-card p-5", className)}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{title}</h3>
        <Separator className="flex-1" />
      </div>
      <div className={compact ? "space-y-2" : "space-y-3"}>{children}</div>
    </div>
  )
}
