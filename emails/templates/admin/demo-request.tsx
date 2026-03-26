/**
 * 📧 Template Email - Demande de démo (admin notification)
 *
 * Envoyé aux admins quand un prospect soumet le formulaire de démo
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { DemoRequestEmailProps } from '@/emails/utils/types'

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

export const DemoRequestEmail = ({
  name,
  email,
  phone,
  company,
  lotsCount,
  message,
}: DemoRequestEmailProps) => {
  return (
    <EmailLayout preview={`Demande de démo de ${name}${company ? ` (${company})` : ''}`}>
      <EmailHeader subject="Nouvelle demande de démo" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-6 mt-0">
          Un prospect souhaite une démonstration de SEIDO.
        </Text>

        <FieldRow label="Nom" value={name} />
        <FieldRow label="Email" value={email} />
        {phone && <FieldRow label="Téléphone" value={phone} />}
        {company && <FieldRow label="Société" value={company} />}
        <FieldRow label="Patrimoine" value={`${lotsCount} lots`} />
        <FieldRow label="Message" value={message} />

        <EmailButton href={`mailto:${email}?subject=Votre demande de démo SEIDO`}>
          Répondre à {name}
        </EmailButton>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

DemoRequestEmail.PreviewProps = {
  name: 'Marie Dupont',
  email: 'marie@example.com',
  phone: '+32 470 12 34 56',
  company: 'Immo Bruxelles SA',
  lotsCount: '50-100',
  message: 'Nous gérons un parc de 80 lots et cherchons une solution moderne.',
} as DemoRequestEmailProps

export default DemoRequestEmail
