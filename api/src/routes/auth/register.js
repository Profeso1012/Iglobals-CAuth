const { getUserByEmail, createUser } = require('../../db/queries/users');
const { createConsent } = require('../../db/queries/user_consents');
const { createCode } = require('../../db/queries/authorization_codes');
const { logEvent } = require('../../db/queries/audit_log');
const { getClientById } = require('../../db/queries/oauth_clients');
const { createIcaSession } = require('../../lib/session');
const { hashPassword, generateToken, generateOTP, hashOTP } = require('../../lib/crypto');
const { createEmailVerification } = require('../../db/queries/email_verifications');
const { sendOTP } = require('../../lib/mailer');

module.exports = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone, oauth_context } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(422).json({ error: 'validation_error', error_description: 'Missing required fields', status: 422 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'email_taken', error_description: 'An account with this email address already exists.', status: 409 });
    }

    if (oauth_context) {
      const client = await getClientById(oauth_context.client_id);
      if (!client || !client.redirect_uris.includes(oauth_context.redirect_uri)) {
        return res.status(400).json({ error: 'invalid_oauth_context', error_description: 'client_id not found or redirect_uri does not match.', status: 400 });
      }
    }

    const password_hash = await hashPassword(password);
    const user = await createUser({ email, password_hash, first_name, last_name, phone });

    await createIcaSession(req, res, user.id, false);

    let redirect_to = '/dashboard';
    if (oauth_context) {
      await createConsent({
        user_id: user.id,
        client_id: oauth_context.client_id,
        scopes: oauth_context.scopes || ['openid', 'profile', 'email']
      });

      const code = generateToken(32);
      await createCode({
        code,
        client_id: oauth_context.client_id,
        user_id: user.id,
        scopes: oauth_context.scopes || ['openid', 'profile', 'email'],
        redirect_uri: oauth_context.redirect_uri,
        code_challenge: oauth_context.code_challenge,
        code_challenge_method: 'S256'
      });

      redirect_to = `${oauth_context.redirect_uri}?code=${code}&state=${oauth_context.state}`;
    }

    const otp = generateOTP();
    const otp_hash = await hashOTP(otp);
    await createEmailVerification({ user_id: user.id, email: user.email, otp_hash });
    await sendOTP(user.email, otp);

    await logEvent({ event_type: 'user.registered', user_id: user.id, ip_address: req.ip });

    return res.status(201).json({
      user_id: user.id,
      email: user.email,
      redirect_to
    });

  } catch (err) {
    next(err);
  }
};
