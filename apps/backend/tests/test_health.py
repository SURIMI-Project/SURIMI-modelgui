from __future__ import annotations

from fastapi.testclient import TestClient


def test_healthz(client: TestClient) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readyz_fails_without_database_and_reports_the_controller(client: TestClient) -> None:
    response = client.get("/readyz")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert body["checks"]["database"]["ok"] is False
    assert body["checks"]["database"]["required"] is True
    assert body["checks"]["controller"] == {
        "ok": True,
        "required": False,
        "latency_ms": body["checks"]["controller"]["latency_ms"],
        "detail": "protocol fake",
    }
    assert body["protocol"].startswith("buf.build/surimi/surimi-protocol:")


def test_request_id_is_echoed_when_valid(client: TestClient) -> None:
    response = client.get("/healthz", headers={"X-Request-ID": "abc-123"})
    assert response.headers["x-request-id"] == "abc-123"


def test_request_id_is_generated_when_missing_or_unsafe(client: TestClient) -> None:
    for headers in ({}, {"X-Request-ID": "bad id with spaces"}):
        rid = client.get("/healthz", headers=headers).headers["x-request-id"]
        assert len(rid) == 32
        assert all(c in "0123456789abcdef" for c in rid)


def test_openapi_document_is_served(client: TestClient) -> None:
    spec = client.get("/api/v1/openapi.json").json()
    assert spec["info"]["title"] == "SURIMI model GUI API"
    assert "/api/v1/scenarios" in spec["paths"]
    assert "/api/v1/scenarios/{scenario_name}/contract" in spec["paths"]
    for path in (
        "/api/v1/auth/login",
        "/api/v1/auth/token",
        "/api/v1/auth/refresh",
        "/api/v1/auth/logout",
        "/api/v1/auth/me",
        "/api/v1/auth/password",
        "/api/v1/auth/providers",
        "/api/v1/auth/sso/{provider_key}/login",
        "/api/v1/auth/sso/{provider_key}/callback",
        "/api/v1/admin/users",
        "/api/v1/admin/users/{user_id}",
        "/api/v1/admin/users/{user_id}/reset-password",
    ):
        assert path in spec["paths"], path


def test_health_and_docs_need_no_sign_in(anonymous_client: TestClient) -> None:
    for path in ("/healthz", "/api/v1/openapi.json", "/api/v1/auth/providers"):
        assert anonymous_client.get(path).status_code == 200, path
