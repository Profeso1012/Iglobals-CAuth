const jwt = require('jsonwebtoken');
const config = require('../../config');

// Admin login is NOT public — it's protected by a strong shared secret
// stored only server-side. This creates a short-lived admin JWT.
module.exports = async (req, res, next) => {
  try {
    const { admin_secret } = req.body;
    if (!admin_secret || admin_secret !== config.adminSecret) {
      return res.status(401).json({ error: 'unauthorized', error_description: 'Invalid admin credentials.', status: 401 });
    }

    const token = jwt.sign(
      { role: 'ica_admin' },
      config.adminJwtSecret,
      { expiresIn: '4h' }
    );

    res.json({ admin_token: token, expires_in: 14400 });
  } catch (err) {
    next(err);
  }
};
