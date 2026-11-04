"""Generic OpenID Connect client: discovery, Authorization Code flow with PKCE,
ID token verification (ADR 0004). Nothing here is specific to Keycloak, so
another provider is a configuration entry, not new code.

The ID token is verified with PyJWT against the provider's JWKS: signature
(asymmetric algorithms only), issuer, audience, expiry, issued-at and nonce.
"""

from __future__ import annotations

import base64
import hashlib
import secrets
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt
import structlog

from surimi_backend.auth.errors import SsoError, SsoProviderError
from surimi_backend.core.config import OidcProviderSettings

log = structlog.get_logger("surimi.oidc")

DISCOVERY_TTL_SECONDS = 3600
LEEWAY_SECONDS = 60
ALLOWED_ALGORITHMS = [
    "RS256",
    "RS384",
    "RS512",
    "PS256",
    "PS384",
    "PS512",
    "ES256",
    "ES384",
    "ES512",
]


@dataclass(frozen=True, slots=True)
class Discovery:
    issuer: str
    authorization_endpoint: str
    token_endpoint: str
    jwks_uri: str
    userinfo_endpoint: str | None


def new_pkce_pair() -> tuple[str, str]:
    """(verifier, S256 challenge)."""
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return verifier, base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


class OidcProvider:
    def __init__(self, key: str, config: OidcProviderSettings, http: httpx.AsyncClient) -> None:
        self.key = key
        self.config = config
        self._http = http
        self._discovery: Discovery | None = None
        self._discovery_at = 0.0
        self._jwks: dict[str, Any] = {}

    @property
    def display_name(self) -> str:
        return self.config.display_name or self.key.title()

    async def _get_json(self, url: str, **kwargs: Any) -> dict[str, Any]:
        try:
            response = await self._http.get(url, **kwargs)
            response.raise_for_status()
            data: dict[str, Any] = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            log.warning("oidc.request_failed", provider=self.key, url=url, error=str(exc))
            raise SsoProviderError(f"the sign-in provider {self.key!r} is not reachable") from exc
        return data

    async def discovery(self) -> Discovery:
        if self._discovery and time.monotonic() - self._discovery_at < DISCOVERY_TTL_SECONDS:
            return self._discovery
        doc = await self._get_json(self.config.discovery)
        try:
            found = Discovery(
                issuer=doc["issuer"],
                authorization_endpoint=doc["authorization_endpoint"],
                token_endpoint=doc["token_endpoint"],
                jwks_uri=doc["jwks_uri"],
                userinfo_endpoint=doc.get("userinfo_endpoint"),
            )
        except KeyError as exc:
            raise SsoProviderError(f"discovery document of {self.key!r} lacks {exc}") from exc
        if found.issuer.rstrip("/") != self.config.issuer.rstrip("/"):
            raise SsoProviderError(
                f"provider {self.key!r} announces issuer {found.issuer!r}, "
                f"configured {self.config.issuer!r}"
            )
        self._discovery, self._discovery_at = found, time.monotonic()
        return found

    async def authorization_url(
        self, *, redirect_uri: str, state: str, nonce: str, code_challenge: str
    ) -> str:
        discovery = await self.discovery()
        query = urlencode(
            {
                "response_type": "code",
                "client_id": self.config.client_id,
                "redirect_uri": redirect_uri,
                "scope": self.config.scopes,
                "state": state,
                "nonce": nonce,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
            }
        )
        separator = "&" if "?" in discovery.authorization_endpoint else "?"
        return f"{discovery.authorization_endpoint}{separator}{query}"

    async def exchange_code(
        self, *, code: str, redirect_uri: str, code_verifier: str
    ) -> dict[str, Any]:
        discovery = await self.discovery()
        try:
            response = await self._http.post(
                discovery.token_endpoint,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "code_verifier": code_verifier,
                },
                auth=(self.config.client_id, self.config.client_secret.get_secret_value()),
            )
        except httpx.HTTPError as exc:
            raise SsoProviderError(f"the sign-in provider {self.key!r} is not reachable") from exc
        if response.status_code != 200:
            log.warning(
                "oidc.token_exchange_failed", provider=self.key, status=response.status_code
            )
            raise SsoError("the sign-in provider refused the authorization code; start again")
        tokens: dict[str, Any] = response.json()
        if "id_token" not in tokens:
            raise SsoError("the sign-in provider returned no ID token (is the 'openid' scope set?)")
        return tokens

    async def _signing_key(self, kid: str | None) -> Any:
        discovery = await self.discovery()
        for attempt in range(2):
            if not self._jwks or attempt == 1:
                self._jwks = await self._get_json(discovery.jwks_uri)
            for jwk in self._jwks.get("keys", []):
                if kid is None or jwk.get("kid") == kid:
                    return jwt.PyJWK(jwk).key
        raise SsoError("the ID token is signed with an unknown key")

    async def verify_id_token(self, id_token: str, *, nonce: str) -> dict[str, Any]:
        try:
            header = jwt.get_unverified_header(id_token)
        except jwt.InvalidTokenError as exc:
            raise SsoError("the ID token is malformed") from exc
        if header.get("alg") not in ALLOWED_ALGORITHMS:
            raise SsoError(f"ID token algorithm {header.get('alg')!r} is not accepted")
        key = await self._signing_key(header.get("kid"))
        try:
            claims: dict[str, Any] = jwt.decode(
                id_token,
                key,
                algorithms=ALLOWED_ALGORITHMS,
                audience=self.config.client_id,
                issuer=self.config.issuer,
                leeway=LEEWAY_SECONDS,
                options={"require": ["exp", "iat", "sub", "iss", "aud"]},
            )
        except jwt.InvalidTokenError as exc:
            raise SsoError(f"the ID token is not valid: {exc}") from exc
        if not secrets.compare_digest(str(claims.get("nonce", "")), nonce):
            raise SsoError("the ID token does not belong to this sign-in (nonce)")
        audiences = claims["aud"] if isinstance(claims["aud"], list) else [claims["aud"]]
        if len(audiences) > 1 and claims.get("azp") != self.config.client_id:
            raise SsoError("the ID token was issued to another client (azp)")
        return claims

    async def userinfo(self, access_token: str) -> dict[str, Any]:
        discovery = await self.discovery()
        if not discovery.userinfo_endpoint:
            return {}
        return await self._get_json(
            discovery.userinfo_endpoint, headers={"Authorization": f"Bearer {access_token}"}
        )


def build_providers(
    configs: dict[str, OidcProviderSettings], http: httpx.AsyncClient
) -> dict[str, OidcProvider]:
    return {key: OidcProvider(key, cfg, http) for key, cfg in configs.items()}
