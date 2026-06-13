from functools import wraps
from typing import Callable
from .client import IGlobalsAuth
from .errors import ICAError

try:
    from flask import request, jsonify, g
except ImportError:
    pass

def auth_required(ica: IGlobalsAuth) -> Callable:
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"error": "unauthorized", "error_description": "Bearer token missing or malformed.", "status": 401}), 401
            
            token = auth_header.split(" ")[1]
            try:
                payload = ica.verify_token(token)
                g.ica_user = payload
            except ICAError as e:
                return jsonify({"error": "unauthorized", "error_description": str(e), "status": 401}), 401
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator
