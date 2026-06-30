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
