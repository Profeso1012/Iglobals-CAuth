#!/usr/bin/env node

/**
 * Reset OAuth Client Secret
 * 
 * This script generates a new plain-text secret and its bcrypt hash
 * for updating an OAuth client.
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');

async function generateClientSecret() {
  // Generate a secure random secret (64 characters)
  const plainSecret = crypto.randomBytes(32).toString('hex');
  
  // Hash it with bcrypt (same as ICA server does)
  const hashedSecret = await bcrypt.hash(plainSecret, 12);
  
  console.log('\n=== New OAuth Client Secret ===\n');
  console.log('Plain-text secret (use this in your .env):');
  console.log(plainSecret);
  console.log('\nBcrypt hash (use this in database):');
  console.log(hashedSecret);
  console.log('\n=== SQL Update Command ===\n');
  console.log(`UPDATE ica.oauth_clients`);
  console.log(`SET client_secret_hash = '${hashedSecret}'`);
  console.log(`WHERE client_id = 'ipod_itest_001';`);
  console.log('\n=== .env Configuration ===\n');
  console.log(`ICA_CLIENT_SECRET=${plainSecret}`);
  console.log('\n');
}

generateClientSecret().catch(console.error);
