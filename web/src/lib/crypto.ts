import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function hashPassword(plain: string) {
  return await bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  if (!plain || !hash) {
    throw new Error('Password and hash are required for verification');
  }
  
  // Add timeout protection (30 seconds max)
  return Promise.race([
    bcrypt.compare(plain, hash),
    new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Password verification timeout')), 30000)
    )
  ]);
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(data: string) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function base64urlEncode(buf: Buffer) {
  return buf.toString('base64url');
}

export function generateOTP(useFixed: boolean = false) {
  // Use fixed OTP only for phone verification (654321)
  if (useFixed) {
    return "654321";
  }
  // Use random OTP for email verification and password reset
  return crypto.randomInt(100000, 999999).toString();
}

export async function hashOTP(otp: string) {
  return await bcrypt.hash(otp, 10);
}

export async function verifyOTP(otp: string, hash: string) {
  return await bcrypt.compare(otp, hash);
}

export function pkceChallenge(verifier: string) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64urlEncode(hash);
}

// Reversible encryption for secrets ICA must reproduce in plaintext later -
// unlike client_secret_hash (bcrypt, one-way, only ever verified against),
// a webhook relay secret must be readable back out to compute an outbound
// HMAC signature at forward-time. Key comes from WEBHOOK_SECRET_ENCRYPTION_KEY
// (32 raw bytes, hex-encoded in env - see config.ts).
const GCM_IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const hex = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('WEBHOOK_SECRET_ENCRYPTION_KEY is not set');
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('WEBHOOK_SECRET_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  }
  return key;
}

/** Returns "iv:authTag:ciphertext", all hex-encoded. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptSecret(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Malformed encrypted secret');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]);
  return plaintext.toString('utf8');
}
