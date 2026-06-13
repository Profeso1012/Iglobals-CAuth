import jwt
from typing import Dict, Any
from jwt import PyJWKClient

from .errors import ICAError

class JWKSService:
    def __init__(self, jwks_uri: str):
        # PyJWKClient provides caching out of the box
        self.jwks_client = PyJWKClient(jwks_uri, cache_keys=True)

    def verify_token(self, token: str, expected_aud: str, expected_iss: str) -> Dict[str, Any]:
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=expected_aud,
                issuer=expected_iss,
            )
            return payload
        except jwt.PyJWTError as e:
            raise ICAError('invalid_token', str(e), 401)
