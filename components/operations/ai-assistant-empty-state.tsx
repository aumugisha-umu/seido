'use client'

import { useRouter } from 'next/navigation'
import { Bot, MessageCircle, Phone, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function AiAssistantEmptyState() {
  const router = useRouter()

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <div className="flex items-center justify-center min-h-[400px] p-6 sm:p-8">
        <div className="w-full max-w-2xl">

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center">

            {/* Left column: hero scenario + scenario pills */}
            <div className="space-y-5">

              {/* Eyebrow */}
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Assistant IA
                </span>
              </div>

              {/* Hero scenario: appel 22h */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground leading-snug">
                  22h. Un locataire appelle.<br />
                  L&apos;assistant decroche.
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Il pose les bonnes questions, identifie le probleme, et cree un ticket
                  complet avec tout le contexte. Le lendemain matin, vous avez un resume
                  et une intervention prete a traiter.
                </p>
              </div>

              {/* Scenario pills */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <MessageCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">WhatsApp & SMS</span>
                    {' '}— un locataire signale une fuite, l&apos;assistant collecte les details
                    et cree l&apos;intervention avec photos et contexte
                  </span>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <Mail className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Emails</span>
                      {' '}— un prestataire envoie un devis, l&apos;assistant l&apos;assigne
                      a la bonne intervention et vous propose une reponse
                    </span>
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      Agence
                    </Badge>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Button
                onClick={() => router.push('/gestionnaire/parametres/assistant-ia')}
                className="gap-2"
                data-testid="ai-empty-state-cta"
              >
                Voir les plans
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Right column: channels + price */}
            <div className="flex flex-row md:flex-col gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
                <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-medium text-foreground">WhatsApp</span>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
                <Phone className="h-4 w-4 text-violet-600 shrink-0" />
                <span className="text-sm font-medium text-foreground">Appels</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto">
                  Pro
                </Badge>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
                <Mail className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm font-medium text-foreground">Emails</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto">
                  Agence
                </Badge>
              </div>

              {/* Price anchor */}
              <div className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-center">
                <p className="text-xs text-muted-foreground">A partir de</p>
                <p className="text-lg font-bold text-foreground leading-tight">49€</p>
                <p className="text-xs text-muted-foreground">/mois</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
