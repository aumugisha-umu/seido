import { Phone, Smartphone } from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'

// ============================================================================
// Channel configuration — shared between card and list views
// ============================================================================

export const CHANNEL_CONFIG = {
  whatsapp: { icon: WhatsAppIcon, label: 'WhatsApp', color: 'text-[#25D366]', bgColor: 'bg-[#25D366]/10' },
  phone: { icon: Phone, label: 'Appel', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  sms: { icon: Smartphone, label: 'SMS', color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
} as const
