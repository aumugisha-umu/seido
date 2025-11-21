'use client'

/**
 * New Intervention Client Component
 * Form for tenants to create new intervention requests
 */

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { InterventionRequestForm } from '@/components/interventions/intervention-request-form'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']
type Lot = {
  id: string
  reference: string
  apartment_number: string | null
  building_id: string | null
  building?: {
    id: string
    name: string
    address: string
  }
}

interface NewInterventionClientProps {
  currentUser: User
  availableLots: Lot[]
}

export function NewInterventionClient({
  currentUser,
  availableLots
}: NewInterventionClientProps) {
  const router = useRouter()

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/locataire">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/locataire/interventions">
              Mes interventions
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Nouvelle demande</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/locataire/interventions')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à mes interventions
        </Button>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle demande d'intervention</CardTitle>
          <CardDescription>
            Décrivez votre problème et nous vous mettrons en contact avec les bonnes personnes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableLots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Vous n'êtes associé à aucun logement pour le moment.
              </p>
              <p className="text-sm text-muted-foreground">
                Contactez votre gestionnaire pour être ajouté à votre logement.
              </p>
            </div>
          ) : (
            <InterventionRequestForm
              tenantId={currentUser.id}
              teamId={currentUser.team_id || ''}
              availableLots={availableLots}
              onSuccess={(interventionId) => {
                router.push(`/locataire/interventions/${interventionId}`)
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Besoin d'aide ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Types d'intervention</p>
            <p>
              Plomberie, électricité, chauffage, serrurerie, peinture, ménage, jardinage, ou autre problème nécessitant une intervention.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Niveaux d'urgence</p>
            <ul className="space-y-1 ml-4">
              <li>• <strong>Basse :</strong> Peut attendre plusieurs jours</li>
              <li>• <strong>Normale :</strong> À traiter dans les prochains jours</li>
              <li>• <strong>Haute :</strong> Nécessite une attention rapide</li>
              <li>• <strong>Urgente :</strong> Intervention immédiate requise (fuite d'eau, panne électrique, etc.)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Processus</p>
            <ol className="space-y-1 ml-4">
              <li>1. Soumettez votre demande avec tous les détails</li>
              <li>2. Un gestionnaire examinera votre demande</li>
              <li>3. Si approuvée, un prestataire sera assigné</li>
              <li>4. Vous pourrez suivre l'avancement en temps réel</li>
              <li>5. Validez les travaux une fois terminés</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}