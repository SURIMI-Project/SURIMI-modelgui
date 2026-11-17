"""Backend console at /api/v1/console/ (docs/features/backend-console)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from surimi_backend.console import SECURITY_HEADERS
from surimi_backend.core.config import Settings
from surimi_backend.integrations.controller import FakeControllerClient
from surimi_backend.main import create_app


def test_page_is_served_with_security_headers(anonymous_client: TestClient) -> None:
    response = anonymous_client.get("/api/v1/console/")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert 'id="login-form"' in response.text
    for name, value in SECURITY_HEADERS.items():
        assert response.headers[name] == value


def test_assets_are_served_with_their_types(anonymous_client: TestClient) -> None:
    script = anonymous_client.get("/api/v1/console/app.js")
    assert script.status_code == 200
    assert "javascript" in script.headers["content-type"]
    assert script.headers["content-security-policy"] == SECURITY_HEADERS["Content-Security-Policy"]
    style = anonymous_client.get("/api/v1/console/style.css")
    assert style.status_code == 200
    assert style.headers["content-type"].startswith("text/css")


def test_page_has_no_inline_script(anonymous_client: TestClient) -> None:
    # The CSP allows only 'self' scripts: an inline one would be blocked.
    html = anonymous_client.get("/api/v1/console/").text
    assert "<script>" not in html
    assert "onclick=" not in html


def test_redirects_are_relative(anonymous_client: TestClient) -> None:
    # Relative, so the port survives nginx forwarding `$host` without it.
    for path in ("/api/v1/console", "/"):
        response = anonymous_client.get(path, follow_redirects=False)
        assert response.status_code == 307, path
        assert response.headers["location"] == "/api/v1/console/", path


def test_unknown_file_is_404(anonymous_client: TestClient) -> None:
    assert anonymous_client.get("/api/v1/console/nope.js").status_code == 404


def test_not_in_the_openapi_document(anonymous_client: TestClient) -> None:
    paths = anonymous_client.get("/api/v1/openapi.json").json()["paths"]
    assert not any(p == "/" or p.startswith("/api/v1/console") for p in paths)


def test_can_be_switched_off(settings: Settings) -> None:
    off = settings.model_copy(update={"console_enabled": False})
    with TestClient(create_app(off, controller=FakeControllerClient())) as c:
        assert c.get("/api/v1/console/").status_code == 404
        assert c.get("/", follow_redirects=False).status_code == 404
