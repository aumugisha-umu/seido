export interface EmailProviderPreset {
    id: string;
    name: string;
    imapHost: string;
    imapPort: number;
    imapUseSsl: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUseTls: boolean;
    setupInstructions?: string;
}

export const EMAIL_PROVIDERS: Record<string, EmailProviderPreset> = {
    gmail: {
        id: 'gmail',
        name: 'Gmail',
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapUseSsl: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUseTls: false,
        setupInstructions: 'Use an App Password instead of your regular password. Generate one at: https://myaccount.google.com/apppasswords'
    },
    outlook: {
        id: 'outlook',
        name: 'Outlook / Office 365',
        imapHost: 'outlook.office365.com',
        imapPort: 993,
        imapUseSsl: true,
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        smtpUseTls: false,
        setupInstructions: 'Enable IMAP in Outlook settings if not already enabled.'
    },
    yahoo: {
        id: 'yahoo',
        name: 'Yahoo Mail',
        imapHost: 'imap.mail.yahoo.com',
        imapPort: 993,
        imapUseSsl: true,
        smtpHost: 'smtp.mail.yahoo.com',
        smtpPort: 587,
        smtpUseTls: false,
        setupInstructions: 'Use an App Password. Generate one in Yahoo Account Security settings.'
    },
    custom: {
        id: 'custom',
        name: 'Custom Provider',
        imapHost: '',
        imapPort: 993,
        imapUseSsl: true,
        smtpHost: '',
        smtpPort: 587,
        smtpUseTls: false,
        setupInstructions: 'Enter your email provider\'s IMAP and SMTP settings manually.'
    }
};

export const PROVIDER_OPTIONS = Object.values(EMAIL_PROVIDERS).map(provider => ({
    value: provider.id,
    label: provider.name
}));
