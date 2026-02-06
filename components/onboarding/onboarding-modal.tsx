"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    UnifiedModal,
    UnifiedModalBody,
} from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"
import {
    Sparkles,
    Building2,
    Wrench,
    Users,
    Upload,
    ChevronLeft,
    ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OnboardingSlide } from "./onboarding-slide"
import { useNotificationPromptContext } from "@/contexts/notification-prompt-context"

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "seido_onboarding_completed"
const ONBOARDING_VERSION = "1.0"

interface OnboardingData {
    completedAt: string
    version: string
}

// ============================================================================
// SLIDE CONTENT
// ============================================================================

interface SlideData {
    id: string
    icon: typeof Sparkles
    title: string
    subtitle?: string
    description: string
    bulletPoints?: string[]
    highlight?: string
    iconBgClass: string
    iconColorClass: string
}

const SLIDES: SlideData[] = [
    {
        id: "welcome",
        icon: Sparkles,
        title: "Bienvenue sur SEIDO",
        subtitle: "Votre gestion immobilière, simplifiée",
        description: "Gérez votre patrimoine, vos interventions et vos contacts depuis un seul endroit. Fini les 5 outils qui ne se parlent pas.",
        iconBgClass: "bg-amber-100 dark:bg-amber-900/30",
        iconColorClass: "text-amber-600 dark:text-amber-400"
    },
    {
        id: "patrimoine",
        icon: Building2,
        title: "Votre patrimoine en un coup d'œil",
        description: "Centralisez toutes les informations de vos biens immobiliers.",
        bulletPoints: [
            "Immeubles, lots et occupants centralisés",
            "Documents liés à chaque bien, intervention ou contact"
        ],
        iconBgClass: "bg-blue-100 dark:bg-blue-900/30",
        iconColorClass: "text-blue-600 dark:text-blue-400"
    },
    {
        id: "interventions",
        icon: Wrench,
        title: "Suivez chaque intervention en temps réel",
        description: "De la demande à la clôture, gardez le contrôle total.",
        bulletPoints: [
            "Créez des demandes en 30 secondes",
            "Affectez un prestataire en 1 clic",
            "Timeline complète : du signalement à la clôture",
            "Prestataires et locataires échangent directement pour se coordonner"
        ],
        highlight: "Vos locataires peuvent créer leurs demandes via leur portail",
        iconBgClass: "bg-orange-100 dark:bg-orange-900/30",
        iconColorClass: "text-orange-600 dark:text-orange-400"
    },
    {
        id: "collaboration",
        icon: Users,
        title: "Travaillez en équipe, enfin",
        description: "Partez en vacances sereinement. Votre équipe a tout sous contrôle.",
        bulletPoints: [
            "Contacts centralisés (locataires, prestataires, propriétaires)",
            "Historique complet : qui a fait quoi, quand",
            "Notifications intelligentes vers la bonne personne"
        ],
        iconBgClass: "bg-green-100 dark:bg-green-900/30",
        iconColorClass: "text-green-600 dark:text-green-400"
    },
    {
        id: "import",
        icon: Upload,
        title: "Soyez opérationnel en 5 minutes",
        description: "Téléchargez notre template Excel, remplissez vos immeubles, lots et contacts, et importez tout en une seule fois.",
        iconBgClass: "bg-purple-100 dark:bg-purple-900/30",
        iconColorClass: "text-purple-600 dark:text-purple-400"
    }
]

// ============================================================================
// COMPONENT
// ============================================================================

interface OnboardingModalProps {
    /** Controlled open state */
    open?: boolean
    /** Callback when open state changes */
    onOpenChange?: (open: boolean) => void
    /** Force show even if already completed (for manual trigger) */
    forceShow?: boolean
}

export function OnboardingModal({
    open: controlledOpen,
    onOpenChange,
    forceShow = false
}: OnboardingModalProps) {
    const router = useRouter()
    const [internalOpen, setInternalOpen] = useState(false)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [direction, setDirection] = useState<"left" | "right">("right")

    // 🎯 Coordination avec NotificationModal : attendre que le flow soit terminé
    const notificationContext = useNotificationPromptContext()
    // Fallback true si context non disponible (ex: hors du provider)
    const hasCompletedNotificationFlow = notificationContext?.hasCompletedNotificationFlow ?? true

    // Use controlled or internal state
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    // Check localStorage on mount for auto-open
    // 🎯 Attend que le flow notification soit terminé avant de s'ouvrir
    useEffect(() => {
        if (forceShow) return // Don't auto-check if force showing

        // 🎯 Attendre que le flow notification soit complet
        if (!hasCompletedNotificationFlow) return

        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            try {
                const data: OnboardingData = JSON.parse(stored)
                // Only skip if same version
                if (data.version === ONBOARDING_VERSION) {
                    return
                }
            } catch {
                // Invalid data, show onboarding
            }
        }

        // First visit or new version - auto-open with delay for smooth transition
        if (!isControlled) {
            // 🎯 Délai de 300ms pour transition fluide après fermeture modale notifications
            const timer = setTimeout(() => {
                setInternalOpen(true)
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [forceShow, isControlled, hasCompletedNotificationFlow])

    const handleOpenChange = useCallback((newOpen: boolean) => {
        if (isControlled) {
            onOpenChange?.(newOpen)
        } else {
            setInternalOpen(newOpen)
        }

        // Mark as completed when closing
        if (!newOpen) {
            const data: OnboardingData = {
                completedAt: new Date().toISOString(),
                version: ONBOARDING_VERSION
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        }
    }, [isControlled, onOpenChange])

    const goToSlide = useCallback((index: number) => {
        setDirection(index > currentSlide ? "right" : "left")
        setCurrentSlide(index)
    }, [currentSlide])

    const goNext = useCallback(() => {
        if (currentSlide < SLIDES.length - 1) {
            setDirection("right")
            setCurrentSlide(prev => prev + 1)
        }
    }, [currentSlide])

    const goPrev = useCallback(() => {
        if (currentSlide > 0) {
            setDirection("left")
            setCurrentSlide(prev => prev - 1)
        }
    }, [currentSlide])

    const handleSkip = useCallback(() => {
        handleOpenChange(false)
    }, [handleOpenChange])

    const handleComplete = useCallback(() => {
        handleOpenChange(false)
    }, [handleOpenChange])

    const handleGoToImport = useCallback(() => {
        handleOpenChange(false) // Ferme la modale + marque comme vu
        router.push('/gestionnaire/import')
    }, [handleOpenChange, router])

    // Keyboard navigation
    useEffect(() => {
        if (!open) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") {
                goNext()
            } else if (e.key === "ArrowLeft") {
                goPrev()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [open, goNext, goPrev])

    const currentSlideData = SLIDES[currentSlide]
    const isLastSlide = currentSlide === SLIDES.length - 1
    const isFirstSlide = currentSlide === 0

    return (
        <UnifiedModal
            open={open}
            onOpenChange={handleOpenChange}
            size="lg"
            showCloseButton={false}
            aria-labelledby="onboarding-title"
        >
            <UnifiedModalBody className="p-0 flex flex-col">
                {/* Accessible title for screen readers */}
                <h2 id="onboarding-title" className="sr-only">
                    Guide de découverte SEIDO
                </h2>

                {/* Scrollable slide content container */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div
                        className={cn(
                            "transition-all duration-200 ease-out",
                            direction === "right"
                                ? "animate-in slide-in-from-right-4 fade-in-0"
                                : "animate-in slide-in-from-left-4 fade-in-0"
                        )}
                        key={currentSlide}
                    >
                        <OnboardingSlide
                            icon={currentSlideData.icon}
                            title={currentSlideData.title}
                            subtitle={currentSlideData.subtitle}
                            description={currentSlideData.description}
                            bulletPoints={currentSlideData.bulletPoints}
                            highlight={currentSlideData.highlight}
                            iconBgClass={currentSlideData.iconBgClass}
                            iconColorClass={currentSlideData.iconColorClass}
                        />

                        {/* Special CTA for last slide */}
                        {isLastSlide && (
                            <div className="flex flex-col sm:flex-row gap-3 px-6 pb-2 justify-center">
                                <Button
                                    variant="outline"
                                    onClick={handleGoToImport}
                                    className="gap-2"
                                >
                                    <Upload className="h-4 w-4" />
                                    Importer mes données
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Navigation - Always visible */}
                <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-t bg-muted/30">
                    {/* Skip Button - Hidden on last slide */}
                    {!isLastSlide ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSkip}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Passer
                        </Button>
                    ) : (
                        <div className="w-10 sm:w-[60px]" /> // Spacer réduit sur mobile
                    )}

                    {/* Dots Navigation - Touch target wrapper + small visual dot */}
                    <div className="flex items-center gap-1">
                        {SLIDES.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className="p-1.5 -m-0.5"
                                aria-label={`Aller au slide ${index + 1}`}
                            >
                                <span
                                    className={cn(
                                        "block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-200",
                                        index === currentSlide
                                            ? "bg-primary w-2.5 sm:w-4"
                                            : "bg-muted-foreground/30"
                                    )}
                                />
                            </button>
                        ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-2">
                        {!isFirstSlide && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={goPrev}
                                className="gap-1"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Précédent</span>
                            </Button>
                        )}

                        {isLastSlide ? (
                            <Button
                                size="sm"
                                onClick={handleComplete}
                                className="gap-1"
                            >
                                Commencer
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={goNext}
                                className="gap-1"
                            >
                                <span className="hidden sm:inline">Suivant</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </UnifiedModalBody>
        </UnifiedModal>
    )
}

// ============================================================================
// HOOK FOR CHECKING ONBOARDING STATUS
// ============================================================================

export function useOnboardingStatus() {
    const [hasCompleted, setHasCompleted] = useState(true) // Default true to prevent flash

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            try {
                const data: OnboardingData = JSON.parse(stored)
                setHasCompleted(data.version === ONBOARDING_VERSION)
            } catch {
                setHasCompleted(false)
            }
        } else {
            setHasCompleted(false)
        }
    }, [])

    const resetOnboarding = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY)
        setHasCompleted(false)
    }, [])

    return { hasCompleted, resetOnboarding }
}
