import os
import hashlib
import base64

def generate_pkce() -> dict:
    code_verifier = base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8').rstrip('=')
    digest = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    code_challenge = base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')
    return {
        "code_verifier": code_verifier,
        "code_challenge": code_challenge
    }
