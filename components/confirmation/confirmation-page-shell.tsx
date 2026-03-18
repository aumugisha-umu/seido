import { cn } from "@/lib/utils"

interface ConfirmationPageShellProps {
  children: React.ReactNode
  maxWidth?: "3xl" | "5xl" | "7xl"
  className?: string
}

export function ConfirmationPageShell({
  children,
  maxWidth = "5xl",
  className,
}: ConfirmationPageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 py-6 space-y-5 bg-white rounded-2xl border border-border/50 shadow-sm",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-300",
        maxWidth === "3xl" && "max-w-3xl",
        maxWidth === "5xl" && "max-w-5xl",
        maxWidth === "7xl" && "max-w-7xl",
        className
      )}
    >
      {children}
    </div>
  )
}
