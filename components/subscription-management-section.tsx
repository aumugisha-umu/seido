"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { CreditCard, Home } from "lucide-react"
import { PricingCards } from "@/components/pricing-cards"

interface SubscriptionManagementSectionProps {
  defaultLotCount?: number
}

/**
 * Section de gestion d'abonnement pour la page paramètres
 *
 * Affiche les options de pricing (Mensuel/Annuel) avec un slider
 * pour sélectionner le nombre de biens. Actuellement désactivé pendant la beta gratuite.
 */
export function SubscriptionManagementSection({
  defaultLotCount = 10
}: SubscriptionManagementSectionProps) {
  const [lotCount, setLotCount] = useState(defaultLotCount)

  return (
    <Card className="relative overflow-hidden">
      {/* Badge Beta gratuite */}
      <div className="absolute top-4 right-4 z-10">
        <Badge className="bg-green-500 hover:bg-green-500 text-white">
          Beta gratuite
        </Badge>
      </div>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Gestion d'abonnement
        </CardTitle>
        <CardDescription>
          Choisissez votre formule et le nombre de biens à gérer.
          <span className="text-green-600 font-medium mt-2 block">
            Actuellement : accès gratuit pendant la période beta
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Slider nombre de biens - Désactivé */}
        <div className="p-4 rounded-lg bg-muted/50 border opacity-50 pointer-events-none select-none">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Nombre de biens</Label>
                <span className="text-lg font-bold text-primary">{lotCount} lots</span>
              </div>
              <p className="text-sm text-muted-foreground">
                5 biens ou moins = gratuit à vie
              </p>
            </div>
          </div>
          <Slider
            value={[lotCount]}
            onValueChange={(v) => setLotCount(v[0])}
            min={1}
            max={1000}
            step={1}
            disabled
            className="w-full"
          />
          {lotCount >= 1000 && (
            <p className="text-sm text-primary font-medium mt-3">
              1000+ biens ? <a href="#contact" className="underline">Contactez-nous</a> pour une offre personnalisée.
            </p>
          )}
        </div>

        {/* Pricing Cards - Mode light, désactivé */}
        <PricingCards
          variant="light"
          disabled
          showButtons={false}
          lotCount={lotCount}
        />

        {/* Message d'info */}
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
          <strong>Bon à savoir :</strong> Pendant la période beta, toutes les fonctionnalités
          sont accessibles gratuitement. Vous serez prévenu avant toute activation de facturation.
        </div>
      </CardContent>
    </Card>
  )
}
