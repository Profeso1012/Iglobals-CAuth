#!/usr/bin/env node

/**
 * Grant ICA admin-panel access to an email address.
 *
 * Admin login (POST /api/admin/auth/login) checks the login passphrase
 * (ADMIN_SECRET) AND that the email is present in ica.admin_emails - there is
 * no signup flow for this, it's an explicit allowlist. This script is the
 * only way today to add a new admin short of a raw SQL insert.
 *
 * Usage: node scripts/add-admin-email.js someone@example.com
 */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/add-admin-email.js <email>');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query(
      `INSERT INTO ica.admin_emails (email) VALUES ($1)
       ON CONFLICT (email) DO NOTHING
       RETURNING email`,
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      console.log(`${email} is already an admin - nothing to do.`);
    } else {
      console.log(`Added ${email} as an ICA admin.`);
      console.log(`They can now log in at /admin/login with the ADMIN_SECRET passphrase - `);
      console.log(`ICA will email a one-time code to ${email} to complete login.`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
