/**
 * Template Email - Lettre d'indexation de loyer
 *
 * Envoyé via le lead magnet (calculateur d'indexation sur la landing page).
 * Contient le résultat du calcul et la lettre type pré-remplie.
 */

import * as React from 'react'
import { Section, Text, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { IndexationLetterEmailProps } from '@/emails/utils/types'

const REGION_LABELS: Record<string, string> = {
  bruxelles: 'Bruxelles',
  wallonie: 'Wallonie',
  flandre: 'Flandre',
}

export const IndexationLetterEmail = ({
  recipientEmail,
  calcul,
  baseLegale,
}: IndexationLetterEmailProps) => {
  const regionLabel = REGION_LABELS[calcul.region] ?? calcul.region
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <EmailLayout preview={`Indexation de loyer : ${calcul.nouveauLoyer.toFixed(2)} €/mois (+${calcul.pourcentage}%)`}>
      <EmailHeader subject="Votre lettre d'indexation de loyer" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour,
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Voici le résultat de votre calcul d'indexation de loyer, effectué
          sur le calculateur SEIDO.
        </Text>

        {/* Result highlight */}
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#f0f4ff',
          borderRadius: '8px',
          borderLeft: '4px solid #6366f1',
        }}>
          <Text style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 600, marginTop: 0, marginBottom: '8px' }}>
            Résultat du calcul
          </Text>
          <Text style={{ fontSize: '24px', color: '#111827', fontWeight: 700, margin: '0 0 8px 0' }}>
            {calcul.nouveauLoyer.toFixed(2)} €/mois
          </Text>
          <Text style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            soit +{calcul.pourcentage}% par rapport au loyer de base de {calcul.loyer.toFixed(2)} €
          </Text>
        </div>

        {/* Calculation details */}
        <div style={{
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        }}>
          <Text style={{ fontSize: '14px', color: '#111827', fontWeight: 600, marginTop: 0, marginBottom: '12px' }}>
            Détail du calcul
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', margin: '4px 0' }}>
            <strong>Région :</strong> {regionLabel}
          </Text>
          {calcul.peb && (
            <Text style={{ fontSize: '14px', color: '#374151', margin: '4px 0' }}>
              <strong>Certificat PEB/EPC :</strong> {calcul.peb}
            </Text>
          )}
          <Text style={{ fontSize: '14px', color: '#374151', margin: '4px 0' }}>
            <strong>Loyer de base :</strong> {calcul.loyer.toFixed(2)} €
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', margin: '4px 0' }}>
            <strong>Nouveau loyer :</strong> {calcul.nouveauLoyer.toFixed(2)} €
          </Text>
          <Text style={{ fontSize: '13px', color: '#6b7280', margin: '8px 0 0 0' }}>
            Formule : {calcul.formule}
          </Text>
        </div>

        <Hr className="border-gray-200 my-6" />

        {/* Pre-filled letter template */}
        <Text style={{ fontSize: '14px', color: '#111827', fontWeight: 600, marginBottom: '12px' }}>
          Modèle de lettre d'indexation
        </Text>

        <div style={{
          padding: '20px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px 0' }}>
            <em>[Votre nom et adresse]</em>
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px 0' }}>
            <em>[Nom et adresse du locataire]</em>
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px 0' }}>
            {regionLabel}, le {today}
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px 0' }}>
            <strong>Objet : Indexation du loyer</strong>
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px 0' }}>
            Madame, Monsieur,
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px 0' }}>
            Conformément aux dispositions légales en vigueur ({baseLegale}),
            j'ai l'honneur de vous informer de l'indexation de votre loyer.
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px 0' }}>
            Le loyer de base de <strong>{calcul.loyer.toFixed(2)} €</strong> est
            indexé à <strong>{calcul.nouveauLoyer.toFixed(2)} €</strong> par mois,
            soit une augmentation de {calcul.pourcentage}%.
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px 0' }}>
            Ce nouveau montant est applicable à partir de la prochaine échéance de loyer.
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px 0' }}>
            Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.
          </Text>
          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0' }}>
            <em>[Signature]</em>
          </Text>
        </div>

        {/* CTA */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Simplifiez la gestion de votre patrimoine immobilier avec SEIDO :
          indexation automatique, suivi des interventions, et bien plus.
        </Text>

        <EmailButton href="https://www.seido-app.com/auth/register">
          Essayer SEIDO gratuitement
        </EmailButton>

        {/* Disclaimer */}
        <Text className="text-gray-400 text-xs leading-relaxed mt-6 mb-0">
          Cet outil fournit une estimation indicative de l'indexation de votre loyer
          sur base de la législation en vigueur. Il ne constitue pas un conseil juridique.
          Pour toute situation particulière, consultez un professionnel du droit immobilier.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

IndexationLetterEmail.PreviewProps = {
  recipientEmail: 'demo@example.com',
  calcul: {
    loyer: 850,
    region: 'bruxelles',
    peb: 'C',
    nouveauLoyer: 921.42,
    pourcentage: 8.4,
    formule: '(850 × 128.94) / 113.12',
  },
  baseLegale: 'Code bruxellois du Logement, art. 224',
} as IndexationLetterEmailProps

export default IndexationLetterEmail
