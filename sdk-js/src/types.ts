export interface ICAConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  baseUrl: string;
}

export interface TokenSet {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  id_token?: string;
  scope: string;
}

export interface UserInfoClaims {
  sub: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  [key: string]: any;
}

export interface JWTPayload {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  scope?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  [key: string]: any;
}
