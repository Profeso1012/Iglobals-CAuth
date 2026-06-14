# iGlobals Auth - Python SDK

Official Python SDK for integrating with iGlobals Central Auth (ICA) - an OAuth 2.0 and OpenID Connect authentication server.

## Installation

```bash
pip install iglobals-auth
```

### Optional Dependencies

For framework-specific middleware:

```bash
# FastAPI support
pip install iglobals-auth[fastapi]

# Flask support
pip install iglobals-auth[flask]
```

## Quick Start

```python
from iglobals_auth import IGlobalsAuth

# Initialize the client
client = IGlobalsAuth(
    base_url='https://auth.yourdomain.com',      # Your ICA deployment URL
    client_id='your-client-id',                  # From admin portal
    client_secret='your-client-secret',          # From admin portal
    redirect_uri='https://yourapp.com/callback', # Your callback URL
    scopes=['openid', 'profile', 'email']       # Optional, defaults shown
)

# Generate PKCE challenge
pkce = client.generate_pkce()
state = str(uuid.uuid4())

# Get authorization URL
auth_url = client.get_authorization_url(state, pkce['code_challenge'])

# Redirect user to auth_url
return redirect(auth_url)
```

## Complete OAuth Flow Example (Flask)

```python
from flask import Flask, redirect, request, session
from iglobals_auth import IGlobalsAuth
import uuid

app = Flask(__name__)
app.secret_key = 'your-secret-key'

client = IGlobalsAuth(
    base_url='https://auth.yourdomain.com',
    client_id='your-client-id',
    client_secret='your-client-secret',
    redirect_uri='http://localhost:5000/callback'
)

@app.route('/login')
def login():
    # Generate PKCE
    pkce = client.generate_pkce()
    state = str(uuid.uuid4())
    
    # Store for callback
    session['pkce_verifier'] = pkce['code_verifier']
    session['state'] = state
    
    # Redirect to ICA
    auth_url = client.get_authorization_url(state, pkce['code_challenge'])
    return redirect(auth_url)

@app.route('/callback')
def callback():
    code = request.args.get('code')
    state = request.args.get('state')
    
    # Verify state
    if state != session.get('state'):
        return 'Invalid state', 400
    
    try:
        # Exchange code for tokens
        verifier = session.get('pkce_verifier')
        tokens = client.exchange_code(code, verifier)
        
        # Get user info (returns a dictionary)
        user_info = client.get_user_info(tokens.access_token)
        
        # Store tokens securely
        session['access_token'] = tokens.access_token
        session['refresh_token'] = tokens.refresh_token
        session['user'] = {
            'id': user_info.get('sub'),
            'email': user_info.get('email'),
            'name': f"{user_info.get('given_name', '')} {user_info.get('family_name', '')}".strip()
        }
        
        return redirect('/dashboard')
    
    except Exception as e:
        print(f'Auth error: {e}')
        return 'Authentication failed', 500

@app.route('/dashboard')
def dashboard():
    user = session.get('user')
    if not user:
        return redirect('/login')
    
    return f"Welcome, {user['name']}!"

if __name__ == '__main__':
    app.run(port=5000)
```

## API Reference

### `IGlobalsAuth`

#### Constructor

```python
IGlobalsAuth(
    client_id: str,
    redirect_uri: str,
    base_url: str,
    client_secret: Optional[str] = None,
    scopes: Optional[List[str]] = None
)
```

**Parameters:**
- `base_url` (str, required): Your ICA server URL (e.g., `https://auth.yourdomain.com`)
- `client_id` (str, required): OAuth client ID from ICA admin portal
- `client_secret` (str, required): OAuth client secret from ICA admin portal
- `redirect_uri` (str, required): Your application's callback URL
- `scopes` (list, optional): OAuth scopes. Default: `['openid', 'profile', 'email']`

#### Methods

##### `generate_pkce()`
Generates a PKCE code verifier and challenge.

```python
pkce = client.generate_pkce()
# Returns: {'code_verifier': '...', 'code_challenge': '...'}
```

**Returns:**
- `code_verifier`: Random string to verify the authorization
- `code_challenge`: SHA-256 hash for the authorization request

---

##### `get_authorization_url(state: str, code_challenge: str)`
Builds the OAuth authorization URL.

```python
auth_url = client.get_authorization_url(state, code_challenge)
```

**Parameters:**
- `state`: Random string for CSRF protection
- `code_challenge`: From `generate_pkce()`

**Returns:** Authorization URL string

---

##### `exchange_code(code: str, code_verifier: str)`
Exchanges authorization code for tokens.

```python
tokens = client.exchange_code(code, code_verifier)
```

**Parameters:**
- `code`: Authorization code from callback
- `code_verifier`: From `generate_pkce()`

**Returns:** `TokenSet` object
```python
TokenSet(
    access_token='...',
    token_type='Bearer',
    expires_in=900,           # Seconds until expiration
    refresh_token='...',
    scope='openid profile email',
    id_token='...'           # If 'openid' scope requested
)
```

---

##### `refresh_access_token(refresh_token: str)`
Gets a new access token using a refresh token.

```python
new_tokens = client.refresh_access_token(tokens.refresh_token)
```

**Returns:** New `TokenSet` object

**Usage:**
```python
new_tokens = client.refresh_access_token(tokens.refresh_token)
session['access_token'] = new_tokens.access_token
session['refresh_token'] = new_tokens.refresh_token
```

---

##### `get_user_info(access_token: str)`
Fetches user profile information.

```python
user_info = client.get_user_info(tokens.access_token)
```

**Returns:** Dictionary with user info claims
```python
{
    'sub': 'user-id',                # User ID
    'email': 'user@example.com',     # If 'email' scope
    'email_verified': True,
    'given_name': 'John',           # If 'profile' scope
    'family_name': 'Doe',
    'phone_number': '+1234567890',  # If 'phone' scope
    'phone_number_verified': True
}
```

**Usage:**
```python
user_info = client.get_user_info(tokens.access_token)
user_id = user_info.get('sub')
email = user_info.get('email')
full_name = f"{user_info.get('given_name', '')} {user_info.get('family_name', '')}".strip()
```

---

##### `verify_token(jwt_token: str)`
Verifies a JWT token's signature using JWKS.

```python
payload = client.verify_token(tokens.access_token)
```

**Returns:** Decoded JWT payload dictionary

---

##### `revoke_token(refresh_token: str)`
Revokes a refresh token.

```python
success = client.revoke_token(tokens.refresh_token)
```

**Returns:** `bool` - True if revoked successfully

---

## FastAPI Integration

### Protect Routes with Dependency Injection

```python
from fastapi import FastAPI, Depends
from iglobals_auth.fastapi import ICAMiddleware

app = FastAPI()

# Create middleware dependency
auth = ICAMiddleware(
    base_url='https://auth.yourdomain.com',
    client_id='your-client-id'
)

@app.get('/protected')
async def protected_route(user: dict = Depends(auth)):
    # user contains verified claims from access token
    return {
        'message': f"Hello, {user['email']}!",
        'user': user
    }

@app.get('/admin')
async def admin_route(user: dict = Depends(auth.require_scope('admin'))):
    # Only users with 'admin' scope can access
    return {'message': 'Admin access granted'}
```

### Complete FastAPI Example

```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import RedirectResponse
from iglobals_auth import IGlobalsAuth
from iglobals_auth.fastapi import ICAMiddleware
import uuid

app = FastAPI()

# Initialize client
client = IGlobalsAuth(
    base_url='https://auth.yourdomain.com',
    client_id='your-client-id',
    client_secret='your-client-secret',
    redirect_uri='http://localhost:8000/callback'
)

# Middleware for protected routes
auth = ICAMiddleware(
    base_url='https://auth.yourdomain.com',
    client_id='your-client-id'
)

# In-memory session storage (use proper storage in production)
sessions = {}

@app.get('/login')
async def login():
    pkce = client.generate_pkce()
    state = str(uuid.uuid4())
    
    sessions[state] = {'verifier': pkce['code_verifier']}
    
    auth_url = client.get_authorization_url(state, pkce['code_challenge'])
    return RedirectResponse(auth_url)

@app.get('/callback')
async def callback(code: str, state: str):
    session = sessions.get(state)
    if not session:
        raise HTTPException(status_code=400, detail='Invalid state')
    
    try:
        tokens = client.exchange_code(code, session['verifier'])
        user_info = client.get_user_info(tokens.access_token)
        
        return {
            'user': user_info,  # Dictionary with user claims
            'tokens': tokens
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/profile')
async def profile(user: dict = Depends(auth)):
    return {'user': user}

@app.get('/logout')
async def logout(user: dict = Depends(auth)):
    # Revoke tokens
    # client.revoke_token(refresh_token)
    return {'message': 'Logged out'}
```

## Flask Integration

### Protect Routes with Decorator

```python
from flask import Flask
from iglobals_auth.flask import ICAMiddleware

app = Flask(__name__)

# Create middleware
auth = ICAMiddleware(
    base_url='https://auth.yourdomain.com',
    client_id='your-client-id'
)

@app.route('/protected')
@auth.require_auth
def protected_route():
    # auth.current_user contains verified claims
    user = auth.current_user
    return {'message': f"Hello, {user['email']}!", 'user': user}

@app.route('/admin')
@auth.require_scope('admin')
def admin_route():
    return {'message': 'Admin access granted'}
```

## Django Integration

```python
# middleware.py
from iglobals_auth import IGlobalsAuth

class ICAAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.client = IGlobalsAuth(
            base_url='https://auth.yourdomain.com',
            client_id='your-client-id',
            redirect_uri='http://localhost:8000/callback'
        )
    
    def __call__(self, request):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if token:
            try:
                payload = self.client.verify_token(token)
                request.user_claims = payload
            except:
                request.user_claims = None
        
        return self.get_response(request)

# views.py
from django.http import JsonResponse, HttpResponseRedirect
from django.views.decorators.http import require_http_methods

@require_http_methods(['GET'])
def login(request):
    pkce = client.generate_pkce()
    state = str(uuid.uuid4())
    
    request.session['pkce_verifier'] = pkce['code_verifier']
    request.session['state'] = state
    
    auth_url = client.get_authorization_url(state, pkce['code_challenge'])
    return HttpResponseRedirect(auth_url)

@require_http_methods(['GET'])
def callback(request):
    code = request.GET.get('code')
    state = request.GET.get('state')
    
    if state != request.session.get('state'):
        return JsonResponse({'error': 'Invalid state'}, status=400)
    
    verifier = request.session.get('pkce_verifier')
    tokens = client.exchange_code(code, verifier)
    user_info = client.get_user_info(tokens.access_token)
    
    request.session['access_token'] = tokens.access_token
    request.session['user'] = {
        'id': user_info.get('sub'),
        'email': user_info.get('email'),
        'name': f"{user_info.get('given_name', '')} {user_info.get('family_name', '')}".strip()
    }
    
    return HttpResponseRedirect('/dashboard')
```

## Error Handling

```python
from iglobals_auth import ICAError

try:
    tokens = client.exchange_code(code, verifier)
except ICAError as e:
    print(f'OAuth error: {e.error}')
    print(f'Description: {e.description}')
    print(f'Status code: {e.status_code}')
except Exception as e:
    print(f'Unexpected error: {e}')
```

## Type Hints

Fully typed with type hints for better IDE support:

```python
from iglobals_auth import IGlobalsAuth, TokenSet

client: IGlobalsAuth = IGlobalsAuth(...)
tokens: TokenSet = client.exchange_code(...)
user: dict = client.get_user_info(...)  # Returns a dictionary
```

## Security Best Practices

1. **Never expose client secret in frontend code** - use backend-only
2. **Use HTTPS** in production for `redirect_uri` and `base_url`
3. **Store tokens securely** - use server-side sessions, not client cookies
4. **Implement proper CSRF protection** - validate state parameter
5. **Use short-lived access tokens** - rely on refresh tokens for long sessions
6. **Don't store PKCE verifier in cookies** - use server-side session storage

## Configuration Requirements

Your ICA server must have:
- A registered OAuth client with your `client_id` and `client_secret`
- Your `redirect_uri` added to the client's allowed redirect URIs
- Appropriate scopes enabled for the client

## Testing

```python
import pytest
from iglobals_auth import IGlobalsAuth

@pytest.fixture
def client():
    return IGlobalsAuth(
        base_url='https://auth.test.com',
        client_id='test-client',
        client_secret='test-secret',
        redirect_uri='http://localhost/callback'
    )

def test_generate_pkce(client):
    pkce = client.generate_pkce()
    assert 'code_verifier' in pkce
    assert 'code_challenge' in pkce
    assert len(pkce['code_verifier']) >= 43

def test_authorization_url(client):
    pkce = client.generate_pkce()
    url = client.get_authorization_url('state123', pkce['code_challenge'])
    assert 'auth.test.com' in url
    assert 'client_id=test-client' in url
    assert 'code_challenge=' in url

def test_user_info_is_dict(client):
    # Mock response
    user_info = client.get_user_info('fake_token')
    assert isinstance(user_info, dict)
    assert 'sub' in user_info
```

## Support

- Documentation: [https://github.com/yourusername/iglobals-cauth](https://github.com/yourusername/iglobals-cauth)
- Issues: [https://github.com/yourusername/iglobals-cauth/issues](https://github.com/yourusername/iglobals-cauth/issues)

## License

MIT
