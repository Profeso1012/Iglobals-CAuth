const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAdminJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Admin Bearer token missing or malformed.',
      status: 401,
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.adminJwtSecret);
    if (payload.role !== 'ica_admin') {
      return res.status(403).json({
        error: 'forbidden',
        error_description: 'Token does not have admin privileges.',
        status: 403,
      });
    }
    req.adminUser = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Invalid or expired admin token.',
      status: 401,
    });
  }
}

module.exports = requireAdminJwt;
