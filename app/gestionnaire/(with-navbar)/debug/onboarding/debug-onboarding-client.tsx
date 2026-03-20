"use client"

/**
 * Debug page: Onboarding checklist rendered in all visual states.
 * Navigate to /gestionnaire/debug/onboarding to review designs.
 *
 * Shows 4 scenarios side-by-side:
 * 1. Fresh start (0/6) — first step is current
 * 2. In progress (2/6) — mid-journey
 * 3. Almost done (5/6) — last step remaining
 * 4. Full inline view — all steps expanded with tutorial content
 */

import { useState } from "react"
import {
  Home,
  Mail,
  Users,
  FileSignature,
  Wrench,
  CheckCircle2,
  Upload,
  Lightbulb,
  Zap,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { OnboardingChecklist } from "@/components/billing/onboarding-checklist"
import type { OnboardingProgress } from "@/app/actions/subscription-actions"

// =============================================================================
// Mock progress states
// =============================================================================

const SCENARIOS: { label: string; description: string; progress: OnboardingProgress }[] = [
  {
    label: "Debut — 0/6",
    description: "Nouvel utilisateur, rien fait",
    progress: {
      hasLot: false,
      hasEmail: false,
      hasContact: false,
      hasContract: false,
      hasIntervention: false,
      hasClosedIntervention: false,
      hasImportedData: false,
    },
  },
  {
    label: "En cours — 2/6",
    description: "Lot cree + contacts ajoutes",
    progress: {
      hasLot: true,
      hasEmail: false,
      hasContact: true,
      hasContract: false,
      hasIntervention: false,
      hasClosedIntervention: false,
      hasImportedData: false,
    },
  },
  {
    label: "Avance — 4/6",
    description: "Il manque email + import",
    progress: {
      hasLot: true,
      hasEmail: false,
      hasContact: true,
      hasContract: true,
      hasIntervention: true,
      hasClosedIntervention: false,
      hasImportedData: false,
    },
  },
  {
    label: "Presque fini — 5/6",
    description: "Derniere etape : import (optionnel)",
    progress: {
      hasLot: true,
      hasEmail: true,
      hasContact: true,
      hasContract: true,
      hasIntervention: true,
      hasClosedIntervention: false,
      hasImportedData: false,
    },
  },
]

// Steps data (mirrors onboarding-checklist.tsx STEPS for the inline expanded view)
const STEPS_DATA = [
  {
    id: "hasLot" as const,
    label: "Creer un lot",
    description: "Ajoutez votre premier bien immobilier",
    whyItMatters: "Le lot est la base de votre gestion. Toutes les interventions, contrats et locataires y seront ensuite rattaches.",
    howItConnects: "Vous pouvez creer un immeuble pour regrouper plusieurs lots ou les laisser independants.",
    ctaLabel: "Creer mon premier lot",
    icon: Home,
    href: "/gestionnaire/biens/lots/nouveau",
  },
  {
    id: "hasContact" as const,
    label: "Ajouter des contacts",
    description: "Invitez prestataires, locataires ou gestionnaires",
    whyItMatters: "Vos contacts sont au coeur de SEIDO. Prestataires pour les missions et devis, locataires pour signaler des problemes, gestionnaires pour collaborer. Invites a l'app, ils accedent a leur portail dedie.",
    howItConnects: "Sans invitation, le contact reste dans votre carnet d'adresses. Avec invitation, il recoit un acces a l'application et des notifications automatiques.",
    ctaLabel: "Ajouter un contact",
    icon: Users,
    href: "/gestionnaire/contacts/nouveau",
  },
  {
    id: "hasContract" as const,
    label: "Creer un contrat",
    description: "Liez un locataire a un lot",
    whyItMatters: "Le contrat formalise l'occupation d'un lot. Il permet le suivi du bail, des echeances et du taux d'occupation.",
    howItConnects: "Le locataire lie verra apparaitre le lot dans son espace et pourra y signaler des interventions.",
    ctaLabel: "Creer un contrat",
    icon: FileSignature,
    href: "/gestionnaire/contrats/nouveau",
  },
  {
    id: "hasIntervention" as const,
    label: "Creer une intervention",
    description: "Lancez votre premiere demande de travaux",
    whyItMatters: "C'est le coeur de SEIDO : suivez chaque demande du signalement a la resolution, avec historique complet.",
    howItConnects: "Le prestataire assigne sera notifie, pourra proposer des creneaux et envoyer un devis.",
    ctaLabel: "Créer une intervention",
    icon: Wrench,
    href: "/gestionnaire/operations/nouvelle-intervention",
  },
  {
    id: "hasEmail" as const,
    label: "Connecter votre email",
    description: "Reliez votre boite mail professionnelle",
    whyItMatters: "En connectant votre email, vous centralisez toutes vos communications dans SEIDO. Fini les allers-retours entre votre boite mail et votre outil de gestion.",
    howItConnects: "Les emails lies aux interventions et aux contacts apparaitront directement dans SEIDO, avec historique complet.",
    ctaLabel: "Connecter mon email",
    icon: Mail,
    href: "/gestionnaire/parametres/emails",
  },
  {
    id: "hasImportedData" as const,
    label: "Importer vos donnees",
    description: "Importez lots, contacts et contrats en une seule fois",
    whyItMatters: "Dans la section Import, telechargez notre template Excel, remplissez-le avec vos donnees existantes et importez tout en un clic. En cas de souci pendant l'upload, envoyez simplement le fichier au support et nous ferons l'import pour vous.",
    howItConnects: "Vous pouvez aussi passer cette etape et ajouter vos biens, contacts et contrats manuellement depuis les differentes sections de l'application.",
    ctaLabel: "Acceder a l'import",
    icon: Upload,
    href: "/gestionnaire/import",
    optional: true,
    skipLabel: "Je prefere ajouter manuellement",
  },
]

// =============================================================================
// Component
// =============================================================================

export default function DebugOnboardingClient() {
  const [activeScenario, setActiveScenario] = useState(0)

  return (
    <div className="min-h-screen bg-muted/30 p-6 space-y-10">
      {/* Page header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Debug — Onboarding Checklist</h1>
          <Badge variant="outline" className="text-xs">dev only</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Visualisation de tous les etats du guide de demarrage rapide. 6 etapes : Lot → Email → Contacts → Contrat → Intervention → Cloture.
        </p>
      </div>

      {/* ─── Section 1: Pill dropdown (real component) in all scenarios ──── */}
      <div className="max-w-6xl mx-auto space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pill dropdown — Composant reel
        </h2>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {SCENARIOS.map((s, i) => (
            <Button
              key={i}
              variant={activeScenario === i ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveScenario(i)}
              className="text-xs"
            >
              {s.label}
            </Button>
          ))}
        </div>

        <div className="rounded-xl border bg-card p-8">
          <p className="text-xs text-muted-foreground mb-6">
            {SCENARIOS[activeScenario].description} — Cliquez sur le pill pour ouvrir le dropdown.
          </p>
          <OnboardingChecklist
            progress={SCENARIOS[activeScenario].progress}
            isTrialing={true}
            defaultExpanded={true}
          />
        </div>
      </div>

      {/* ─── Section 2: All steps inline — fully expanded ──────────────── */}
      <div className="max-w-6xl mx-auto space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Toutes les etapes — Vue depliee complete
        </h2>
        <p className="text-xs text-muted-foreground">
          Chaque etape avec son contenu tutorial, description, CTA et icone.
        </p>

        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Mock panel header */}
          <div className="flex items-center justify-between p-4 pb-3 border-b">
            <div>
              <p className="text-sm font-semibold">Guide de demarrage</p>
              <p className="text-xs text-muted-foreground mt-0.5">0 sur 6 etapes completees</p>
            </div>
            <div className="flex items-center gap-2 w-20">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: "0%" }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">0%</span>
            </div>
          </div>

          {/* All steps expanded */}
          <div className="p-3 space-y-1">
            {STEPS_DATA.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.id}>
                  <div className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-primary">{step.label}</p>
                        <Button size="sm" className="gap-1.5 flex-shrink-0 text-xs h-7" disabled>
                          <Icon className="h-3 w-3" />
                          {step.ctaLabel}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  </div>

                  {/* Tutorial content */}
                  <div className="ml-10 mt-1 mb-3 pl-3 border-l-2 border-primary/20">
                    <div className="flex items-start gap-1.5 mb-1">
                      <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.whyItMatters}</p>
                    </div>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">{step.howItConnects}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="border-t p-3 text-center">
            <span className="text-xs text-muted-foreground">Masquer ce guide</span>
          </div>
        </div>
      </div>

      {/* ─── Section 3: States comparison grid ─────────────────────────── */}
      <div className="max-w-6xl mx-auto space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Comparaison des etats — Grille
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENARIOS.map((scenario, si) => {
            const completedCount = STEPS_DATA.filter(s => scenario.progress[s.id]).length
            const progressPercent = Math.round((completedCount / STEPS_DATA.length) * 100)
            const currentStepId = STEPS_DATA.find(s => !scenario.progress[s.id])?.id

            return (
              <div key={si} className="rounded-xl border bg-card overflow-hidden">
                {/* Scenario header */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                  <div>
                    <p className="text-sm font-semibold">{scenario.label}</p>
                    <p className="text-xs text-muted-foreground">{scenario.description}</p>
                  </div>
                  <Badge variant="outline" className="tabular-nums">{progressPercent}%</Badge>
                </div>

                {/* Progress bar */}
                <div className="px-3 pt-3">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Steps */}
                <div className="p-3 space-y-0.5">
                  {STEPS_DATA.map((step, index) => {
                    const isComplete = scenario.progress[step.id]
                    const isCurrent = step.id === currentStepId
                    const Icon = step.icon

                    return (
                      <div
                        key={step.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg",
                          isComplete
                            ? "opacity-60"
                            : isCurrent
                              ? "bg-primary/5 border border-primary/20"
                              : "",
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0",
                          isComplete
                            ? "bg-green-100 dark:bg-green-900/30"
                            : isCurrent
                              ? "bg-primary/10"
                              : "bg-muted",
                        )}>
                          {isComplete ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                          ) : (
                            <span className={cn(
                              "text-[10px] font-semibold",
                              isCurrent ? "text-primary" : "text-muted-foreground",
                            )}>
                              {index + 1}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs",
                            isComplete
                              ? "line-through text-muted-foreground"
                              : isCurrent
                                ? "font-semibold text-primary"
                                : "font-medium",
                          )}>
                            {step.label}
                          </p>
                        </div>

                        <Icon className={cn(
                          "h-3.5 w-3.5 flex-shrink-0",
                          isComplete
                            ? "text-green-500"
                            : isCurrent
                              ? "text-primary"
                              : "text-muted-foreground/40",
                        )} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Section 4: Pill states ────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pill — Tous les etats visuels
        </h2>

        <div className="rounded-xl border bg-card p-6 flex flex-wrap items-center gap-6">
          {SCENARIOS.map((scenario, si) => {
            const completedCount = STEPS_DATA.filter(s => scenario.progress[s.id]).length
            return (
              <div key={si} className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-sm bg-card border-border">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Demarrage</span>
                  <div className="flex items-center gap-1">
                    {STEPS_DATA.map((step) => (
                      <div
                        key={step.id}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          scenario.progress[step.id] ? "bg-green-500" : "bg-muted-foreground/30",
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {completedCount}/{STEPS_DATA.length}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{scenario.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
