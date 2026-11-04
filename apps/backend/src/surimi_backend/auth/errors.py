"""Errors of authentication and authorization, each with a stable code."""

from __future__ import annotations

from surimi_backend.core.errors import AppError


class NotAuthenticatedError(AppError):
    status_code = 401
    code = "not_authenticated"


class InvalidCredentialsError(AppError):
    status_code = 401
    code = "invalid_credentials"


class AccountInactiveError(AppError):
    status_code = 403
    code = "account_inactive"


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"


class CsrfError(AppError):
    status_code = 403
    code = "csrf_failed"


class PasswordChangeRequiredError(AppError):
    status_code = 403
    code = "password_change_required"


class NoAccessError(AppError):
    """SSO sign-in worked, but the provider's roles grant no access (ADR 0005)."""

    status_code = 403
    code = "no_access"


class EmailNotVerifiedError(AppError):
    """First SSO sign-in: the provider sends no e-mail, or does not say it is
    verified (ADR 0016)."""

    status_code = 403
    code = "email_not_verified"


class EmailTakenError(AppError):
    """First SSO sign-in: another SURIMI user already has this e-mail. Accounts
    are never linked by e-mail (ADR 0016)."""

    status_code = 403
    code = "email_taken"


class TooManyAttemptsError(AppError):
    status_code = 429
    code = "too_many_attempts"


class WeakPasswordError(AppError):
    status_code = 422
    code = "weak_password"


class SsoError(AppError):
    """The SSO round trip is broken: bad state, expired flow, invalid token."""

    status_code = 400
    code = "sso_failed"


class SsoProviderError(AppError):
    """The SSO provider cannot be reached or answered with an error."""

    status_code = 502
    code = "sso_provider_error"
