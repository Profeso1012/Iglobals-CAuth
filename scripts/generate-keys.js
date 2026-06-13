const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

let envContent = fs.readFileSync(envPath, 'utf8');

// Escape newlines for .env
const privEnv = privateKey.replace(/\n/g, '\\n');
const pubEnv = publicKey.replace(/\n/g, '\\n');

envContent = envContent.replace(/JWT_PRIVATE_KEY=".*"/, `JWT_PRIVATE_KEY="${privEnv}"`);
envContent = envContent.replace(/JWT_PUBLIC_KEY=".*"/, `JWT_PUBLIC_KEY="${pubEnv}"`);

fs.writeFileSync(envPath, envContent);

console.log('JWT keys generated and added to .env');
