'use client'

import { useRouter } from 'next/navigation'
import { ImportWizard } from '@/components/import'

export function ImportPageClient() {
  const router = useRouter()

  const handleClose = () => {
    router.push('/gestionnaire/dashboard')
  }

  return <ImportWizard onClose={handleClose} />
}
