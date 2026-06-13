from dataclasses import dataclass
from typing import Optional, TypedDict, Any

@dataclass
class TokenSet:
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str
    scope: str
    id_token: Optional[str] = None

class AddressClaims(TypedDict, total=False):
    street_address: str
    locality: str
    region: str
    postal_code: str
    country: str

class UserInfoClaims(TypedDict, total=False):
    sub: str
    given_name: str
    family_name: str
    email: str
    email_verified: bool
    phone_number: str
    phone_number_verified: bool
    address: AddressClaims
