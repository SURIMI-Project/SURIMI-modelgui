"""From SSO claims to our role (ADR 0005), recomputed at every SSO sign-in.

Rules, in order: any admin value → admin; else any member value → member;
else the provider's default (`deny` refuses the sign-in, `member` lets in).
A provider without a role claim does not manage roles: new users get the
default once and are then managed in our app.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from surimi_backend.core.config import OidcProviderSettings
from surimi_backend.users.models import Role


@dataclass(frozen=True, slots=True)
class RoleDecision:
    managed: bool  # the provider decides the role (role_source = idp)
    role: Role | None  # None: no access


def claim_values(claims: dict[str, Any], path: str) -> set[str]:
    """Values at a dotted path (`resource_access.surimi-modelgui.roles`); a
    string counts as one value, a list as many, anything else as none."""
    node: Any = claims
    for part in path.split("."):
        if not isinstance(node, dict) or part not in node:
            return set()
        node = node[part]
    if isinstance(node, str):
        return {node}
    if isinstance(node, list):
        return {str(v) for v in node if isinstance(v, str | int)}
    return set()


def decide_role(claims: dict[str, Any], config: OidcProviderSettings) -> RoleDecision:
    default = Role.MEMBER if config.default_role == "member" else None
    if not config.role_claim:
        return RoleDecision(managed=False, role=default)
    values = claim_values(claims, config.role_claim)
    if values & config.values(config.admin_values):
        return RoleDecision(managed=True, role=Role.ADMIN)
    if values & config.values(config.member_values):
        return RoleDecision(managed=True, role=Role.MEMBER)
    return RoleDecision(managed=True, role=default)


def role_claims_snapshot(claims: dict[str, Any], config: OidcProviderSettings) -> dict[str, Any]:
    """What is kept in identities.claims_snapshot for troubleshooting: the role
    claim and the identity fields, nothing else."""
    snapshot: dict[str, Any] = {
        k: claims[k] for k in ("email", "email_verified", "preferred_username") if k in claims
    }
    if config.role_claim:
        snapshot[config.role_claim] = sorted(claim_values(claims, config.role_claim))
    return snapshot
