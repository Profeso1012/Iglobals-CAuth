#!/usr/bin/env node

/**
 * Verify ICA Deployment Configuration
 * 
 * This script checks if the ICA server is configured correctly
 * by verifying the OpenID configuration and JWKS endpoint.
 */

const https = require('https');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function verifyDeployment(baseUrl) {
  console.log('\n' + '='.repeat(60));
  log(COLORS.blue, '🔍 ICA Deployment Verification');
  console.log('='.repeat(60) + '\n');

  log(COLORS.yellow, `Checking: ${baseUrl}\n`);

  // Test 1: OpenID Configuration
  try {
    log(COLORS.blue, '📋 Test 1: OpenID Configuration');
    const configUrl = `${baseUrl}/api/oauth/.well-known/openid-configuration`;
    const config = await fetchJson(configUrl);

    console.log(`   URL: ${configUrl}`);
    console.log(`   Issuer: ${config.issuer}`);

    if (config.issuer === baseUrl) {
      log(COLORS.green, '   ✅ PASS: Issuer matches base URL\n');
    } else {
      log(COLORS.red, `   ❌ FAIL: Issuer mismatch!`);
      log(COLORS.red, `      Expected: ${baseUrl}`);
      log(COLORS.red, `      Got: ${config.issuer}\n`);
      log(COLORS.yellow, '   👉 Fix: Set NEXT_PUBLIC_BASE_URL and ICA_BASE_URL in Vercel\n');
      process.exit(1);
    }
  } catch (error) {
    log(COLORS.red, `   ❌ FAIL: ${error.message}\n`);
    process.exit(1);
  }

  // Test 2: JWKS Endpoint
  try {
    log(COLORS.blue, '🔑 Test 2: JWKS Endpoint');
    const jwksUrl = `${baseUrl}/api/oauth/.well-known/jwks.json`;
    const jwks = await fetchJson(jwksUrl);

    console.log(`   URL: ${jwksUrl}`);
    console.log(`   Keys found: ${jwks.keys?.length || 0}`);

    if (jwks.keys && jwks.keys.length > 0) {
      log(COLORS.green, '   ✅ PASS: JWKS endpoint is working\n');
    } else {
      log(COLORS.red, '   ❌ FAIL: No keys found in JWKS\n');
      process.exit(1);
    }
  } catch (error) {
    log(COLORS.red, `   ❌ FAIL: ${error.message}\n`);
    process.exit(1);
  }

  // Test 3: Health check
  try {
    log(COLORS.blue, '💚 Test 3: Server Health');
    const healthUrl = `${baseUrl}/api/health`;
    
    await new Promise((resolve, reject) => {
      https.get(healthUrl, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve();
        } else {
          reject(new Error(`Unexpected status: ${res.statusCode}`));
        }
      }).on('error', reject);
    });

    log(COLORS.green, '   ✅ PASS: Server is reachable\n');
  } catch (error) {
    log(COLORS.yellow, `   ⚠️  WARNING: ${error.message}\n`);
  }

  // Summary
  console.log('='.repeat(60));
  log(COLORS.green, '✅ All critical tests passed!');
  log(COLORS.green, '🎉 Your ICA deployment is configured correctly.');
  console.log('='.repeat(60) + '\n');

  log(COLORS.blue, 'Next steps:');
  console.log('1. Test OAuth flow from your client application');
  console.log('2. Verify JWT tokens are accepted by the SDK');
  console.log('3. Check that user login completes successfully\n');
}

// Main
const baseUrl = process.argv[2] || 'https://iglobals-c-auth-web.vercel.app';

if (baseUrl.endsWith('/')) {
  // Remove trailing slash
  verifyDeployment(baseUrl.slice(0, -1));
} else {
  verifyDeployment(baseUrl);
}
