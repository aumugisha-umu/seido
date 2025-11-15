/**
 * Page Modifier Contact - Mode Démo
 * Formulaire de modification de contact
 */

'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users } from 'lucide-react'
import { useDemoContact } from '@/hooks/demo/use-demo-contacts'

export default function EditContactPageDemo({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { contact } = useDemoContact(id)

  return (
    <div className="layout-container space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/demo/gestionnaire/contacts/details/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Modifier {contact?.name || 'le contact'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modifiez les informations de ce contact
          </p>
        </div>
      </div>

      {/* Content */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-2">
                Fonctionnalité en cours de développement
              </p>
              <p className="text-sm text-blue-800">
                Le formulaire de modification de contact sera bientôt disponible en mode démo.
                Vous pourrez modifier le nom, l'email, le téléphone, le rôle et gérer les invitations.
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/demo/gestionnaire/contacts/details/${id}`)}
                >
                  Retour aux détails
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/demo/gestionnaire/contacts')}
                >
                  Retour aux contacts
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
