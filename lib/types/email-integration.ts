export type EmailDirection = 'received' | 'sent';
export type EmailStatus = 'unread' | 'read' | 'archived' | 'deleted';

export interface TeamEmailConnection {
    id: string;
    team_id: string;
    provider: string;
    email_address: string;
    sync_from_date?: string | null;

    imap_host: string;
    imap_port: number;
    imap_use_ssl: boolean;
    imap_username: string;
    imap_password_encrypted: string;

    smtp_host: string;
    smtp_port: number;
    smtp_use_tls: boolean;
    smtp_username: string;
    smtp_password_encrypted: string;

    last_uid: number;
    last_sync_at?: string | null;
    is_active: boolean;
    last_error?: string | null;

    created_at: string;
    updated_at: string;
}

export interface Email {
    id: string;
    team_id: string;
    email_connection_id: string | null;

    direction: EmailDirection;
    status: EmailStatus;
    deleted_at: string | null;

    message_id: string | null;
    in_reply_to: string | null;
    references: string | null;

    from_address: string;
    to_addresses: string[];
    cc_addresses: string[] | null;
    bcc_addresses: string[] | null;

    subject: string;
    body_text: string | null;
    body_html: string | null;

    building_id: string | null;
    lot_id: string | null;
    intervention_id: string | null;

    received_at: string | null;
    sent_at: string | null;
    created_at: string;

    // Joined fields
    attachments?: EmailAttachment[];
}

export interface EmailAttachment {
    id: string;
    email_id: string;
    filename: string;
    content_type: string | null;
    size_bytes: number;
    storage_path: string;
    created_at: string;
}

export interface EmailBlacklist {
    id: string;
    team_id: string;
    sender_email: string;
    sender_domain: string | null;
    reason: string | null;
    blocked_by_user_id: string | null;
    created_at: string;
}
