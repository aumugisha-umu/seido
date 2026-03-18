import { Badge } from "@/components/ui/badge"
import { CheckCircle2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfirmationEntityHeaderProps {
  icon: LucideIcon
  iconColor?: "primary" | "blue" | "green" | "purple" | "amber" | "red"
  title: string
  subtitle?: string
  badges?: Array<{ label: string; variant?: "default" | "secondary" | "outline"; className?: string }>
  className?: string
}

const iconColors = {
  primary: "bg-primary/10 text-primary",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  purple: "bg-purple-100 text-purple-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
} as const

export function ConfirmationEntityHeader({
  icon: Icon,
  iconColor = "primary",
  title,
  subtitle,
  badges = [],
  className,
}: ConfirmationEntityHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start gap-4", className)}>
      <div className={cn("shrink-0 h-12 w-12 rounded-xl flex items-center justify-center", iconColors[iconColor])}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h2 className="text-xl font-semibold text-foreground truncate">{title}</h2>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1 shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            Pret a confirmer
          </Badge>
        </div>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {badges.map((b, i) => (
              <Badge key={i} variant={b.variant ?? "outline"} className={cn("text-xs", b.className)}>
                {b.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
