import { redirect } from 'next/navigation'
import { getUserProfile, getDashboardPath } from '@/lib/auth-dal'

/**
 * 🔄 PAGE DASHBOARD ROUTER - SERVER COMPONENT
 *
 * Bonnes pratiques Next.js 15 :
 * - Redirection immédiate server-side selon le rôle
 * - Pas de logique client-side complexe
 * - Performance optimale avec redirect()
 */

export default async function DashboardRouter() {
  console.log('🔄 [DASHBOARD-ROUTER] Determining user role for redirection...')

  try {
    // ✅ Récupérer le profil utilisateur avec rôle
    const userProfile = await getUserProfile()

    if (!userProfile) {
      console.log('❌ [DASHBOARD-ROUTER] No user profile found, redirecting to login')
      redirect('/auth/login')
    }

    const role = userProfile.profile.role
    const dashboardPath = getDashboardPath(role)

    console.log('✅ [DASHBOARD-ROUTER] Redirecting user to role-based dashboard:', {
      email: userProfile.profile.email,
      role,
      dashboard: dashboardPath
    })

    // ✅ Redirection immédiate server-side selon le rôle
    redirect(dashboardPath)

  } catch (error) {
    console.error('❌ [DASHBOARD-ROUTER] Error determining user role:', error)
    // ✅ Fallback: redirection vers login en cas d'erreur
    redirect('/auth/login')
  }
}