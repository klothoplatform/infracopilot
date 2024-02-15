import logging
import os

import jwt
from fastapi import HTTPException, Request
from jwt import PyJWKClient

domain = os.getenv("AUTH0_DOMAIN", "klotho.us.auth0.com")
key_url = os.getenv("AUTH0_PEM_URL", f"https://{domain}/.well-known/jwks.json")
audience = os.getenv("AUTH0_AUDIENCE", "AeIvquQVLg9jy2V6Jq5Bz48cKQOmIPDw")

PUBLIC_USER = "public"

jwks_client = PyJWKClient(key_url, cache_keys=True)


class AuthError(HTTPException):
    detail: str

    def __init__(self, error, detail, status_code=401):
        self.error = error
        self.status_code = status_code
        self.detail = detail


def is_public_user(request: Request) -> bool:
    auth = request.headers.get("Authorization", None)
    return auth is None or auth == "Bearer default"


async def get_user_id(request: Request) -> str:
    try:
        if is_public_user(request):
            return PUBLIC_USER
        token = await get_id_token(request)
        return token["sub"]
    except:
        logging.error("Error getting user id", exc_info=True)
        raise


async def get_id_token(request: Request):
    token = get_token_auth_header(request)
    # The client will read the JWT header to get the kid field,
    # then download token signing public keys and return that matching the kid.
    # This key will then be cached for future JWTs with the same kid.
    # The client will reliably handle new kids if keys are recycled.
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    try:
        payload = jwt.decode(
            token,
            key=signing_key.key,
            issuer="https://" + domain + "/",
            algorithms=["RS256"],
            audience=audience,  # This is our auth0 frontend client id
            leeway=10,
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthError(
            {"code": "token_expired", "description": "token is expired"}, 401
        )
    except Exception as e:
        print("error getting id token", e)
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
