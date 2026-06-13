from typing import Callable
from .client import IGlobalsAuth
from .errors import ICAError

try:
    from fastapi import Request, HTTPException, status
except ImportError:
    pass  # Allow import if FastAPI is not installed, fail at runtime if used

def require_auth(ica: IGlobalsAuth) -> Callable:
    async def auth_dependency(request: Request) -> dict:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Bearer token missing or malformed.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = auth_header.split(" ")[1]
        try:
            payload = ica.verify_token(token)
            return payload
        except ICAError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e),
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    return auth_dependency
