const { hashPassword, verifyPassword, generateToken, sha256, base64urlEncode, generateOTP, pkceChallenge } = require('../../src/lib/crypto');

describe('Crypto Library', () => {
  it('hashes and verifies a password successfully', async () => {
    const password = 'Str0ng!Password123';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash).not.toEqual(password);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isMatchBad = await verifyPassword('WrongPassword', hash);
    expect(isMatchBad).toBe(false);
  });

  it('generates a random token', () => {
    const token = generateToken(32);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes hex = 64 chars
  });

  it('computes sha256 hash', () => {
    const data = 'test_string';
    const hash = sha256(data);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });

  it('computes PKCE challenge correctly', () => {
    const verifier = 'my_super_secret_verifier_string_12345';
    const challenge = pkceChallenge(verifier);
    expect(challenge).toBeDefined();
    expect(typeof challenge).toBe('string');
  });

  it('generates an OTP', () => {
    const otp = generateOTP();
    expect(otp).toBeDefined();
    expect(otp.length).toBe(6);
  });
});
