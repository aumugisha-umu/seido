"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  /**
   * Icon to display (Lucide icon component)
   */
  icon: LucideIcon

  /**
   * Primary value to display (number or string)
   */
  value: string | number

  /**
   * Label/description of the stat
   */
  label: string

  /**
   * Optional icon background color
   * @default "blue"
   */
  iconColor?: "blue" | "green" | "purple" | "orange" | "red" | "gray"

  /**
   * Optional custom className
   */
  className?: string
}

const iconColorClasses = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
  gray: "bg-gray-50 text-gray-600",
}

/**
 * StatCard - Composant réutilisable pour afficher une statistique
 *
 * Design ultra-compact inspiré du dashboard V2:
 * - Hauteur minimale (~60px)
 * - Layout horizontal icône + texte
 * - Pas de couleurs vives (fond neutre)
 * - Responsive et accessible
 */
export function StatCard({
  icon: Icon,
  value,
  label,
  iconColor = "blue",
  className
}: StatCardProps) {
  return (
    <Card className={cn("shadow-sm border-gray-200 py-4 gap-0", className)}>
      <CardContent className="px-4 py-0 flex items-center justify-center">
        <div className="flex gap-2 items-center">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            iconColorClasses[iconColor]
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">{value}</div>
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
