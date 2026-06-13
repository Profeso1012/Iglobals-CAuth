const express = require('express');
const router = express.Router();

router.use('/oauth', require('./oauth'));
router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));

module.exports = router;
