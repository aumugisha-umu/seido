/**
 * Demo Role Switcher - Barre sticky en haut pour le mode démo
 * Affiche le rôle actuel, l'utilisateur impersonné, et permet de switch
 */

'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDemoContext } from '@/lib/demo/demo-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TestTube, RotateCcw, X, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_LABELS = {
  gestionnaire: '👨‍💼 Gestionnaire',
  locataire: '🏠 Locataire',
  prestataire: '🔧 Prestataire',
  admin: '⚙️ Admin'
} as const

export function DemoRoleSwitcher() {
  const {
    currentRole,
    setCurrentRole,
    impersonatedUsers,
    setImpersonatedUser,
    getCurrentUser,
    resetData,
    store
  } = useDemoContext()

  const router = useRouter()
  const currentUser = getCurrentUser()

  const switchRole = async (newRole: string) => {
    if (newRole === currentRole) return

    // Récupérer l'utilisateur impersoné sauvegardé pour ce rôle
    const savedUserId = impersonatedUsers[newRole as keyof typeof impersonatedUsers]

    // Mettre à jour le cookie
    try {
      const response = await fetch('/api/demo/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, userId: savedUserId })
      })

      if (!response.ok) {
        throw new Error('Failed to switch role')
      }

      // Mettre à jour le rôle local
      setCurrentRole(newRole as any)

      // Naviguer vers le dashboard du nouveau rôle
      router.push(`/demo/${newRole}/dashboard`)

      // Afficher un toast
      const user = savedUserId ? store.get('users', savedUserId) : null
      if (user) {
        toast.success(`Connecté en tant que ${user.name} (${ROLE_LABELS[newRole as keyof typeof ROLE_LABELS]})`)
      } else {
        toast.success(`Rôle changé : ${ROLE_LABELS[newRole as keyof typeof ROLE_LABELS]}`)
      }
    } catch (error) {
      console.error('Error switching role:', error)
      toast.error('Erreur lors du changement de rôle')
    }
  }

  const clearImpersonation = () => {
    setImpersonatedUser(currentRole, null)
    toast.success('Impersonation désactivée')
    router.refresh()
  }

  const handleReset = () => {
    resetData()
    toast.success('Données réinitialisées')
    router.push('/demo/gestionnaire/dashboard')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white shadow-lg">
      <div className="container mx-auto flex items-center justify-between py-2 px-4 gap-4">
        {/* Left: Demo indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <TestTube className="w-5 h-5" />
          <span className="font-semibold">MODE DÉMO</span>
          <Badge variant="secondary" className="bg-orange-600 hidden md:inline-flex">
            Belgique + Frontaliers
          </Badge>
        </div>

        {/* Center: Role switcher + Current user */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <Select value={currentRole} onValueChange={switchRole}>
            <SelectTrigger className="w-48 bg-white text-black">
              <SelectValue>
                {ROLE_LABELS[currentRole]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gestionnaire">
                {ROLE_LABELS.gestionnaire}
              </SelectItem>
              <SelectItem value="locataire">
                {ROLE_LABELS.locataire}
              </SelectItem>
              <SelectItem value="prestataire">
                {ROLE_LABELS.prestataire}
              </SelectItem>
              <SelectItem value="admin">
                {ROLE_LABELS.admin}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Current impersonated user */}
          {currentUser && impersonatedUsers[currentRole] && (
            <div className="flex items-center gap-2 bg-orange-600 px-3 py-1.5 rounded-md">
              <Avatar className="w-6 h-6">
                <AvatarImage src={currentUser.avatar_url} />
                <AvatarFallback className="text-xs bg-orange-700">
                  {currentUser.first_name?.[0] || currentUser.name?.[0]}
                  {currentUser.last_name?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{currentUser.name}</span>
              <button
                onClick={clearImpersonation}
                className="ml-2 hover:bg-orange-700 rounded-full p-1 transition-colors"
                title="Désactiver impersonation"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-white hover:bg-orange-600"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            <span className="hidden md:inline">Réinitialiser</span>
          </Button>

          <Link
            href="/auth/login"
            className="flex items-center gap-1 text-white hover:underline text-sm"
          >
            Quitter
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
