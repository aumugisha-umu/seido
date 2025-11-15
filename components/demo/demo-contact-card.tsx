/**
 * Demo Contact Card - Card avec bouton "Se connecter en tant que"
 * Permet l'impersonation d'un utilisateur en mode démo
 */

'use client'

import { useRouter } from 'next/navigation'
import { useDemoContext } from '@/lib/demo/demo-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserCheck, Phone, Mail, MapPin, Building2 } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_LABELS = {
  gestionnaire: 'Gestionnaire',
  locataire: 'Locataire',
  prestataire: 'Prestataire',
  admin: 'Admin'
} as const

const ROLE_COLORS = {
  gestionnaire: 'bg-blue-100 text-blue-700 border-blue-200',
  locataire: 'bg-green-100 text-green-700 border-green-200',
  prestataire: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-red-100 text-red-700 border-red-200'
} as const

interface DemoContactCardProps {
  user: any
  showImpersonateButton?: boolean
}

export function DemoContactCard({ user, showImpersonateButton = true }: DemoContactCardProps) {
  const { setImpersonatedUser, setCurrentRole, impersonatedUsers } = useDemoContext()
  const router = useRouter()

  const isCurrentlyImpersonated = impersonatedUsers[user.role as keyof typeof impersonatedUsers] === user.id

  const handleImpersonate = async () => {
    try {
      // 1. Enregistrer l'utilisateur impersoné dans le contexte
      setImpersonatedUser(user.role, user.id)

      // 2. Mettre à jour le cookie
      const response = await fetch('/api/demo/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: user.role, userId: user.id })
      })

      if (!response.ok) {
        throw new Error('Failed to switch role')
      }

      // 3. Mettre à jour le rôle actuel
      setCurrentRole(user.role)

      // 4. Naviguer vers le dashboard du rôle
      router.push(`/demo/${user.role}/dashboard`)

      // 5. Toast notification
      toast.success(`Connecté en tant que ${user.name}`)
    } catch (error) {
      console.error('Error impersonating user:', error)
      toast.error('Erreur lors de la connexion')
    }
  }

  return (
    <Card className={`relative transition-all hover:shadow-md ${isCurrentlyImpersonated ? 'ring-2 ring-orange-500' : ''}`}>
      {isCurrentlyImpersonated && (
        <Badge className="absolute top-3 right-3 bg-orange-500">
          Actif
        </Badge>
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="w-14 h-14 shrink-0">
            <AvatarImage src={user.avatar_url} alt={user.name} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
              {user.first_name?.[0] || user.name?.[0]}
              {user.last_name?.[0] || user.name?.[1]}
            </AvatarFallback>
          </Avatar>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg truncate">{user.name}</h3>
            </div>

            <Badge
              variant="outline"
              className={`mb-3 ${ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]}`}
            >
              {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
            </Badge>

            <div className="space-y-1.5 text-sm text-muted-foreground">
              {user.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{user.company}</span>
                </div>
              )}
              {user.provider_rating && (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">⭐</span>
                  <span>{user.provider_rating.toFixed(1)} / 5.0</span>
                </div>
              )}
            </div>
          </div>

          {/* Bouton Impersonate */}
          {showImpersonateButton && (
            <div className="shrink-0">
              <Button
                variant={isCurrentlyImpersonated ? "default" : "outline"}
                size="sm"
                onClick={handleImpersonate}
                className={isCurrentlyImpersonated ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                {isCurrentlyImpersonated ? 'Actif' : 'Se connecter'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
