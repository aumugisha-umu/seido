/**
 * 📧 Email Reply Hint Component
 *
 * Displays an instruction to users that they can reply to the email
 * to add a comment to the intervention conversation.
 *
 * Used in intervention-related email templates.
 */

import * as React from 'react'
import { Text } from '@react-email/components'

interface EmailReplyHintProps {
  /** Custom message to display (optional) */
  message?: string
}

export const EmailReplyHint = ({ message }: EmailReplyHintProps) => {
  const defaultMessage = 'Répondez à cet email pour envoyer un message dans la conversation de l\'intervention.'

  return (
    <div
      className="text-center py-4 px-6 my-4 rounded-lg"
      style={{
        backgroundColor: '#F0F9FF',
        borderLeft: '4px solid #0EA5E9',
      }}
    >
      <Text className="text-gray-700 text-sm leading-relaxed m-0">
        💬 <strong>Astuce :</strong> {message || defaultMessage}
      </Text>
    </div>
  )
}
