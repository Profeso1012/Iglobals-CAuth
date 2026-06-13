const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function hashPassword(plain) {
  return await bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hash) {
  return await bcrypt.compare(plain, hash);
}

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function base64urlEncode(buf) {
  return buf.toString('base64url');
}

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

async function hashOTP(otp) {
  return await bcrypt.hash(otp, 10);
}

async function verifyOTP(otp, hash) {
  return await bcrypt.compare(otp, hash);
}

function pkceChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64urlEncode(hash);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  sha256,
  base64urlEncode,
  generateOTP,
  hashOTP,
  verifyOTP,
  pkceChallenge,
};
