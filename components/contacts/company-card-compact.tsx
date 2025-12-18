"use client"

import { Card } from '@/components/ui/card'
import { Building2, Mail, MapPin, Phone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface CompanyCardCompactProps {
    company: {
        id: string
        name: string
        vat_number?: string | null
        email?: string | null
        phone?: string | null
        city?: string | null
        address?: string | null
    }
    onClick?: () => void
}

export function CompanyCardCompact({ company, onClick }: CompanyCardCompactProps) {
    const router = useRouter()

    // BEM Classes
    const blockClass = "company-card"

    const handleCardClick = () => {
        if (onClick) {
            onClick()
        } else {
            router.push(`/gestionnaire/contacts/societes/${company.id}`)
        }
    }

    return (
        <Card
            className={cn(
                blockClass,
                "p-4 flex flex-col h-full cursor-pointer",
                // Hover
                "hover:shadow-md hover:border-primary/30",
                // Transition
                "transition-all duration-200",
                // Focus visible (WCAG 2.1 AA)
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                // Dark mode
                "bg-white dark:bg-card dark:hover:bg-accent/50"
            )}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            aria-label={`Société: ${company.name}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleCardClick()
                }
            }}
        >
            {/* Header */}
            <div className={cn(`${blockClass}__header`, "flex items-center gap-3 mb-3")}>
                <div className={cn(
                    `${blockClass}__icon`,
                    "w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0"
                )}>
                    <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className={cn(`${blockClass}__info`, "min-w-0 flex-1")}>
                    <h3 className={cn(`${blockClass}__name`, "font-medium text-foreground truncate")}>
                        {company.name}
                    </h3>
                    {company.vat_number && (
                        <p className={cn(`${blockClass}__vat`, "text-xs text-muted-foreground")}>
                            {company.vat_number}
                        </p>
                    )}
                </div>
            </div>

            {/* Details */}
            <div className={cn(`${blockClass}__details`, "space-y-1.5 text-sm text-muted-foreground flex-1")}>
                {company.email && (
                    <div className={cn(`${blockClass}__detail`, "flex items-center gap-2")}>
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{company.email}</span>
                    </div>
                )}
                {company.phone && (
                    <div className={cn(`${blockClass}__detail`, "flex items-center gap-2")}>
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{company.phone}</span>
                    </div>
                )}
                {(company.city || company.address) && (
                    <div className={cn(`${blockClass}__detail`, "flex items-center gap-2")}>
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{company.address || company.city}</span>
                    </div>
                )}
            </div>
        </Card>
    )
}
