import requests
from urllib.parse import urlencode
from typing import List, Optional

from .types import TokenSet, UserInfoClaims
from .errors import ICAError
from .pkce import generate_pkce
from .jwks import JWKSService

class IGlobalsAuth:
    def __init__(self, client_id: str, redirect_uri: str, base_url: str, client_secret: Optional[str] = None, scopes: Optional[List[str]] = None):
        if not client_id:
            raise ValueError('client_id is required')
        if not redirect_uri:
            raise ValueError('redirect_uri is required')
        if not base_url:
            raise ValueError('base_url is required')
            
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.base_url = base_url.rstrip('/')
        self.scopes = scopes or ['openid', 'profile', 'email']
        
        self.jwks_service = JWKSService(f"{self.base_url}/api/oauth/jwks")

    def get_authorization_url(self, state: str, code_challenge: str) -> str:
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'scope': ' '.join(self.scopes),
            'state': state,
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256',
        }
        return f"{self.base_url}/api/oauth/authorize?{urlencode(params)}"

    def generate_pkce(self) -> dict:
        return generate_pkce()

    def _request_token(self, payload: dict) -> TokenSet:
        payload['client_id'] = self.client_id
        if self.client_secret:
            payload['client_secret'] = self.client_secret
            
        res = requests.post(f"{self.base_url}/api/oauth/token", json=payload)
        data = res.json()
        
        if not res.ok:
            raise ICAError(data.get('error', 'request_failed'), data.get('error_description', 'Failed to fetch token'), res.status_code)
            
        return TokenSet(
            access_token=data['access_token'],
            token_type=data['token_type'],
            expires_in=data['expires_in'],
            refresh_token=data['refresh_token'],
            scope=data['scope'],
            id_token=data.get('id_token')
        )

    def exchange_code(self, code: str, code_verifier: str) -> TokenSet:
        return self._request_token({
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri,
            'code_verifier': code_verifier,
        })

    def refresh_access_token(self, refresh_token: str) -> TokenSet:
        return self._request_token({
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
        })

    def get_user_info(self, access_token: str) -> UserInfoClaims:
        res = requests.get(
            f"{self.base_url}/api/oauth/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        data = res.json()
        if not res.ok:
            raise ICAError(data.get('error', 'request_failed'), data.get('error_description', 'Failed to fetch userinfo'), res.status_code)
            
        return UserInfoClaims(**data)

    def verify_token(self, jwt_token: str) -> dict:
        return self.jwks_service.verify_token(jwt_token, self.client_id, self.base_url)

    def revoke_token(self, refresh_token: str) -> bool:
        payload = {
            'token': refresh_token,
            'client_id': self.client_id
        }
        if self.client_secret:
            payload['client_secret'] = self.client_secret
            
        res = requests.post(f"{self.base_url}/api/oauth/revoke", json=payload)
        data = res.json()
        if not res.ok:
            raise ICAError(data.get('error', 'request_failed'), data.get('error_description', 'Failed to revoke token'), res.status_code)
            
        return data.get('revoked', False)
