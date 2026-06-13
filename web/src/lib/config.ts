export const config = {
  dbUrl: process.env.DATABASE_URL!,
  jwt: {
    privateKey: process.env.JWT_PRIVATE_KEY!,
    publicKey: process.env.JWT_PUBLIC_KEY!,
    kid: process.env.JWT_KID!,
  },
  sessionSecret: process.env.SESSION_SECRET!,
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || process.env.ICA_BASE_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  smtp: {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
    from: process.env.SMTP_FROM!,
  },
  termii: {
    apiKey: process.env.TERMII_API_KEY!,
    senderId: process.env.TERMII_SENDER_ID!,
  },
  adminJwtSecret: process.env.ADMIN_JWT_SECRET!,
  adminSecret: process.env.ADMIN_SECRET,
  redisUrl: process.env.REDIS_URL,
};
