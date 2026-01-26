/**
 * 📧 Page de Prévisualisation des Emails - SEIDO
 *
 * Cette page affiche tous les templates d'email avec différents scénarios :
 * - Différents rôles (locataire, prestataire, gestionnaire)
 * - Modes interactifs vs classiques
 * - Différents types de planification
 *
 * Accessible uniquement en développement via /emails/preview
 */

import { Metadata } from 'next'
import EmailPreviewClient from './email-preview-client'

export const metadata: Metadata = {
  title: 'Prévisualisation Emails | SEIDO Dev',
  description: 'Prévisualisation de tous les templates email SEIDO',
}

export default function EmailPreviewPage() {
  // Block access in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Accès Refusé</h1>
          <p className="text-gray-600">Cette page n&apos;est disponible qu&apos;en développement.</p>
        </div>
      </div>
    )
  }

  return <EmailPreviewClient />
}
