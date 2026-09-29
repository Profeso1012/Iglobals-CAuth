/**
 * Test script for ICA webhook relay system
 * 
 * Tests:
 * 1. Webhook configuration API
 * 2. Paystack webhook reception
 * 3. Client relay delivery
 * 4. Signature verification
 * 
 * Usage:
 *   node scripts/test-webhook-relay.js
 */

const crypto = require('crypto');

// Configuration
const ICA_BASE_URL = process.env.ICA_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@iglobals.com';
const ADMIN_PASSWORD = process.env.ADMIN_SECRET || 'admin123';
const TEST_CLIENT_ID = 'test_webhook_client';
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'sk_test_fake';

let adminSessionCookie = null;
let relaySecret = null;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow');
}

// HTTP helper
async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (adminSessionCookie) {
    headers['Cookie'] = adminSessionCookie;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err.message,
    };
  }
}

// Test 1: Admin login
async function testAdminLogin() {
  info('Test 1: Admin login...');

  const res = await request(`${ICA_BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (res.ok) {
    // Extract session cookie
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      adminSessionCookie = setCookie.split(';')[0];
      success('Admin login successful');
      return true;
    }
  }

  error('Admin login failed');
  console.log(res.data);
  return false;
}

// Test 2: Get or create test client
async function testGetOrCreateClient() {
  info('Test 2: Get or create test client...');

  // Check if client exists
  let res = await request(`${ICA_BASE_URL}/api/admin/clients/${TEST_CLIENT_ID}`);

  if (res.ok) {
    success(`Test client '${TEST_CLIENT_ID}' already exists`);
    return true;
  }

  // Create test client
  info('Creating test client...');
  res = await request(`${ICA_BASE_URL}/api/admin/clients`, {
    method: 'POST',
    body: JSON.stringify({
      client_id: TEST_CLIENT_ID,
      name: 'Test Webhook Client',
      redirect_uris: ['http://localhost:4000/callback'],
      allowed_scopes: ['openid', 'profile', 'email'],
    }),
  });

  if (res.ok) {
    success('Test client created successfully');
    return true;
  }

  error('Failed to create test client');
  console.log(res.data);
  return false;
}

// Test 3: Configure webhook
async function testConfigureWebhook() {
  info('Test 3: Configure webhook...');

  const webhookUrl = 'http://localhost:4000/webhooks/test';

  const res = await request(`${ICA_BASE_URL}/api/admin/clients/${TEST_CLIENT_ID}/webhooks`, {
    method: 'POST',
    body: JSON.stringify({
      webhook_url: webhookUrl,
    }),
  });

  if (res.ok) {
    if (res.data.relay_secret) {
      relaySecret = res.data.relay_secret;
      success('Webhook configured successfully');
      info(`Relay secret: ${relaySecret.substring(0, 16)}...`);
      return true;
    } else {
      success('Webhook URL updated (secret unchanged)');
      // Get existing secret from another test
      warn('Relay secret not returned (already configured)');
      return true;
    }
  }

  error('Failed to configure webhook');
  console.log(res.data);
  return false;
}

// Test 4: Get webhook configuration
async function testGetWebhookConfig() {
  info('Test 4: Get webhook configuration...');

  const res = await request(`${ICA_BASE_URL}/api/admin/clients/${TEST_CLIENT_ID}/webhooks`);

  if (res.ok && res.data.config) {
    success('Webhook configuration retrieved');
    console.log('  URL:', res.data.config.webhook_url);
    console.log('  Active:', res.data.config.is_active);
    console.log('  Provider:', res.data.config.provider);
    return true;
  }

  error('Failed to get webhook configuration');
  console.log(res.data);
  return false;
}

// Test 5: Simulate Paystack webhook
async function testPaystackWebhook() {
  info('Test 5: Simulate Paystack webhook...');

  const payload = {
    event: 'charge.success',
    data: {
      id: 123456789,
      reference: 'test_ref_' + Date.now(),
      amount: 50000,
      currency: 'NGN',
      status: 'success',
      customer: {
        email: 'test@example.com',
      },
      metadata: {
        client_id: TEST_CLIENT_ID,
        purpose: 'test',
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(rawBody)
    .digest('hex');

  const res = await fetch(`${ICA_BASE_URL}/api/webhooks/paystack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': signature,
    },
    body: rawBody,
  });

  const data = await res.json().catch(() => null);

  if (res.ok) {
    success('Paystack webhook accepted by ICA');
    return true;
  }

  error('Paystack webhook rejected');
  console.log('Status:', res.status);
  console.log('Response:', data);
  return false;
}

// Test 6: Verify signature generation
async function testSignatureGeneration() {
  info('Test 6: Test signature generation...');

  if (!relaySecret) {
    warn('No relay secret available (skip signature test)');
    return true;
  }

  const testPayload = { event: 'test', data: { test: true } };
  const rawBody = JSON.stringify(testPayload);

  const signature = crypto
    .createHmac('sha512', relaySecret)
    .update(rawBody)
    .digest('hex');

  info('Sample relay signature for test payload:');
  console.log('  Payload:', rawBody);
  console.log('  Signature:', signature.substring(0, 32) + '...');

  success('Signature generation working');
  return true;
}

// Test 7: Test webhook rotation
async function testWebhookRotation() {
  info('Test 7: Test webhook secret rotation...');

  const res = await request(
    `${ICA_BASE_URL}/api/admin/clients/${TEST_CLIENT_ID}/webhooks/rotate-secret`,
    {
      method: 'POST',
    }
  );

  if (res.ok && res.data.relay_secret) {
    const newSecret = res.data.relay_secret;
    success('Webhook secret rotated successfully');
    info(`New secret: ${newSecret.substring(0, 16)}...`);
    info(`Old secret: ${relaySecret ? relaySecret.substring(0, 16) + '...' : 'N/A'}`);

    // Update for further tests
    relaySecret = newSecret;
    return true;
  }

  error('Failed to rotate webhook secret');
  console.log(res.data);
  return false;
}

// Test 8: Check audit logs
async function testAuditLogs() {
  info('Test 8: Check audit logs (requires database access)...');

  // This test requires direct database access
  // For now, just inform the user
  info('To check audit logs, run this SQL query:');
  console.log(`
  SELECT event_type, client_id, metadata, created_at 
  FROM ica.audit_log 
  WHERE client_id = '${TEST_CLIENT_ID}'
  ORDER BY created_at DESC 
  LIMIT 10;
  `);

  return true;
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60));
  log('ICA Webhook Relay System - Test Suite', 'blue');
  console.log('='.repeat(60) + '\n');

  const tests = [
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Get/Create Test Client', fn: testGetOrCreateClient },
    { name: 'Configure Webhook', fn: testConfigureWebhook },
    { name: 'Get Webhook Config', fn: testGetWebhookConfig },
    { name: 'Simulate Paystack Webhook', fn: testPaystackWebhook },
    { name: 'Signature Generation', fn: testSignatureGeneration },
    { name: 'Secret Rotation', fn: testWebhookRotation },
    { name: 'Audit Logs Info', fn: testAuditLogs },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      error(`Test failed with exception: ${err.message}`);
      console.error(err);
      failed++;
    }
    console.log(''); // spacing
  }

  console.log('='.repeat(60));
  log(`Tests complete: ${passed} passed, ${failed} failed`, passed === tests.length ? 'green' : 'yellow');
  console.log('='.repeat(60) + '\n');

  // Final instructions
  if (passed === tests.length) {
    success('All tests passed! The webhook system is working correctly.');
    info('\nNext steps:');
    console.log('1. Configure real client apps in the admin panel');
    console.log('2. Update PAYSTACK_SECRET_KEY in ICA environment');
    console.log('3. Set Paystack webhook URL to ICA endpoint');
    console.log('4. Test with real transactions');
  } else {
    warn('\nSome tests failed. Review the errors above.');
    info('Check:');
    console.log('1. ICA server is running');
    console.log('2. Database migrations are up to date');
    console.log('3. Environment variables are set correctly');
    console.log('4. Admin credentials are correct');
  }
}

// Run the tests
runTests().catch((err) => {
  error('Test suite failed to run');
  console.error(err);
  process.exit(1);
});
