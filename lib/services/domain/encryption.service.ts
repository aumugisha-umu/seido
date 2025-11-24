import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY!; // Must be 32 bytes (64 hex characters)
const IV_LENGTH = 12; // Recommended for GCM
const ALGORITHM = 'aes-256-gcm';

export class EncryptionService {
  /**
   * Encrypts a text using AES-256-GCM
   * Returns format: iv:authTag:encryptedContent
   */
  static encrypt(text: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('EMAIL_ENCRYPTION_KEY is not defined');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedContent
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts a text using AES-256-GCM
   * Expects format: iv:authTag:encryptedContent
   */
  static decrypt(encryptedText: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('EMAIL_ENCRYPTION_KEY is not defined');
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format. Expected iv:authTag:encryptedContent');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
