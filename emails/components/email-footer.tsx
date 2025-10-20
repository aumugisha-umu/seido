/**
 * 📧 Footer Email - SEIDO
 *
 * Pied de page avec informations légales et liens
 */

import * as React from 'react'
import { Section, Text, Link } from '@react-email/components'

export const EmailFooter = () => {
  const currentYear = new Date().getFullYear()

  return (
    <Section className="bg-gray-50 px-8 py-6 rounded-b-lg border-t border-gray-200">
      {/* Informations SEIDO */}
      <Text className="text-gray-500 text-xs leading-tight mb-2 mt-0">
        SEIDO Application
      </Text>
      <Text className="text-gray-500 text-xs leading-tight mb-2 m-0">
        123 Rue de l'Innovation, 1000 Bruxelles, Belgique
      </Text>

      {/* Liens utiles */}
      <Text className="text-gray-500 text-xs leading-tight m-0">
        <Link
          href="https://seido.app/unsubscribe"
          className="text-gray-600 no-underline"
        >
          Se désabonner
        </Link>
        {' | '}
        <Link
          href="https://seido.app/privacy"
          className="text-gray-600 no-underline ml-2"
        >
          Politique de confidentialité
        </Link>
        {' | '}
        <Link
          href="mailto:contact@seido.app"
          className="text-gray-600 no-underline ml-2"
        >
          Contact
        </Link>
      </Text>

      {/* Copyright */}
      <Text className="text-gray-400 text-xs mt-4 mb-0">
        © {currentYear} SEIDO. Tous droits réservés.
      </Text>
    </Section>
  )
}
