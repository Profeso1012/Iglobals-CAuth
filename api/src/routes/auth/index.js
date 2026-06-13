const requireIcaSession = require('../../middleware/requireIcaSession');
const { otpLimiter } = require('../../lib/rateLimit');
const express = require('express');
const router = express.Router();

router.get('/me', requireIcaSession, require('./me'));
router.patch('/me', requireIcaSession, require('./updateMe'));
router.post('/register', require('./register'));
router.post('/login', require('./login'));
router.post('/logout', requireIcaSession, require('./logout'));
router.post('/verify-email', requireIcaSession, otpLimiter, require('./verifyEmail'));
router.post('/send-email-verification', requireIcaSession, require('./sendEmailVerification'));
router.post('/verify-phone', requireIcaSession, otpLimiter, require('./verifyPhone'));
router.post('/send-phone-verification', requireIcaSession, require('./sendPhoneVerification'));
router.post('/forgot-password', require('./forgotPassword'));
router.post('/reset-password', require('./resetPassword'));
router.post('/change-password', requireIcaSession, require('./changePassword'));
router.get('/sessions', requireIcaSession, require('./sessions'));
router.delete('/sessions/:sessionId', requireIcaSession, require('./sessions'));
router.get('/apps', requireIcaSession, require('./apps'));
router.delete('/apps/:clientId', requireIcaSession, require('./apps'));

module.exports = router;
