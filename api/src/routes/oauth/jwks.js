const { getJwks } = require('../../lib/jwks');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(getJwks());
};
