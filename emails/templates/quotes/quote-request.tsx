/**
 * 📧 Template Email - Demande de Devis
 *
 * Envoyé au prestataire quand le gestionnaire demande un devis
 * Objectif: Demander au prestataire de soumettre son estimation
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { QuoteRequestEmailProps } from '@/emails/utils/types'

export const QuoteRequestEmail = ({
  firstName,
  quoteRef,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  quoteUrl,
  managerName,
  deadline,
  additionalInfo,
}: QuoteRequestEmailProps) => {
  const formattedDeadline = deadline
    ? deadline.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined

  return (
    <EmailLayout preview={`Demande de devis ${quoteRef} - ${interventionType}`}>
      <EmailHeader subject="Nouvelle demande de devis" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          <strong>{managerName}</strong> vous demande de soumettre un devis pour une intervention.
        </Text>

        {/* Encadré deadline si présent */}
        {deadline && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-lg mb-6">
            <Text className="text-amber-900 font-bold text-base m-0">
              ⏱️ À soumettre avant le {formattedDeadline}
            </Text>
          </div>
        )}

        {/* Détails */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            📋 Détails de l'intervention
          </Heading>

          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Référence devis :</td>
                <td className="text-gray-900 py-2 font-semibold">{quoteRef}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Intervention :</td>
                <td className="text-gray-900 py-2">{interventionRef}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Type :</td>
                <td className="text-gray-900 py-2">{interventionType}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Adresse :</td>
                <td className="text-gray-900 py-2">{propertyAddress}</td>
              </tr>
            </tbody>
          </table>

          <Hr className="my-4 border-gray-200" />

          <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-4 mb-2">
            Description :
          </Heading>
          <Text className="text-gray-700 text-sm leading-relaxed bg-white p-3 rounded border border-gray-200 m-0">
            {description}
          </Text>

          {additionalInfo && (
            <>
              <Hr className="my-4 border-gray-200" />
              <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-4 mb-2">
                Informations complémentaires :
              </Heading>
              <Text className="text-gray-700 text-sm leading-relaxed bg-white p-3 rounded border border-gray-200 m-0">
                {additionalInfo}
              </Text>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            📝 Pour soumettre votre devis
          </Text>
          <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
            <li>Indiquez le montant total HT et TTC</li>
            <li>Détaillez les travaux à réaliser</li>
            <li>Précisez la durée estimée de l'intervention</li>
            <li>Vous pouvez joindre un PDF de votre devis détaillé</li>
          </ul>
        </div>

        <EmailButton href={quoteUrl}>Soumettre mon devis</EmailButton>

        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Cette demande a été créée par {managerName}.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

QuoteRequestEmail.PreviewProps = {
  firstName: 'Pierre',
  quoteRef: 'DEV-2024-015',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description: 'Fuite d\'eau importante sous l\'évier de la cuisine.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  quoteUrl: 'https://seido.app/prestataire/devis/DEV-2024-015',
  managerName: 'Jean Martin',
  deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  additionalInfo: 'Accès à l\'appartement possible en semaine entre 9h et 17h.',
} as QuoteRequestEmailProps

export default QuoteRequestEmail
