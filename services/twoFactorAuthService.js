/**
 * 🔐 Two-Factor Authentication (2FA) Service
 * 
 * Banking-Grade TOTP (Time-based One-Time Password) implementation
 * Uses RFC 6238 standard for TOTP generation
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class TwoFactorAuthService {
  constructor() {
    // Banking-Grade: 30-second time window (standard TOTP)
    this.step = 30;
    // Banking-Grade: 6-digit codes (industry standard)
    this.digits = 6;
    // Banking-Grade: SHA-1 algorithm (TOTP standard)
    this.algorithm = 'sha1';
    // Banking-Grade: Issuer name for authenticator apps
    this.issuer = 'MyMoolah Treasury Platform';
  }

  /**
   * Generate a new 2FA secret for a user
   * @param {string} email - User email
   * @returns {Object} Secret and QR code data
   */
  generateSecret(email) {
    const secret = speakeasy.generateSecret({
      name: `${this.issuer} (${email})`,
      issuer: this.issuer,
      length: 32 // Banking-Grade: 32-byte secret
    });

    return {
      secret: secret.base32, // Base32 encoded secret (for storage)
      qrCodeUrl: secret.otpauth_url, // QR code URL
      manualEntryKey: secret.base32 // For manual entry
    };
  }

  /**
   * Generate QR code image data URL
   * @param {string} otpauthUrl - OTP Auth URL
   * @returns {Promise<string>} Data URL of QR code
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('❌ QR code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token
   * @param {string} token - 6-digit TOTP token
   * @param {string} secret - Base32 encoded secret
   * @param {Object} options - Verification options
   * @returns {boolean} True if token is valid
   */
  verifyToken(token, secret, options = {}) {
    const {
      window = 2, // Banking-Grade: Allow 2 time steps before/after (60 seconds total)
      encoding = 'base32'
    } = options;

    // Validate token format
    if (!token || !/^\d{6}$/.test(token)) {
      return false;
    }

    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: encoding,
        token: token,
        window: window,
        step: this.step
      });

      return verified === true;
    } catch (error) {
      console.error('❌ 2FA verification error:', error);
      return false;
    }
  }

  /**
   * Generate a backup code (for account recovery)
   * @returns {string} 8-digit backup code
   */
  generateBackupCode() {
    // Banking-Grade: Cryptographically secure random backup codes
    const bytes = crypto.randomBytes(4);
    const code = bytes.readUInt32BE(0) % 100000000;
    return code.toString().padStart(8, '0');
  }

  /**
   * Generate multiple backup codes
   * @param {number} count - Number of backup codes to generate
   * @returns {Array<string>} Array of backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.generateBackupCode());
    }
    return codes;
  }

  /**
   * Verify a backup code
   * @param {string} code - Backup code to verify
   * @param {Array<string>} validCodes - Array of valid backup codes
   * @returns {boolean} True if code is valid
   */
  verifyBackupCode(code, validCodes) {
    if (!code || !validCodes || !Array.isArray(validCodes)) {
      return false;
    }
    return validCodes.includes(code);
  }

  /**
   * Encrypt secret for storage (optional - for additional security)
   * @param {string} secret - Base32 encoded secret
   * @param {string} encryptionKey - Encryption key (from environment)
   * @returns {string} Encrypted secret
   */
  encryptSecret(secret, encryptionKey) {
    if (!encryptionKey) {
      // If no encryption key, return as-is (storage should be encrypted at DB level)
      return secret;
    }

    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return IV + AuthTag + Encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt secret for use
   * @param {string} encryptedSecret - Encrypted secret
   * @param {string} encryptionKey - Encryption key
   * @returns {string} Decrypted secret
   */
  decryptSecret(encryptedSecret, encryptionKey) {
    if (!encryptionKey || !encryptedSecret.includes(':')) {
      // If no encryption key or not encrypted, return as-is
      return encryptedSecret;
    }

    try {
      const [ivHex, authTagHex, encrypted] = encryptedSecret.split(':');
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(encryptionKey, 'salt', 32);
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('❌ Secret decryption error:', error);
      throw new Error('Failed to decrypt secret');
    }
  }
}

module.exports = new TwoFactorAuthService();

