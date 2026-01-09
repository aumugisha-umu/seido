"use client"

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface OnboardingSlideProps {
    /** Lucide icon component */
    icon: LucideIcon
    /** Main title of the slide */
    title: string
    /** Optional subtitle */
    subtitle?: string
    /** Main description or message */
    description: string
    /** Bullet points to display */
    bulletPoints?: string[]
    /** Highlight text (displayed differently) */
    highlight?: string
    /** Background color class for the icon container */
    iconBgClass?: string
    /** Icon color class */
    iconColorClass?: string
}

export function OnboardingSlide({
    icon: Icon,
    title,
    subtitle,
    description,
    bulletPoints,
    highlight,
    iconBgClass = "bg-primary/10",
    iconColorClass = "text-primary"
}: OnboardingSlideProps) {
    return (
        <div className="flex flex-col items-center text-center px-4 py-6 space-y-6">
            {/* Icon Container */}
            <div className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center",
                iconBgClass
            )}>
                <Icon className={cn("w-10 h-10", iconColorClass)} />
            </div>

            {/* Text Content */}
            <div className="space-y-3 max-w-md">
                <h2 className="text-2xl font-bold text-foreground">
                    {title}
                </h2>

                {subtitle && (
                    <p className="text-lg text-muted-foreground">
                        {subtitle}
                    </p>
                )}

                <p className="text-base text-muted-foreground leading-relaxed">
                    {description}
                </p>

                {/* Bullet Points */}
                {bulletPoints && bulletPoints.length > 0 && (
                    <ul className="text-left space-y-2 pt-2">
                        {bulletPoints.map((point, index) => (
                            <li
                                key={index}
                                className="flex items-start gap-2 text-base text-muted-foreground"
                            >
                                <span className="text-primary mt-0.5 text-lg" aria-hidden="true">•</span>
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Highlight - WCAG AA compliant (min 16px) */}
                {highlight && (
                    <p className="text-base text-primary font-medium pt-2 bg-primary/5 rounded-lg px-4 py-3">
                        {highlight}
                    </p>
                )}
            </div>
        </div>
    )
}
