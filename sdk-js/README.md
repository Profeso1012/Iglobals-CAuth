# iGlobals Auth Client - JavaScript/TypeScript SDK

Official JavaScript/TypeScript SDK for integrating with iGlobals Central Auth (ICA) - an OAuth 2.0 and OpenID Connect authentication server.

## Installation

```bash
npm install @iglobals/auth-client
```

## Quick Start

```typescript
import { ICAClient } from '@iglobals/auth-client';

// Initialize the client
const client = new ICAClient({
  baseUrl: 'https://auth.yourdomain.com',      // Your ICA deployment URL
  clientId: 'your-client-id',                  // From admin portal
  clientSecret: 'your-client-secret',          // From admin portal
  redirectUri: 'https://yourapp.com/callback', // Your callback URL
  scopes: ['openid', 'profile', 'email']       // Optional, defaults shown
});

// Generate PKCE challenge
const { codeVerifier, codeChallenge } = client.generatePKCE();
const state = crypto.randomUUID();

// Get authorization URL
const authUrl = client.getAuthorizationUrl(state, codeChallenge);

// Redirect user to authUrl
window.location.href = authUrl;
```

## Complete OAuth Flow Example

```typescript
import express from 'express';
import { ICAClient } from '@iglobals/auth-client';

const app = express();

const client = new ICAClient({
  baseUrl: 'https://auth.yourdomain.com',
  clientId: process.env.ICA_CLIENT_ID!,
  clientSecret: process.env.ICA_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/callback',
});

// Store PKCE values per session (use proper session management in production)
const sessions = new Map();

// Login route
app.get('/login', (req, res) => {
  const { codeVerifier, codeChallenge } = client.generatePKCE();
  const state = crypto.randomUUID();
  
  // Store for callback
  sessions.set(state, { codeVerifier });
  
  const authUrl = client.getAuthorizationUrl(state, codeChallenge);
  res.redirect(authUrl);
});

// Callback route
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  const session = sessions.get(state);
  if (!session) {
    return res.status(400).send('Invalid state');
  }
  
  try {
    // Exchange code for tokens
    const tokens = await client.exchangeCode(code as string, session.codeVerifier);
    
    // Get user info
    const userInfo = await client.getUserInfo(tokens.access_token);
    
    // Store tokens securely (use httpOnly cookies in production)
    res.json({
      user: userInfo,
      tokens: tokens
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.listen(3000);
```

## API Reference

### `ICAClient`

#### Constructor

```typescript
new ICAClient(config: ICAConfig)
```

**Config Options:**
- `baseUrl` (string, required): Your ICA server URL (e.g., `https://auth.yourdomain.com`)
- `clientId` (string, required): OAuth client ID from ICA admin portal
- `clientSecret` (string, required): OAuth client secret from ICA admin portal
- `redirectUri` (string, required): Your application's callback URL
- `scopes` (string[], optional): OAuth scopes. Default: `['openid', 'profile', 'email']`

#### Methods

##### `generatePKCE()`
Generates a PKCE code verifier and challenge.

```typescript
const { codeVerifier, codeChallenge } = client.generatePKCE();
```

**Returns:**
- `codeVerifier`: Random string to verify the authorization
- `codeChallenge`: SHA-256 hash for the authorization request

---

##### `getAuthorizationUrl(state: string, codeChallenge: string)`
Builds the OAuth authorization URL.

```typescript
const authUrl = client.getAuthorizationUrl(state, codeChallenge);
```

**Parameters:**
- `state`: Random string for CSRF protection
- `codeChallenge`: From `generatePKCE()`

**Returns:** Authorization URL to redirect the user to

---

##### `exchangeCode(code: string, codeVerifier: string)`
Exchanges authorization code for tokens.

```typescript
const tokens = await client.exchangeCode(code, codeVerifier);
```

**Parameters:**
- `code`: Authorization code from callback
- `codeVerifier`: From `generatePKCE()`

**Returns:** `TokenSet`
```typescript
{
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;        // Seconds until expiration
  refresh_token: string;
  id_token?: string;         // If 'openid' scope requested
  scope: string;
}
```

---

##### `refreshAccessToken(refreshToken: string)`
Gets a new access token using a refresh token.

```typescript
const newTokens = await client.refreshAccessToken(tokens.refresh_token);
```

**Returns:** New `TokenSet`

---

##### `getUserInfo(accessToken: string)`
Fetches user profile information.

```typescript
const userInfo = await client.getUserInfo(tokens.access_token);
```

**Returns:** `UserInfoClaims`
```typescript
{
  sub: string;                  // User ID
  email?: string;              // If 'email' scope
  email_verified?: boolean;
  given_name?: string;         // If 'profile' scope
  family_name?: string;
  phone_number?: string;       // If 'phone' scope
  phone_number_verified?: boolean;
  address?: {                  // If 'address' scope
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
}
```

---

##### `verifyToken(jwt: string)`
Verifies a JWT token's signature using JWKS.

```typescript
const payload = await client.verifyToken(tokens.access_token);
```

**Returns:** Decoded JWT payload

---

##### `revokeToken(refreshToken: string)`
Revokes a refresh token.

```typescript
await client.revokeToken(tokens.refresh_token);
```

**Returns:** `{ revoked: boolean }`

---

## Express Middleware

Protect routes with automatic token verification:

```typescript
import { ICAMiddleware } from '@iglobals/auth-client';

app.use(ICAMiddleware({
  baseUrl: 'https://auth.yourdomain.com',
  clientId: 'your-client-id'
}));

// Protected route
app.get('/profile', (req, res) => {
  // req.user contains verified user info
  res.json({ user: req.user });
});
```

## Error Handling

```typescript
import { ICAError } from '@iglobals/auth-client';

try {
  const tokens = await client.exchangeCode(code, verifier);
} catch (error) {
  if (error instanceof ICAError) {
    console.error('OAuth error:', error.error);
    console.error('Description:', error.description);
    console.error('Status:', error.statusCode);
  }
}
```

## TypeScript Support

Fully typed with TypeScript definitions included.

```typescript
import {
  ICAClient,
  ICAConfig,
  TokenSet,
  UserInfoClaims,
  JWTPayload
} from '@iglobals/auth-client';
```

## Security Best Practices

1. **Never expose client secret in frontend code** - use backend-only
2. **Use HTTPS** in production for `redirectUri` and `baseUrl`
3. **Store tokens securely** - use httpOnly cookies, not localStorage
4. **Implement proper session management** - don't store PKCE in memory for production
5. **Validate state parameter** - prevent CSRF attacks
6. **Use short-lived access tokens** - rely on refresh tokens for long sessions

## Configuration Requirements

Your ICA server must have:
- A registered OAuth client with your `clientId` and `clientSecret`
- Your `redirectUri` added to the client's allowed redirect URIs
- Appropriate scopes enabled for the client

## Complete Next.js Example

```typescript
// app/login/page.tsx
'use client';

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };
  
  return <button onClick={handleLogin}>Login with ICA</button>;
}

// app/api/auth/login/route.ts
import { ICAClient } from '@iglobals/auth-client';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

const client = new ICAClient({
  baseUrl: process.env.ICA_BASE_URL!,
  clientId: process.env.ICA_CLIENT_ID!,
  clientSecret: process.env.ICA_CLIENT_SECRET!,
  redirectUri: process.env.ICA_REDIRECT_URI!,
});

export async function GET() {
  const { codeVerifier, codeChallenge } = client.generatePKCE();
  const state = crypto.randomUUID();
  
  const cookieStore = await cookies();
  cookieStore.set('ica_state', state);
  cookieStore.set('ica_verifier', codeVerifier);
  
  const authUrl = client.getAuthorizationUrl(state, codeChallenge);
  redirect(authUrl);
}

// app/api/auth/callback/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  const cookieStore = await cookies();
  const savedState = cookieStore.get('ica_state')?.value;
  const verifier = cookieStore.get('ica_verifier')?.value;
  
  if (!code || !verifier || state !== savedState) {
    return new Response('Invalid request', { status: 400 });
  }
  
  const tokens = await client.exchangeCode(code, verifier);
  
  // Store tokens securely and redirect
  cookieStore.set('ica_access_token', tokens.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  });
  
  redirect('/dashboard');
}
```

## Support

- Documentation: [https://github.com/yourusername/iglobals-cauth](https://github.com/yourusername/iglobals-cauth)
- Issues: [https://github.com/yourusername/iglobals-cauth/issues](https://github.com/yourusername/iglobals-cauth/issues)

## License

MIT
