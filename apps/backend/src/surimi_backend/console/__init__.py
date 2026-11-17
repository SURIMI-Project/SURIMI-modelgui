"""Backend console: a static sign-in and home page at `/api/v1/console/`
(docs/features/backend-console).

The page only calls the public JSON API, so it can do nothing the API does not
allow. It lives under `/api/v1/` because nginx already forwards that prefix to
the API, which keeps the page on the API's origin: the session cookies and the
CSRF double submit work as they will for the frontend.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import Response
from starlette.types import Scope

from surimi_backend.core.config import Settings

CONSOLE_PATH = "/api/v1/console"
STATIC_DIR = Path(__file__).resolve().parent / "static"

# Only the console's own files run and load, and it talks only to its own
# origin; user names come from SSO providers and must never become markup.
SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
        "connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
    ),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    # Revalidate with the ETag, so a new image's page is used at once.
    "Cache-Control": "no-cache",
}


class ConsoleFiles(StaticFiles):
    """`StaticFiles` that adds the security headers to every response."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        response.headers.update(SECURITY_HEADERS)
        return response


def _to_console() -> RedirectResponse:
    # Relative on purpose: nginx forwards `$host` without the port, so an
    # absolute URL built from the Host header would lose `:18080`.
    return RedirectResponse(f"{CONSOLE_PATH}/", status_code=307)


def install_console(app: FastAPI, settings: Settings) -> None:
    """Mounts the console unless `CONSOLE_ENABLED=false`."""
    if not settings.console_enabled:
        return
    app.add_api_route("/", _to_console, methods=["GET"], include_in_schema=False)
    app.add_api_route(CONSOLE_PATH, _to_console, methods=["GET"], include_in_schema=False)
    app.mount(CONSOLE_PATH, ConsoleFiles(directory=STATIC_DIR, html=True), name="console")
