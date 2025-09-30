import { Loader2 } from "lucide-react"
import { logoutAction } from "@/app/actions/auth-actions"

/**
 * 🚪 PAGE LOGOUT - SERVER COMPONENT (Déconnexion automatique)
 *
 * Pattern officiel Next.js 15 + Supabase SSR :
 * 1. Server Component qui appelle automatiquement logoutAction()
 * 2. Suppression complète de tous les cookies de session via signOut()
 * 3. Invalidation du cache Next.js pour purger les données
 * 4. Redirection automatique vers /auth/login
 *
 * Sécurité :
 * - Déconnexion côté serveur (secure)
 * - Nettoyage automatique des cookies sb-* par Supabase
 * - Pas de state client = pas de risque de fuite
 */

export default async function LogoutPage() {
  console.log('🚪 [LOGOUT-PAGE] Logout page accessed, triggering server-side logout...')

  // ✅ PATTERN OFFICIEL: Appeler directement la Server Action
  // logoutAction() va :
  // 1. Appeler invalidateAuth() qui fait supabase.auth.signOut()
  // 2. Supprimer tous les cookies de session (sb-access-token, sb-refresh-token, etc.)
  // 3. Invalider le cache avec revalidatePath('/', 'layout')
  // 4. Rediriger vers /auth/login via redirect()
  await logoutAction()

  // ✅ Ce code ne sera jamais atteint car logoutAction() fait un redirect()
  // Mais on garde un fallback UI pour TypeScript et la cohérence
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Déconnexion en cours...</p>
      </div>
    </div>
  )
}