import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface ContactItem {
  id: string
  name: string
  email?: string
  sublabel?: string
}

interface ContactTypeGroup {
  type: string
  contacts: ContactItem[]
  icon?: React.ReactNode
  emptyLabel?: string
}

interface ConfirmationContactGridProps {
  groups: ContactTypeGroup[]
  columns?: 2 | 4 | 5
  className?: string
}

export function ConfirmationContactGrid({ groups, columns = 4, className }: ConfirmationContactGridProps) {
  return (
    <div className={cn(
      "grid gap-3",
      columns === 2 && "grid-cols-1 sm:grid-cols-2",
      columns === 4 && "grid-cols-2 lg:grid-cols-4",
      columns === 5 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
      className
    )}>
      {groups.map((group, i) => (
        <div key={i} className="rounded-lg border bg-muted/30 p-3 space-y-2 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground shrink-0">{group.icon ?? <Users className="h-3.5 w-3.5" />}</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{group.type}</span>
            {group.contacts.length > 0 && (
              <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 shrink-0">{group.contacts.length}</Badge>
            )}
          </div>
          {group.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 italic">{group.emptyLabel ?? "Aucun"}</p>
          ) : (
            <ul className="space-y-1.5">
              {group.contacts.map((c) => (
                <li key={c.id} className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">{c.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {(c.email || c.sublabel) && (
                      <p className="text-[11px] text-muted-foreground truncate">{c.sublabel || c.email}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
