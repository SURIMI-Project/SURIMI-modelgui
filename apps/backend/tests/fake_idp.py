"""A fake OpenID Connect provider, served through httpx.MockTransport.

It does what a real one does in the Authorization Code flow with PKCE: a
discovery document, a JWKS with an RSA key, a token endpoint that checks the
client credentials, the redirect URI and the PKCE verifier, and ID tokens
signed with RS256. Tests "sign in" at it by turning the authorization URL the
backend redirected to into a code.
"""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
import time
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import parse_qs, urlsplit

import httpx
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

ISSUER = "https://idp.test/realms/surimi"
CLIENT_ID = "surimi-modelgui"
CLIENT_SECRET = "fake-client-secret"


def _new_key() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@dataclass
class Grant:
    claims: dict[str, Any]
    challenge: str
    redirect_uri: str


@dataclass
class FakeIdp:
    key: rsa.RSAPrivateKey = field(default_factory=_new_key)
    kid: str = "test-key-1"
    grants: dict[str, Grant] = field(default_factory=dict)
    # access token -> claims, for the userinfo endpoint
    userinfo: dict[str, dict[str, Any]] = field(default_factory=dict)
    fail_token_endpoint: bool = False

    @property
    def jwks(self) -> dict[str, Any]:
        jwk = json.loads(RSAAlgorithm.to_jwk(self.key.public_key()))
        return {"keys": [jwk | {"kid": self.kid, "alg": "RS256", "use": "sig"}]}

    def transport(self) -> httpx.MockTransport:
        return httpx.MockTransport(self._handle)

    def _handle(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/.well-known/openid-configuration"):
            return httpx.Response(
                200,
                json={
                    "issuer": ISSUER,
                    "authorization_endpoint": f"{ISSUER}/protocol/openid-connect/auth",
                    "token_endpoint": f"{ISSUER}/protocol/openid-connect/token",
                    "jwks_uri": f"{ISSUER}/protocol/openid-connect/certs",
                    "userinfo_endpoint": f"{ISSUER}/protocol/openid-connect/userinfo",
                },
            )
        if path.endswith("/certs"):
            return httpx.Response(200, json=self.jwks)
        if path.endswith("/token"):
            return self._token(request)
        if path.endswith("/userinfo"):
            scheme, _, token = request.headers.get("authorization", "").partition(" ")
            info = self.userinfo.get(token) if scheme == "Bearer" else None
            return httpx.Response(200, json=info) if info else httpx.Response(401)
        return httpx.Response(404)

    def _token(self, request: httpx.Request) -> httpx.Response:
        expected_auth = (
            "Basic " + base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
        )
        form = {k: v[0] for k, v in parse_qs(request.content.decode()).items()}
        grant = self.grants.pop(form.get("code", ""), None)
        if (
            self.fail_token_endpoint
            or grant is None
            or request.headers.get("authorization") != expected_auth
        ):
            return httpx.Response(400, json={"error": "invalid_grant"})
        verifier = form.get("code_verifier", "")
        challenge = (
            base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
            .rstrip(b"=")
            .decode()
        )
        if challenge != grant.challenge or form.get("redirect_uri") != grant.redirect_uri:
            return httpx.Response(
                400, json={"error": "invalid_grant", "error_description": "PKCE or redirect"}
            )
        access_token = secrets.token_urlsafe(16)
        standard = {"iss", "aud", "iat", "exp", "nonce"}
        self.userinfo[access_token] = {k: v for k, v in grant.claims.items() if k not in standard}
        return httpx.Response(
            200,
            json={
                "id_token": self.sign(grant.claims),
                "access_token": access_token,
                "token_type": "Bearer",
            },
        )

    def sign(self, claims: dict[str, Any], key: rsa.RSAPrivateKey | None = None) -> str:
        return jwt.encode(claims, key or self.key, algorithm="RS256", headers={"kid": self.kid})

    def sign_in(
        self, authorization_url: str, claims: dict[str, Any], **override: Any
    ) -> tuple[str, str]:
        """The user signs in at the provider: returns (code, state) for the callback.
        `override` replaces standard claims (nonce, aud, exp, …) to test tampering."""
        query = {k: v[0] for k, v in parse_qs(urlsplit(authorization_url).query).items()}
        assert query["client_id"] == CLIENT_ID
        assert query["code_challenge_method"] == "S256"
        now = int(time.time())
        full = {
            "iss": ISSUER,
            "aud": CLIENT_ID,
            "iat": now,
            "exp": now + 300,
            "nonce": query["nonce"],
            **claims,
            **override,
        }
        code = secrets.token_urlsafe(16)
        self.grants[code] = Grant(full, query["code_challenge"], query["redirect_uri"])
        return code, query["state"]
