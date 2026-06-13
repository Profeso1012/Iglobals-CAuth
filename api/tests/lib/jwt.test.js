require('dotenv').config({ path: '../.env' }); // load test env
const { signAccessToken, signIdToken, verifyToken, decodeTokenUnsafe } = require('../../src/lib/jwt');

describe('JWT Library', () => {
  it('signs and verifies an access token', () => {
    const payload = {
      sub: 'user-123',
      aud: 'client-123',
      scope: 'openid profile',
      email: 'test@example.com',
      email_verified: true,
    };

    const token = signAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyToken(token, 'client-123');
    expect(decoded.sub).toBe('user-123');
    expect(decoded.aud).toBe('client-123');
    expect(decoded.scope).toBe('openid profile');
  });

  it('signs an id token', () => {
    const payload = {
      sub: 'user-123',
      aud: 'client-123',
      claims: {
        given_name: 'Test',
        family_name: 'User',
      }
    };

    const token = signIdToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyToken(token, 'client-123');
    expect(decoded.given_name).toBe('Test');
    expect(decoded.family_name).toBe('User');
  });
});
