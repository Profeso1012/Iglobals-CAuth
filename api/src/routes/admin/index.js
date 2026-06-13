const express = require('express');
const router = express.Router();
const requireAdminJwt = require('../../middleware/requireAdminJwt');

router.post('/login', require('./login'));
router.use(requireAdminJwt); // All routes below require admin JWT

router.post('/clients', require('./clients'));
router.patch('/clients/:clientId', require('./clients'));
router.post('/clients/:clientId/rotate-secret', require('./clients'));
router.get('/users/:userId', require('./users'));
router.post('/users/:userId/disable', require('./users'));

module.exports = router;
