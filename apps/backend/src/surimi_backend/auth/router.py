"""`/api/v1/auth`: sign-in with a password or SSO, refresh, sign-out, the
current user, own password (ADR 0004)."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from surimi_backend.auth import service
from surimi_backend.auth.cookies import (
    FLOW_COOKIE,
    REFRESH_COOKIE,
    clear_flow_cookie,
    clear_session_cookies,
    set_flow_cookie,
    set_session_cookies,
)
from surimi_backend.auth.dependencies import (
    AppSettings,
    CurrentUserAllowingPasswordChange,
    Db,
    check_csrf,
)
from surimi_backend.auth.errors import NotAuthenticatedError
from surimi_backend.auth.history import ClientInfo
from surimi_backend.auth.ratelimit import FailureCounter
from surimi_backend.auth.schemas import LoginIn, PasswordChangeIn, ProviderOut, TokenOut
from surimi_backend.core.errors import NotFoundError
from surimi_backend.integrations.oidc import OidcProvider
from surimi_backend.users.schemas import UserOut

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

ERRORS: dict[int | str, dict[str, Any]] = {
    401: {"description": "Not signed in, or wrong credentials"},
    403: {"description": "Deactivated, no access, or missing CSRF header"},
    429: {"description": "Too many failed sign-ins"},
}


def client_info(request: Request) -> ClientInfo:
    return ClientInfo(
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


def limiter(request: Request) -> FailureCounter:
    counter: FailureCounter = request.app.state.login_limiter
    return counter


def provider(request: Request, key: str) -> OidcProvider:
    providers: dict[str, OidcProvider] = request.app.state.oidc_providers
    if key not in providers:
        raise NotFoundError(f"no sign-in provider {key!r}")
    return providers[key]


Client = Annotated[ClientInfo, Depends(client_info)]
Limiter = Annotated[FailureCounter, Depends(limiter)]


@router.get(
    "/providers", response_model=list[ProviderOut], summary="SSO providers for the sign-in buttons"
)
async def list_providers(request: Request) -> list[ProviderOut]:
    providers: dict[str, OidcProvider] = request.app.state.oidc_providers
    return [
        ProviderOut(
            key=p.key, display_name=p.display_name, login_url=f"/api/v1/auth/sso/{p.key}/login"
        )
        for p in providers.values()
    ]


@router.post(
    "/login",
    response_model=UserOut,
    summary="Sign in with e-mail or username and password",
    responses=ERRORS,
)
async def login(
    body: LoginIn,
    response: Response,
    db: Db,
    settings: AppSettings,
    client: Client,
    counter: Limiter,
) -> UserOut:
    signed_in = await service.login_password(
        db, settings, counter, client, login=body.login, password=body.password.get_secret_value()
    )
    access, _ = service.access_token_for(settings, signed_in)
    set_session_cookies(
        response, settings, access_token=access, refresh_token=signed_in.refresh_token
    )
    return UserOut.of(signed_in.user)


@router.post(
    "/token",
    response_model=TokenOut,
    summary="Bearer token for scripts and Bruno (no cookies, no refresh)",
    responses=ERRORS,
)
async def token(
    body: LoginIn, db: Db, settings: AppSettings, client: Client, counter: Limiter
) -> TokenOut:
    signed_in = await service.token_for_script(
        db, settings, counter, client, login=body.login, password=body.password.get_secret_value()
    )
    access, expires_in = service.access_token_for(settings, signed_in)
    return TokenOut(access_token=access, expires_in=expires_in)


@router.post(
    "/refresh",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="New access token from the refresh cookie; the refresh token is rotated",
    responses=ERRORS,
)
async def refresh(request: Request, response: Response, db: Db, settings: AppSettings) -> None:
    token_value = request.cookies.get(REFRESH_COOKIE)
    if not token_value:
        raise NotAuthenticatedError("no session to refresh; sign in")
    check_csrf(request)
    signed_in = await service.refresh(db, settings, token_value)
    access, _ = service.access_token_for(settings, signed_in)
    set_session_cookies(
        response, settings, access_token=access, refresh_token=signed_in.refresh_token
    )


@router.post(
    "/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Sign out: end this session"
)
async def logout(
    principal: CurrentUserAllowingPasswordChange, response: Response, db: Db, settings: AppSettings
) -> None:
    await service.logout(db, principal.session)
    clear_session_cookies(response, settings)


@router.get("/me", response_model=UserOut, summary="The signed-in user")
async def me(principal: CurrentUserAllowingPasswordChange) -> UserOut:
    return UserOut.of(principal.user)


@router.post(
    "/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change your own password; your other sessions end",
    responses={
        401: {"description": "Wrong current password"},
        409: {"description": "SSO-only user"},
        422: {"description": "Weak password"},
    },
)
async def change_password(
    body: PasswordChangeIn, principal: CurrentUserAllowingPasswordChange, db: Db
) -> None:
    await service.change_password(
        db,
        user=principal.user,
        session=principal.session,
        current=body.current_password.get_secret_value(),
        new=body.new_password.get_secret_value(),
    )


@router.get(
    "/sso/{provider_key}/login",
    status_code=status.HTTP_302_FOUND,
    summary="Start SSO: redirects to the provider",
    responses={
        302: {"description": "Redirect to the provider"},
        404: {"description": "Unknown provider"},
    },
)
async def sso_login(
    request: Request,
    provider_key: str,
    settings: AppSettings,
    next_path: Annotated[str | None, Query(alias="next", max_length=500)] = None,
) -> RedirectResponse:
    url, flow = await service.sso_start(settings, provider(request, provider_key), next_path)
    response = RedirectResponse(url, status_code=status.HTTP_302_FOUND)
    set_flow_cookie(response, settings, flow)
    return response


@router.get(
    "/sso/{provider_key}/callback",
    status_code=status.HTTP_302_FOUND,
    summary="SSO callback: signs in and redirects into the app",
    responses={
        302: {"description": "Signed in"},
        400: {"description": "Broken or expired sign-in"},
        403: {"description": "No access"},
    },
)
async def sso_callback(
    request: Request,
    provider_key: str,
    db: Db,
    settings: AppSettings,
    client: Client,
    code: Annotated[str, Query(max_length=4096)],
    state: Annotated[str, Query(max_length=200)],
) -> RedirectResponse:
    signed_in, next_path = await service.sso_complete(
        db,
        settings,
        provider(request, provider_key),
        client,
        code=code,
        state=state,
        flow_token=request.cookies.get(FLOW_COOKIE),
    )
    access, _ = service.access_token_for(settings, signed_in)
    response = RedirectResponse(
        settings.public_base_url.rstrip("/") + next_path, status_code=status.HTTP_302_FOUND
    )
    set_session_cookies(
        response, settings, access_token=access, refresh_token=signed_in.refresh_token
    )
    clear_flow_cookie(response, settings)
    return response
