/**
 * Test script to verify the client API endpoint and database data
 * Run with: node scripts/test-client-api.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testClientApi() {
  console.log('🔍 Testing Client API Endpoint Setup\n');

  try {
    // 1. Check database for client data
    console.log('📊 Step 1: Checking database for client data...');
    const result = await pool.query(
      `SELECT client_id, name, logo_url, redirect_uris FROM ica.oauth_clients WHERE client_id = $1`,
      ['ipod_itest_001']
    );

    if (result.rows.length === 0) {
      console.log('❌ Client "ipod_itest_001" not found in database');
      console.log('\n💡 To create the client, run:');
      console.log(`INSERT INTO ica.oauth_clients (client_id, client_secret_hash, name, logo_url, redirect_uris, allowed_scopes)
VALUES (
  'ipod_itest_001',
  '$2b$10$dummyhash',
  'iPod Test Application',
  'https://example.com/logo.png',
  ARRAY['http://localhost:8000/callback'],
  ARRAY['openid', 'profile', 'email']
);`);
      process.exit(1);
    }

    const client = result.rows[0];
    console.log('✅ Client found in database:');
    console.log('   - Client ID:', client.client_id);
    console.log('   - Name:', client.name || '(null)');
    console.log('   - Logo URL:', client.logo_url || '(null)');
    console.log('   - Redirect URIs:', client.redirect_uris);

    // 2. Check if logo_url needs to be updated
    if (!client.logo_url || !client.name) {
      console.log('\n⚠️  Missing client name or logo_url');
      console.log('💡 To update, run:');
      console.log(`UPDATE ica.oauth_clients SET 
  name = 'iPod Test Application',
  logo_url = 'https://example.com/logo.png'
WHERE client_id = 'ipod_itest_001';`);
    }

    // 3. Test API endpoint (if dev server is running)
    console.log('\n🌐 Step 2: Testing API endpoint (requires dev server running)...');
    console.log('   URL: http://localhost:3000/api/oauth/clients/ipod_itest_001');
    console.log('\n💡 To test the API:');
    console.log('   1. Start the dev server: cd web && npm run dev');
    console.log('   2. Open in browser or curl: http://localhost:3000/api/oauth/clients/ipod_itest_001');
    console.log('   3. Expected response:');
    console.log('      {');
    console.log('        "client_id": "ipod_itest_001",');
    console.log('        "name": "iPod Test Application",');
    console.log('        "logo_url": "https://example.com/logo.png"');
    console.log('      }');

    console.log('\n✅ Database check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testClientApi();
