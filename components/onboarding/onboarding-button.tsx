"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { OnboardingModal } from "./onboarding-modal"
import { cn } from "@/lib/utils"

interface OnboardingButtonProps {
    className?: string
}

export function OnboardingButton({ className }: OnboardingButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    // Le bouton est toujours visible - permet de revoir le guide à tout moment

    return (
        <>
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsOpen(true)}
                            className={cn(
                                "gap-2 text-muted-foreground hover:text-foreground",
                                className
                            )}
                        >
                            <HelpCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Guide</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Découvrir SEIDO</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <OnboardingModal
                open={isOpen}
                onOpenChange={setIsOpen}
                forceShow
            />
        </>
    )
}
