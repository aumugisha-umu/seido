/**
 * 📧 Template Email - Demande d'accès bêta (admin notification)
 *
 * Envoyé aux admins quand un professionnel demande l'accès à SEIDO
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { BetaAccessRequestEmailProps } from '@/emails/utils/types'

const FieldRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ marginBottom: '12px', padding: '12px 16px', backgroundColor: '#ffffff', borderRadius: '8px', borderLeft: '3px solid #5b8def' }}>
    <Text style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', marginTop: 0 }}>
      {label}
    </Text>
    <Text style={{ fontSize: '15px', color: '#111827', margin: 0 }}>
      {value}
    </Text>
  </div>
)

export const BetaAccessRequestEmail = ({
  firstName,
  lastName,
  email,
  phone,
  message,
  ip,
  requestedAt,
}: BetaAccessRequestEmailProps) => {
  const formattedDate = new Date(requestedAt).toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  })

  return (
    <EmailLayout preview={`Demande d'accès de ${firstName} ${lastName} (${email})`}>
      <EmailHeader subject="Nouvelle demande d'accès" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-6 mt-0">
          Un professionnel souhaite rejoindre SEIDO.
        </Text>

        <FieldRow label="Nom" value={`${firstName} ${lastName}`} />
        <FieldRow label="Email" value={email} />
        <FieldRow label="Téléphone" value={phone} />
        <FieldRow label="Activité" value={message} />

        {/* Meta / technical info */}
        <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#ffffff', borderRadius: '8px', borderLeft: '3px solid #d1d5db' }}>
          <Text style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', marginTop: 0 }}>
            Informations techniques
          </Text>
          <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            {formattedDate} — IP: {ip}
          </Text>
        </div>

        <EmailButton href={`mailto:${email}?subject=Votre demande d'accès à SEIDO`}>
          Répondre à {firstName}
        </EmailButton>

        <Text className="text-gray-500 text-sm text-center m-0">
          Recontacter sous 48h
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

BetaAccessRequestEmail.PreviewProps = {
  firstName: 'Jean',
  lastName: 'Martin',
  email: 'jean.martin@immo.be',
  phone: '+32 470 98 76 54',
  message: 'Je gère 30 lots à Bruxelles et je cherche un outil moderne.',
  ip: '192.168.1.1',
  requestedAt: new Date('2026-03-26T10:30:00'),
} as BetaAccessRequestEmailProps

export default BetaAccessRequestEmail
