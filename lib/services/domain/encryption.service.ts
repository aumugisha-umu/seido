import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY!; // 32 bytes (généré une fois)
const IV_LENGTH = 16;

export class EncryptionService {
  /**
   * Chiffre un mot de passe avec AES-256-CBC
   */
  static encryptPassword(password: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('EMAIL_ENCRYPTION_KEY is not defined');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Format: IV:EncryptedPassword
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Déchiffre un mot de passe
   */
  static decryptPassword(encryptedPassword: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('EMAIL_ENCRYPTION_KEY is not defined');
    }

    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
