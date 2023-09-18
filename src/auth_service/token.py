from functools import wraps
import jwt
import os
import requests
import pem
from cryptography import x509
from fastapi import HTTPException, Request
import json
from jwt import PyJWKClient

domain = os.getenv("AUTH0_DOMAIN", "klotho-dev.us.auth0.com")
key_url = os.getenv("AUTH0_PEM_URL", f"https://{domain}/.well-known/jwks.json")


class AuthError(HTTPException):
    detail: str
    def __init__(self, error, detail, status_code=401):
        self.error = error
        self.status_code = status_code
        self.detail = detail


def is_public_user(request: Request) -> bool:
    auth = request.headers.get("Authorization", None)
    return auth is None

def get_user_id(request: Request) -> str:
    if is_public_user(request):
        return "public"
    return get_id_token(request)["sub"]


def get_id_token(request: Request):
    token = get_token_auth_header(request)

    # The client will read the JWT header to get the kid field,
    # then download token signing public keys and return that matching the kid.
    # This key will then be cached for future JWTs with the same kid.
    # The client will reliably handle new kids if keys are recycled.
    jwks_client = PyJWKClient(key_url)
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    try:
        payload = jwt.decode(
            token,
            key=signing_key.key,
            issuer="https://" + domain + "/",
            algorithms=["RS256"],
            audience="A0sIE3wvh8LpG8mtJEjWPnBqZgBs5cNM",  # This is our auth0 frontend client id
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthError(
            {"code": "token_expired", "description": "token is expired"}, 401
        )
    except Exception as e:
        print(e)
        raise AuthError(
            {
                "code": "invalid_header",
                "description": "Unable to parse authentication" " token.",
            },
            401,
        )


def get_token_auth_header(request: Request):
    """Obtains the Access Token from the Authorization Header"""
    auth = request.headers.get("Authorization", None)
    if not auth:
        raise AuthError(
            {
                "code": "authorization_header_missing",
                "description": "Authorization header is expected",
            },
            401,
        )

    parts = auth.split()

    if parts[0].lower() != "bearer":
        raise AuthError(
            {
                "code": "invalid_header",
                "description": "Authorization header must start with" " Bearer",
            },
            401,
        )
    elif len(parts) == 1:
        raise AuthError(
            {"code": "invalid_header", "description": "Token not found"}, 401
        )
    elif len(parts) > 2:
        raise AuthError(
            {
                "code": "invalid_header",
                "description": "Authorization header must be" " Bearer token",
            },
            401,
        )

    token = parts[1]
    return token
