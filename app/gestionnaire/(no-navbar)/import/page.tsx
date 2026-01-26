'use client';

/**
 * Import Page
 * Page for bulk importing buildings, lots, contacts, and contracts
 * Located in (no-navbar) group for full-page wizard experience
 */

import { useRouter } from 'next/navigation';
import { ImportWizard } from '@/components/import';

export default function ImportPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/gestionnaire/dashboard');
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <ImportWizard onClose={handleClose} />
    </div>
  );
}
