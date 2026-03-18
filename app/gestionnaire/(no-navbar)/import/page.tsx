import { getServerAuthContext } from '@/lib/server-context'
import { ImportPageClient } from './import-page-client'

/**
 * Import Page (Server Component)
 * Auth-protected page for bulk importing buildings, lots, contacts, and contracts
 * Located in (no-navbar) group for full-page wizard experience
 */
export default async function ImportPage() {
  // Auth guard — only gestionnaires can import
  await getServerAuthContext('gestionnaire')

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <ImportPageClient />
    </div>
  )
}
