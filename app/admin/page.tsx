import { redirect } from 'next/navigation'

/**
 * Admin Root Page - Redirect to Dashboard
 *
 * Cette page redirige automatiquement vers /admin/dashboard
 * pour eviter une 404 quand on accede a /admin directement.
 */
export default function AdminPage() {
  redirect('/admin/dashboard')
}
