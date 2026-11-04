"""Password hashing (Argon2id via pwdlib, ADR 0004) and the password policy.

Hashing takes tens of milliseconds of CPU on purpose, so the async helpers run
it in a thread and keep the event loop free.
"""

from __future__ import annotations

import asyncio

from pwdlib import PasswordHash

from surimi_backend.auth.errors import WeakPasswordError

MIN_LENGTH = 12
MAX_LENGTH = 256

# A short list of the passwords tried first by attackers; length does most of
# the work (NIST 800-63B prefers length over composition rules).
_COMMON = frozenset(
    {
        "123456789012",
        "1234567890123",
        "password1234",
        "passwordpassword",
        "qwertyuiop12",
        "qwerty123456",
        "iloveyou1234",
        "adminadmin12",
        "administrator",
        "changeme1234",
        "welcome12345",
        "letmein12345",
        "surimisurimi",
    }
)

_hasher = PasswordHash.recommended()
# Verified against when the login matches no user, so the answer takes as long
# as for a wrong password and does not reveal which accounts exist.
_DUMMY_HASH = _hasher.hash("timing-equaliser, not a real password")


def check_policy(password: str, *, username: str = "", email: str = "") -> None:
    if len(password) < MIN_LENGTH:
        raise WeakPasswordError(f"the password must have at least {MIN_LENGTH} characters")
    if len(password) > MAX_LENGTH:
        raise WeakPasswordError(f"the password must have at most {MAX_LENGTH} characters")
    lowered = password.lower()
    if lowered in _COMMON:
        raise WeakPasswordError("this password is too common")
    for personal in (username, email.split("@", maxsplit=1)[0] if email else ""):
        if personal and len(personal) >= 3 and personal.lower() in lowered:
            raise WeakPasswordError("the password must not contain the username or e-mail name")


async def hash_password(password: str) -> str:
    return await asyncio.to_thread(_hasher.hash, password)


async def verify_password(password: str, password_hash: str | None) -> tuple[bool, str | None]:
    """Returns (matches, new_hash): new_hash is set when the stored hash uses
    old parameters and should be replaced."""
    if password_hash is None:
        await asyncio.to_thread(_hasher.verify, password, _DUMMY_HASH)
        return False, None
    return await asyncio.to_thread(_hasher.verify_and_update, password, password_hash)
