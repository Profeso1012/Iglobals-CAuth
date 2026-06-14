#!/usr/bin/env node

/**
 * Test script to verify client data fetching
 * Run: node scripts/test-client-fetch.js
 */

const https = require('https');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const CLIENT_ID = process.argv[3] || 'ipod_itest_001';

console.log('\n🔍 Testing Client Data Fetch');
console.log('=====================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Client ID: ${CLIENT_ID}`);
console.log('');

const url = `${BASE_URL}/api/oauth/clients/${CLIENT_ID}`;

console.log(`📡 Fetching: ${url}\n`);

const protocol = BASE_URL.startsWith('https') ? https : require('http');

protocol.get(url, (res) => {
  let data = '';
  
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, JSON.stringify(res.headers, null, 2));
  console.log('');
  
  res.on('data', chunk => data += chunk);
  
  res.on('end', () => {
    console.log('Response Body:');
    console.log(data);
    console.log('');
    
    try {
      const json = JSON.parse(data);
      console.log('Parsed JSON:');
      console.log(JSON.stringify(json, null, 2));
      console.log('');
      
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS!');
        console.log(`   Client Name: ${json.name || 'NOT SET'}`);
        console.log(`   Logo URL: ${json.logo_url || 'NOT SET'}`);
        
        if (!json.logo_url) {
          console.log('\n⚠️  WARNING: logo_url is null or missing');
          console.log('   To fix, update your database:');
          console.log(`   UPDATE ica.oauth_clients SET logo_url = 'https://example.com/logo.png' WHERE client_id = '${CLIENT_ID}';`);
        }
      } else {
        console.log('❌ ERROR: Request failed');
      }
    } catch (e) {
      console.log('❌ ERROR: Failed to parse JSON');
      console.log(e.message);
    }
  });
}).on('error', (err) => {
  console.log('❌ ERROR: Request failed');
  console.log(err.message);
});

console.log('\n📋 Usage:');
console.log('  node scripts/test-client-fetch.js [BASE_URL] [CLIENT_ID]');
console.log('  Example: node scripts/test-client-fetch.js http://localhost:3000 ipod_itest_001');
console.log('');
