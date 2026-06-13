const rateLimit = require('express-rate-limit');
const config = require('../config');

// We are implementing in-memory for this setup, but it can be swapped to Redis
function createRateLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        error: 'too_many_requests',
        error_description: options.message,
        status: options.statusCode,
      });
    },
    ...options,
  });
}

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Try again in 15 minutes.',
});

const otpLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many OTP requests. Try again later.',
});

const tokenLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many token requests.',
});

module.exports = {
  loginLimiter,
  otpLimiter,
  tokenLimiter,
};
