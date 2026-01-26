"use client"

import { Link2, ExternalLink, User, ArrowRight, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface InterventionLink {
  id: string
  parent_intervention_id: string
  child_intervention_id: string
  provider_id: string
  link_type: string
  created_at: string
  parent?: {
    id: string
    reference: string
    title: string
    status: string
  }
  child?: {
    id: string
    reference: string
    title: string
    status: string
  }
  provider?: {
    id: string
    first_name: string
    last_name: string
    avatar_url?: string
  }
}

interface LinkedInterventionsSectionProps {
  interventionId: string
  links: InterventionLink[]
  isParent: boolean
  className?: string
}

const statusColors: Record<string, string> = {
  'demande': 'bg-amber-100 text-amber-800',
  'approuvee': 'bg-emerald-100 text-emerald-800',
  'planifiee': 'bg-blue-100 text-blue-800',
  'cloturee_par_prestataire': 'bg-purple-100 text-purple-800',
  'cloturee_par_locataire': 'bg-purple-100 text-purple-800',
  'cloturee_par_gestionnaire': 'bg-slate-100 text-slate-800',
  'annulee': 'bg-red-100 text-red-800'
}

const statusLabels: Record<string, string> = {
  'demande': 'Demande',
  'approuvee': 'Approuvée',
  'planifiee': 'Planifiée',
  'cloturee_par_prestataire': 'Clôturée (Prest.)',
  'cloturee_par_locataire': 'Clôturée (Loc.)',
  'cloturee_par_gestionnaire': 'Clôturée',
  'annulee': 'Annulée'
}

/**
 * LinkedInterventionsSection - Display linked parent/child interventions
 *
 * Shows:
 * - For parent intervention: List of child interventions with providers
 * - For child intervention: Link back to parent intervention
 */
export function LinkedInterventionsSection({
  interventionId,
  links,
  isParent,
  className
}: LinkedInterventionsSectionProps) {
  const router = useRouter()

  if (links.length === 0) {
    return null
  }

  const getProviderInitials = (provider: InterventionLink['provider']) => {
    if (provider?.first_name && provider?.last_name) {
      return `${provider.first_name[0]}${provider.last_name[0]}`.toUpperCase()
    }
    return '??'
  }

  const getProviderName = (provider: InterventionLink['provider']) => {
    if (provider?.first_name && provider?.last_name) {
      return `${provider.first_name} ${provider.last_name}`
    }
    return 'Prestataire inconnu'
  }

  const handleNavigate = (targetId: string) => {
    router.push(`/gestionnaire/interventions/${targetId}`)
  }

  // Parent view: Show all child interventions
  if (isParent) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-900">
            Interventions individuelles
          </h3>
          <Badge variant="secondary" className="ml-2">
            {links.length}
          </Badge>
        </div>

        <p className="text-sm text-slate-600">
          Cette intervention multi-prestataires a généré les interventions individuelles suivantes :
        </p>

        <div className="space-y-2">
          {links.map((link) => {
            const child = link.child
            const provider = link.provider

            if (!child) return null

            return (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                onClick={() => handleNavigate(child.id)}
              >
                <div className="flex items-center gap-3">
                  {/* Provider Avatar */}
                  <Avatar className="h-9 w-9 border border-slate-200">
                    <AvatarImage src={provider?.avatar_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                      {getProviderInitials(provider)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 text-sm">
                        {child.reference}
                      </span>
                      <Badge className={cn("text-xs", statusColors[child.status] || 'bg-slate-100')}>
                        {statusLabels[child.status] || child.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Prestataire: {getProviderName(provider)}
                    </p>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Child view: Show link back to parent
  const parentLink = links[0]
  const parent = parentLink?.parent

  if (!parent) return null

  return (
    <div className={cn("space-y-3", className)}>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Link2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Intervention issue d'une assignation multiple
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Cette intervention a été créée à partir d'une intervention multi-prestataires.
            </p>

            <Button
              variant="outline"
              size="sm"
              className="mt-3 bg-white"
              onClick={() => handleNavigate(parent.id)}
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              Voir l'intervention parent ({parent.reference})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * LinkedInterventionBanner - Simple banner for child interventions
 * Shows a small banner at the top indicating this is a child intervention
 */
export function LinkedInterventionBanner({
  parentId,
  parentReference,
  className
}: {
  parentId: string
  parentReference: string
  className?: string
}) {
  const router = useRouter()

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg cursor-pointer hover:bg-blue-100 transition-colors",
        className
      )}
      onClick={() => router.push(`/gestionnaire/interventions/${parentId}`)}
    >
      <div className="flex items-center gap-2 text-sm">
        <Link2 className="h-4 w-4 text-blue-600" />
        <span className="text-blue-800">
          Issue de l'intervention <span className="font-medium">{parentReference}</span>
        </span>
      </div>
      <ExternalLink className="h-3 w-3 text-blue-600" />
    </div>
  )
}
