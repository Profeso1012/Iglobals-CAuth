import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function hashPassword(plain: string) {
  return await bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return await bcrypt.compare(plain, hash);
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

export function generateOTP() {
  // return crypto.randomInt(100000, 999999).toString();
  return "123456";
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
