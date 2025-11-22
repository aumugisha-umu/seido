// Dummy data pour tester l'interface email (Variant 2 - Balanced)

export interface DummyEmail {
  id: string
  sender_email: string
  sender_name: string
  recipient_email: string
  subject: string
  snippet: string
  body_html: string
  received_at: string
  is_read: boolean
  has_attachments: boolean
  attachments: DummyAttachment[]
  building_id?: string
  building_name?: string
  lot_id?: string
  lot_name?: string
  labels: string[]
  direction: 'received' | 'sent'
  status: 'unread' | 'read' | 'archived' | 'deleted'
  conversation_id?: string
  thread_order?: number
  is_parent?: boolean
  email_connection_id?: string
}

export interface DummyAttachment {
  id: string
  filename: string
  file_size: number
  mime_type: string
}

export interface DummyBuilding {
  id: string
  name: string
  address: string
  emailCount: number
  lots: DummyLot[]
}

export interface DummyLot {
  id: string
  name: string
  tenant_name?: string
}

export interface DummyBlacklistEntry {
  id: string
  sender_email: string
  sender_domain: string | null
  reason: string | null
  blocked_by_user_name: string
  is_current_user: boolean
  created_at: string
}

// ========================================
// DUMMY EMAILS
// ========================================

export const dummyEmails: DummyEmail[] = [
  {
    id: '1',
    sender_email: 'leyton@tier1.com',
    sender_name: 'Leyton',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Re: Renewal agreement for building',
    snippet: 'Hi there, Can you send over any new updates to the lease contract...',
    body_html: `
      <p>Hi there,</p>
      <p>Can you send over any new updates to the lease contract for building Paris 10e?</p>
      <p>We need to finalize the paperwork by end of week.</p>
      <p>Best regards,<br/>Leyton</p>
    `,
    received_at: new Date(Date.now() - 26 * 60 * 1000).toISOString(), // 26 min ago
    is_read: false,
    has_attachments: true,
    attachments: [
      {
        id: 'a1',
        filename: 'contract_draft.pdf',
        file_size: 245760,
        mime_type: 'application/pdf'
      },
      {
        id: 'a2',
        filename: 'floor_plan.png',
        file_size: 512000,
        mime_type: 'image/png'
      }
    ],
    building_id: 'b1',
    building_name: 'Paris 10e',
    lot_id: 'l1',
    lot_name: 'Appartement 4A',
    labels: ['Urgent'],
    direction: 'received',
    status: 'unread',
    conversation_id: 'conv1',
    thread_order: 1,
    is_parent: true
  },
  {
    id: '1-1',
    sender_email: 'contact@seido-immobilier.fr',
    sender_name: 'Vous',
    recipient_email: 'leyton@tier1.com',
    subject: 'Re: Renewal agreement for building',
    snippet: 'Merci pour votre message. Je vous envoie les documents...',
    body_html: `
      <p>Bonjour Leyton,</p>
      <p>Merci pour votre message. Je vous envoie les documents demandés.</p>
      <p>Cordialement</p>
    `,
    received_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    lot_id: 'l1',
    lot_name: 'Appartement 4A',
    labels: [],
    direction: 'sent',
    status: 'read',
    conversation_id: 'conv1',
    thread_order: 2,
    is_parent: false
  },
  {
    id: '1-2',
    sender_email: 'leyton@tier1.com',
    sender_name: 'Leyton',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Re: Renewal agreement for building',
    snippet: 'Parfait, merci pour les documents. Je vais les vérifier...',
    body_html: `
      <p>Bonjour,</p>
      <p>Parfait, merci pour les documents. Je vais les vérifier et vous reviens rapidement.</p>
      <p>Bonne journée,<br/>Leyton</p>
    `,
    received_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    lot_id: 'l1',
    lot_name: 'Appartement 4A',
    labels: [],
    direction: 'received',
    status: 'read',
    conversation_id: 'conv1',
    thread_order: 3,
    is_parent: false
  },
  {
    id: '1-3',
    sender_email: 'contact@seido-immobilier.fr',
    sender_name: 'Vous',
    recipient_email: 'leyton@tier1.com',
    subject: 'Re: Renewal agreement for building',
    snippet: 'D\'accord, n\'hésitez pas si vous avez des questions...',
    body_html: `
      <p>Bonjour Leyton,</p>
      <p>D'accord, n'hésitez pas si vous avez des questions.</p>
      <p>À bientôt</p>
    `,
    received_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    lot_id: 'l1',
    lot_name: 'Appartement 4A',
    labels: [],
    direction: 'sent',
    status: 'read',
    conversation_id: 'conv1',
    thread_order: 4,
    is_parent: false
  },
  {
    id: '2',
    sender_email: 'sarah.murphy@example.com',
    sender_name: 'Sarah Murphy',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Re: Do you support parent child relationships?',
    snippet: 'Hey Team, I\'m evaluating platforms for our enterprise catalog management...',
    body_html: `
      <p>Hey Team,</p>
      <p>I'm evaluating platforms for our enterprise catalog management.</p>
      <p>Does your solution support parent-child relationships for properties?</p>
      <p>This would be crucial for our multi-building portfolio management.</p>
      <p>Thanks,<br/>Sarah</p>
    `,
    received_at: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
    is_read: false,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    labels: ['Intervention'],
    direction: 'received',
    status: 'unread',
    conversation_id: 'conv2',
    thread_order: 1,
    is_parent: true
  },
  {
    id: '2-1',
    sender_email: 'contact@seido-immobilier.fr',
    sender_name: 'Vous',
    recipient_email: 'sarah.murphy@example.com',
    subject: 'Re: Do you support parent child relationships?',
    snippet: 'Oui, notre solution supporte les relations parent-enfant...',
    body_html: `
      <p>Bonjour Sarah,</p>
      <p>Oui, notre solution supporte les relations parent-enfant pour les propriétés.</p>
      <p>Je peux vous envoyer une démo si vous le souhaitez.</p>
    `,
    received_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    labels: [],
    direction: 'sent',
    status: 'read',
    conversation_id: 'conv2',
    thread_order: 2,
    is_parent: false
  },
  {
    id: '2-2',
    sender_email: 'sarah.murphy@example.com',
    sender_name: 'Sarah Murphy',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Re: Do you support parent child relationships?',
    snippet: 'Merci pour votre réponse. Une démo serait parfaite...',
    body_html: `
      <p>Bonjour,</p>
      <p>Merci pour votre réponse. Une démo serait parfaite pour voir comment cela fonctionne en pratique.</p>
      <p>Quand seriez-vous disponible ?</p>
      <p>Merci,<br/>Sarah</p>
    `,
    received_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    is_read: false,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    labels: [],
    direction: 'received',
    status: 'unread',
    conversation_id: 'conv2',
    thread_order: 3,
    is_parent: false
  },
  {
    id: '2-3',
    sender_email: 'contact@seido-immobilier.fr',
    sender_name: 'Vous',
    recipient_email: 'sarah.murphy@example.com',
    subject: 'Re: Do you support parent child relationships?',
    snippet: 'Je peux organiser une démo pour vendredi prochain...',
    body_html: `
      <p>Bonjour Sarah,</p>
      <p>Je peux organiser une démo pour vendredi prochain à 14h si cela vous convient.</p>
      <p>Je vous enverrai les détails de connexion par email.</p>
      <p>Cordialement</p>
    `,
    received_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    labels: [],
    direction: 'sent',
    status: 'read',
    conversation_id: 'conv2',
    thread_order: 4,
    is_parent: false
  },
  {
    id: '3',
    sender_email: 'francis.hyde@provider.com',
    sender_name: 'Francis Hyde',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Delegated access request',
    snippet: '',
    body_html: `
      <p>Hello,</p>
      <p>I am requesting delegated access to the building Lyon 3e for maintenance work.</p>
      <p>Please let me know the procedure.</p>
      <p>Best regards,<br/>Francis Hyde</p>
    `,
    received_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Just now
    is_read: false,
    has_attachments: true,
    attachments: [
      {
        id: 'a3',
        filename: 'authorization_form.docx',
        file_size: 65536,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    ],
    building_id: 'b2',
    building_name: 'Lyon 3e',
    labels: [],
    direction: 'received',
    status: 'unread',
    conversation_id: 'conv3',
    thread_order: 1,
    is_parent: true
  },
  {
    id: '3-1',
    sender_email: 'contact@seido-immobilier.fr',
    sender_name: 'Vous',
    recipient_email: 'francis.hyde@provider.com',
    subject: 'Re: Delegated access request',
    snippet: 'Voici les informations pour accéder au bâtiment...',
    body_html: `
      <p>Bonjour Francis,</p>
      <p>Voici les informations pour accéder au bâtiment Lyon 3e.</p>
      <p>Vous pouvez procéder aux travaux de maintenance.</p>
    `,
    received_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    building_id: 'b2',
    building_name: 'Lyon 3e',
    labels: [],
    direction: 'sent',
    status: 'read',
    conversation_id: 'conv3',
    thread_order: 2,
    is_parent: false
  },
  {
    id: '3-2',
    sender_email: 'francis.hyde@provider.com',
    sender_name: 'Francis Hyde',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Re: Delegated access request',
    snippet: 'Parfait, merci pour les informations. Je commence les travaux aujourd\'hui...',
    body_html: `
      <p>Bonjour,</p>
      <p>Parfait, merci pour les informations. Je commence les travaux aujourd'hui.</p>
      <p>Je vous tiendrai informé de l'avancement.</p>
      <p>Cordialement,<br/>Francis Hyde</p>
    `,
    received_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    is_read: false,
    has_attachments: false,
    attachments: [],
    building_id: 'b2',
    building_name: 'Lyon 3e',
    labels: [],
    direction: 'received',
    status: 'unread',
    conversation_id: 'conv3',
    thread_order: 3,
    is_parent: false
  },
  {
    id: '4',
    sender_email: 'ahmed.khan@tenant.com',
    sender_name: 'Ahmed Khan',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Welcome aboard!',
    snippet: 'Welcome to SEIDO property management. Here are your next steps...',
    body_html: `
      <p>Welcome to SEIDO property management!</p>
      <p>Here are your next steps to get started with managing your property:</p>
      <ol>
        <li>Complete your tenant profile</li>
        <li>Review building rules</li>
        <li>Set up maintenance notifications</li>
      </ol>
      <p>We're excited to have you!</p>
    `,
    received_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
    is_read: true,
    has_attachments: false,
    attachments: [],
    labels: [],
    direction: 'sent',
    status: 'read'
  },
  {
    id: '5',
    sender_email: 'plumber@services.fr',
    sender_name: 'Jean Dupont - Plomberie',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Devis intervention fuite appartement 4A',
    snippet: 'Bonjour, Suite à votre demande, voici le devis pour l\'intervention...',
    body_html: `
      <p>Bonjour,</p>
      <p>Suite à votre demande concernant la fuite dans l'appartement 4A (Paris 10e), voici le devis détaillé:</p>
      <ul>
        <li>Diagnostic: 80€</li>
        <li>Réparation robinet: 150€</li>
        <li>Pièces: 45€</li>
      </ul>
      <p><strong>Total: 275€ TTC</strong></p>
      <p>Disponible pour intervention mardi prochain.</p>
      <p>Cordialement,<br/>Jean Dupont</p>
    `,
    received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    is_read: true,
    has_attachments: true,
    attachments: [
      {
        id: 'a4',
        filename: 'devis_plomberie_04A.pdf',
        file_size: 189440,
        mime_type: 'application/pdf'
      }
    ],
    building_id: 'b1',
    building_name: 'Paris 10e',
    lot_id: 'l1',
    lot_name: 'Appartement 4A',
    labels: ['Intervention', 'Urgent'],
    direction: 'received',
    status: 'read',
    conversation_id: 'conv4',
    thread_order: 1,
    is_parent: true
  },
  {
    id: '5-1',
    sender_email: 'contact@seido-immobilier.fr',
    sender_name: 'Vous',
    recipient_email: 'plumber@services.fr',
    subject: 'Re: Devis intervention fuite appartement 4A',
    snippet: 'Merci pour le devis. Je valide l\'intervention...',
    body_html: `
      <p>Bonjour Jean,</p>
      <p>Merci pour le devis. Je valide l'intervention pour mardi prochain.</p>
      <p>Cordialement</p>
    `,
    received_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    lot_id: 'l1',
    lot_name: 'Appartement 4A',
    labels: [],
    direction: 'sent',
    status: 'read',
    conversation_id: 'conv4',
    thread_order: 2,
    is_parent: false
  },
  {
    id: '6',
    sender_email: 'newsletter@marketing.com',
    sender_name: 'Marketing Newsletter',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: '🎉 Special offers for real estate professionals!',
    snippet: 'Get 50% off on our premium services this month only...',
    body_html: `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #ff6600;">🎉 Special Offers!</h2>
        <p>Get 50% off on our premium services this month only!</p>
        <p>Limited time offer for real estate professionals.</p>
        <a href="#" style="background: #ff6600; color: white; padding: 10px 20px; text-decoration: none;">
          Claim Your Discount
        </a>
      </div>
    `,
    received_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    is_read: false,
    has_attachments: false,
    attachments: [],
    labels: [],
    direction: 'received',
    status: 'unread'
  },
  {
    id: '7',
    sender_email: 'marie.dupont@tenant.fr',
    sender_name: 'Marie Dupont',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Problème de chauffage',
    snippet: 'Bonjour, j\'ai un problème avec le chauffage dans mon appartement...',
    body_html: `
      <p>Bonjour,</p>
      <p>J'ai un problème avec le chauffage dans mon appartement 4B.</p>
      <p>Pouvez-vous envoyer quelqu'un pour vérifier ?</p>
      <p>Merci,<br/>Marie Dupont</p>
    `,
    received_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    lot_id: 'l2',
    lot_name: 'Appartement 4B',
    labels: ['Intervention'],
    direction: 'received',
    status: 'unread',
    conversation_id: 'conv5',
    thread_order: 1,
    is_parent: true
  },
  {
    id: '7-1',
    sender_email: 'contact@seido-immobilier.fr',
    sender_name: 'Vous',
    recipient_email: 'marie.dupont@tenant.fr',
    subject: 'Re: Problème de chauffage',
    snippet: 'Bonjour, nous allons envoyer un technicien demain matin...',
    body_html: `
      <p>Bonjour Marie,</p>
      <p>Nous allons envoyer un technicien demain matin entre 9h et 12h pour vérifier le problème de chauffage.</p>
      <p>Pourriez-vous être présente ?</p>
      <p>Cordialement</p>
    `,
    received_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    lot_id: 'l2',
    lot_name: 'Appartement 4B',
    labels: [],
    direction: 'sent',
    status: 'read',
    conversation_id: 'conv5',
    thread_order: 2,
    is_parent: false
  },
  {
    id: '7-2',
    sender_email: 'marie.dupont@tenant.fr',
    sender_name: 'Marie Dupont',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Re: Problème de chauffage',
    snippet: 'Oui, je serai présente. Merci beaucoup pour la réactivité...',
    body_html: `
      <p>Bonjour,</p>
      <p>Oui, je serai présente. Merci beaucoup pour la réactivité.</p>
      <p>À demain,<br/>Marie Dupont</p>
    `,
    received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    building_id: 'b1',
    building_name: 'Paris 10e',
    lot_id: 'l2',
    lot_name: 'Appartement 4B',
    labels: [],
    direction: 'received',
    status: 'read',
    conversation_id: 'conv5',
    thread_order: 3,
    is_parent: false
  },
  {
    id: '8',
    sender_email: 'tech.support@example.com',
    sender_name: 'Tech Support',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Mise à jour système disponible',
    snippet: 'Une nouvelle version de notre système est disponible...',
    body_html: `
      <p>Bonjour,</p>
      <p>Une nouvelle version de notre système est disponible.</p>
      <p>Voulez-vous planifier la mise à jour ?</p>
    `,
    received_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    has_attachments: true,
    attachments: [
      {
        id: 'a5',
        filename: 'release_notes.pdf',
        file_size: 102400,
        mime_type: 'application/pdf'
      }
    ],
    labels: [],
    direction: 'received',
    status: 'unread'
  },
  {
    id: '9',
    sender_email: 'client@company.com',
    sender_name: 'Client Company',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Demande de rendez-vous',
    snippet: 'Bonjour, nous aimerions prendre rendez-vous pour visiter...',
    body_html: `
      <p>Bonjour,</p>
      <p>Nous aimerions prendre rendez-vous pour visiter plusieurs propriétés.</p>
      <p>Quand seriez-vous disponible ?</p>
    `,
    received_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    has_attachments: false,
    attachments: [],
    building_id: 'b2',
    building_name: 'Lyon 3e',
    labels: [],
    direction: 'received',
    status: 'unread',
    conversation_id: 'conv6',
    thread_order: 1,
    is_parent: true
  },
  {
    id: '9-1',
    sender_email: 'contact@seido-immobilier.fr',
    sender_name: 'Vous',
    recipient_email: 'client@company.com',
    subject: 'Re: Demande de rendez-vous',
    snippet: 'Bonjour, nous serions disponibles la semaine prochaine...',
    body_html: `
      <p>Bonjour,</p>
      <p>Nous serions disponibles la semaine prochaine pour organiser les visites.</p>
      <p>Quels jours vous conviendraient le mieux ?</p>
      <p>Cordialement</p>
    `,
    received_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    building_id: 'b2',
    building_name: 'Lyon 3e',
    labels: [],
    direction: 'sent',
    status: 'read',
    conversation_id: 'conv6',
    thread_order: 2,
    is_parent: false
  },
  {
    id: '9-2',
    sender_email: 'client@company.com',
    sender_name: 'Client Company',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Re: Demande de rendez-vous',
    snippet: 'Merci, le mardi ou mercredi nous conviendrait parfaitement...',
    body_html: `
      <p>Bonjour,</p>
      <p>Merci, le mardi ou mercredi nous conviendrait parfaitement.</p>
      <p>Pouvez-vous nous proposer des créneaux ?</p>
      <p>Merci</p>
    `,
    received_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    has_attachments: false,
    attachments: [],
    building_id: 'b2',
    building_name: 'Lyon 3e',
    labels: [],
    direction: 'received',
    status: 'unread',
    conversation_id: 'conv6',
    thread_order: 3,
    is_parent: false
  },
  {
    id: '10',
    sender_email: 'maintenance@services.fr',
    sender_name: 'Maintenance Services',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Rapport d\'intervention - Marseille Centre',
    snippet: 'Voici le rapport d\'intervention pour le bâtiment Marseille Centre...',
    body_html: `
      <p>Bonjour,</p>
      <p>Voici le rapport d'intervention pour le bâtiment Marseille Centre.</p>
      <p>Tous les travaux ont été effectués avec succès.</p>
    `,
    received_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: true,
    attachments: [
      {
        id: 'a6',
        filename: 'rapport_intervention.pdf',
        file_size: 256000,
        mime_type: 'application/pdf'
      }
    ],
    building_id: 'b3',
    building_name: 'Marseille Centre',
    labels: [],
    direction: 'received',
    status: 'read'
  },
  {
    id: '11',
    sender_email: 'admin@seido-immobilier.fr',
    sender_name: 'Admin SEIDO',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Réunion d\'équipe - Vendredi',
    snippet: 'Rappel : Réunion d\'équipe prévue vendredi à 14h...',
    body_html: `
      <p>Bonjour,</p>
      <p>Rappel : Réunion d'équipe prévue vendredi à 14h.</p>
      <p>Ordre du jour : Revue des projets en cours</p>
    `,
    received_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    has_attachments: false,
    attachments: [],
    labels: [],
    direction: 'sent',
    status: 'read'
  },
  {
    id: '12',
    sender_email: 'vendor@supplier.com',
    sender_name: 'Vendor Supplier',
    recipient_email: 'contact@seido-immobilier.fr',
    subject: 'Commande de matériel',
    snippet: 'Votre commande de matériel a été expédiée...',
    body_html: `
      <p>Bonjour,</p>
      <p>Votre commande de matériel a été expédiée.</p>
      <p>Numéro de suivi : TRK123456789</p>
    `,
    received_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    has_attachments: false,
    attachments: [],
    labels: [],
    direction: 'received',
    status: 'unread'
  }
]

// ========================================
// DUMMY BUILDINGS
// ========================================

export const dummyBuildings: DummyBuilding[] = [
  {
    id: 'b1',
    name: 'Paris 10e',
    address: '123 Rue de Paris, 75010 Paris',
    emailCount: 20,
    lots: [
      {
        id: 'l1',
        name: 'Appartement 4A',
        tenant_name: 'M. Dupont'
      },
      {
        id: 'l2',
        name: 'Appartement 4B',
        tenant_name: 'Mme Martin'
      },
      {
        id: 'l3',
        name: 'Appartement 5A',
        tenant_name: 'M. Bernard'
      }
    ]
  },
  {
    id: 'b2',
    name: 'Lyon 3e',
    address: '45 Avenue de Lyon, 69003 Lyon',
    emailCount: 6,
    lots: [
      {
        id: 'l4',
        name: 'Local Commercial',
        tenant_name: 'Boulangerie Artisanale'
      },
      {
        id: 'l5',
        name: 'Appartement 1',
        tenant_name: 'Mme Lefebvre'
      }
    ]
  },
  {
    id: 'b3',
    name: 'Marseille Centre',
    address: '78 Boulevard Marseille, 13001 Marseille',
    emailCount: 3,
    lots: [
      {
        id: 'l6',
        name: 'Studio 12',
        tenant_name: 'M. Petit'
      }
    ]
  }
]

// ========================================
// DUMMY BLACKLIST
// ========================================

export const dummyBlacklist: DummyBlacklistEntry[] = [
  {
    id: 'bl1',
    sender_email: 'newsletter@marketing.com',
    sender_domain: null,
    reason: 'Promotional emails',
    blocked_by_user_name: 'Marc (gestionnaire)',
    is_current_user: false,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  {
    id: 'bl2',
    sender_email: 'spam@example.com',
    sender_domain: null,
    reason: null,
    blocked_by_user_name: 'You',
    is_current_user: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  },
  {
    id: 'bl3',
    sender_email: '',
    sender_domain: 'ads.company.com',
    reason: 'Spam advertising',
    blocked_by_user_name: 'Julie',
    is_current_user: false,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
  }
]

// ========================================
// HELPER FUNCTIONS
// ========================================

export function getEmailById(id: string): DummyEmail | undefined {
  return dummyEmails.find(email => email.id === id)
}

export function getEmailsByFolder(folder: string): DummyEmail[] {
  switch (folder) {
    case 'inbox':
      return dummyEmails.filter(e => e.direction === 'received' && e.status === 'unread')
    case 'sent':
      return dummyEmails.filter(e => e.direction === 'sent')
    case 'drafts':
      return [] // No drafts in dummy data
    case 'archive':
      return dummyEmails.filter(e => e.status === 'archived')
    default:
      return dummyEmails
  }
}

export function getEmailsByBuilding(buildingId: string): DummyEmail[] {
  return dummyEmails.filter(e => e.building_id === buildingId)
}

export function getUnreadCount(folder: string): number {
  return getEmailsByFolder(folder).filter(e => !e.is_read).length
}

export function getDraftsCount(): number {
  return 27 // Hardcoded from design
}

// ========================================
// CONVERSATION GROUPING
// ========================================

export interface ConversationGroup {
  parent: DummyEmail
  children: DummyEmail[]
  conversationId: string
}

export function groupEmailsByConversation(emails: DummyEmail[]): (ConversationGroup | DummyEmail)[] {
  const conversationMap = new Map<string, ConversationGroup>()
  const standaloneEmails: DummyEmail[] = []

  // First, group emails by conversation_id
  emails.forEach(email => {
    if (email.conversation_id) {
      if (!conversationMap.has(email.conversation_id)) {
        // Initialize with this email as parent (or placeholder)
        conversationMap.set(email.conversation_id, {
          parent: email.is_parent ? email : email, // Will be replaced if we find a real parent
          children: [],
          conversationId: email.conversation_id
        })
      }
      const group = conversationMap.get(email.conversation_id)!
      if (email.is_parent) {
        group.parent = email
      } else {
        group.children.push(email)
      }
    } else {
      standaloneEmails.push(email)
    }
  })

  // Sort children by thread_order or date
  conversationMap.forEach(group => {
    group.children.sort((a, b) => {
      if (a.thread_order && b.thread_order) {
        return a.thread_order - b.thread_order
      }
      return new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
    })
  })

  // Convert map to array and sort by parent date (most recent first)
  const conversations = Array.from(conversationMap.values())
    .sort((a, b) => new Date(b.parent.received_at).getTime() - new Date(a.parent.received_at).getTime())

  // Combine conversations and standalone emails, sort by date
  const allItems: (ConversationGroup | DummyEmail)[] = [...conversations, ...standaloneEmails]
  allItems.sort((a, b) => {
    const dateA = 'parent' in a ? new Date(a.parent.received_at) : new Date(a.received_at)
    const dateB = 'parent' in b ? new Date(b.parent.received_at) : new Date(b.received_at)
    return dateB.getTime() - dateA.getTime()
  })

  return allItems
}

export function getConversationEmails(conversationId: string): DummyEmail[] {
  return dummyEmails
    .filter(e => e.conversation_id === conversationId)
    .sort((a, b) => {
      if (a.thread_order && b.thread_order) {
        return b.thread_order - a.thread_order // Reverse order (latest first)
      }
      return new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    })
}
