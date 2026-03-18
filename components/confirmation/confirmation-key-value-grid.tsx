import { cn } from "@/lib/utils"

interface KeyValuePair {
  label: string
  value: React.ReactNode
  empty?: boolean
  fullWidth?: boolean
}

interface ConfirmationKeyValueGridProps {
  pairs: KeyValuePair[]
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function ConfirmationKeyValueGrid({ pairs, columns = 2, className }: ConfirmationKeyValueGridProps) {
  return (
    <div className={cn(
      "grid gap-x-6 gap-y-3",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 sm:grid-cols-2",
      columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {pairs.map((pair, i) => (
        <div key={i} className={cn("min-w-0", pair.fullWidth && "col-span-full")}>
          <dt className="text-xs font-medium text-muted-foreground mb-0.5">{pair.label}</dt>
          <dd className={cn("text-sm break-words", pair.empty ? "text-muted-foreground/60 italic" : "text-foreground font-medium")}>
            {pair.empty ? "Non renseigne" : (pair.value ?? "Non renseigne")}
          </dd>
        </div>
      ))}
    </div>
  )
}
