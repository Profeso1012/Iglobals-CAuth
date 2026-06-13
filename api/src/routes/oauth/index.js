const express = require('express');
const router = express.Router();

router.get('/authorize', require('./authorize'));
router.post('/token', require('./token'));
router.post('/revoke', require('./revoke'));
router.post('/consent', require('./consent'));
router.get('/userinfo', require('./userinfo'));
router.get('/jwks', require('./jwks'));
router.get('/.well-known/openid-configuration', require('./discovery'));

module.exports = router;
