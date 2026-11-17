"""Prometheus metrics (docs/features/observability-and-activity § Metrics)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from prometheus_client import REGISTRY

from surimi_backend import cli
from surimi_backend.auth.history import ClientInfo, record_login
from surimi_backend.auth.models import LoginMethod, LoginResult
from surimi_backend.catalog.species import CsvSpeciesLookup
from surimi_backend.core.config import Settings
from surimi_backend.integrations.controller import FakeControllerClient
from surimi_backend.main import create_app
from surimi_backend.observability.metrics import prepare_multiprocess_dir


def sample(name: str, **labels: str) -> float:
    return REGISTRY.get_sample_value(name, labels) or 0.0


def test_metrics_are_served_with_route_templates(client: TestClient) -> None:
    before = sample(
        "surimi_http_requests_total",
        method="GET",
        route="/api/v1/scenarios/{scenario_name}/contract",
        status="200",
    )
    assert client.get("/api/v1/scenarios/anchovy_bay/contract").status_code == 200
    assert client.get("/no/such/path/42").status_code == 404

    response = client.get("/metrics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    text = response.text
    assert "surimi_http_request_duration_seconds_bucket" in text
    # The template, never the raw path: one series per route, not per id.
    assert "anchovy_bay" not in text
    assert "/no/such/path" not in text
    assert 'route="unmatched"' in text
    after = sample(
        "surimi_http_requests_total",
        method="GET",
        route="/api/v1/scenarios/{scenario_name}/contract",
        status="200",
    )
    assert after == before + 1


def test_unknown_methods_share_one_label(client: TestClient) -> None:
    before = sample("surimi_http_requests_total", method="other", route="unmatched", status="404")
    client.request("BREW", "/coffee")
    after = sample("surimi_http_requests_total", method="other", route="unmatched", status="404")
    assert after == before + 1


def test_metrics_can_be_switched_off(settings: Settings) -> None:
    off = settings.model_copy(update={"metrics_enabled": False})
    app = create_app(off, controller=FakeControllerClient(), species=CsvSpeciesLookup())
    with TestClient(app) as c:
        assert c.get("/metrics").status_code == 404
        assert "/metrics" not in c.get("/api/v1/openapi.json").json()["paths"]


def test_metrics_are_not_in_the_openapi_document(client: TestClient) -> None:
    assert "/metrics" not in client.get("/api/v1/openapi.json").json()["paths"]


class _Session:
    def __init__(self) -> None:
        self.added: list[Any] = []

    def add(self, row: Any) -> None:
        self.added.append(row)


def test_every_recorded_sign_in_is_counted(settings: Settings) -> None:
    before = sample("surimi_logins_total", method="password", result="bad_credentials")
    db: Any = _Session()
    record_login(
        db,
        settings,
        ClientInfo(ip="10.0.0.1", user_agent="pytest"),
        user_id=None,
        method=LoginMethod.PASSWORD,
        result=LoginResult.BAD_CREDENTIALS,
    )
    assert len(db.added) == 1
    assert sample("surimi_logins_total", method="password", result="bad_credentials") == before + 1


def test_the_multiprocess_folder_is_emptied(tmp_path: Path) -> None:
    folder = tmp_path / "metrics"
    (folder / "old").mkdir(parents=True)
    (folder / "counter_123.db").write_bytes(b"left over")
    prepare_multiprocess_dir(str(folder))
    assert folder.is_dir()
    assert list(folder.iterdir()) == []


@pytest.fixture
def no_uvicorn(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    import uvicorn

    called: dict[str, Any] = {}
    monkeypatch.setattr(uvicorn, "run", lambda *a, **kw: called.update(kw))
    return called


def test_serve_turns_on_multiprocess_metrics_for_several_processes(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, no_uvicorn: dict[str, Any]
) -> None:
    folder = tmp_path / "multiproc"
    folder.mkdir()
    (folder / "stale.db").write_bytes(b"x")
    monkeypatch.setenv("WEB_CONCURRENCY", "2")
    # Registered with monkeypatch, so the value serve() writes is undone after the test.
    monkeypatch.setenv("PROMETHEUS_MULTIPROC_DIR", str(folder))
    cli.serve()
    assert no_uvicorn["workers"] == 2
    assert list(folder.iterdir()) == []


def test_serve_creates_a_folder_when_none_is_given(
    monkeypatch: pytest.MonkeyPatch, no_uvicorn: dict[str, Any]
) -> None:
    import os

    monkeypatch.setenv("WEB_CONCURRENCY", "3")
    monkeypatch.setenv("PROMETHEUS_MULTIPROC_DIR", "")
    cli.serve()
    path = os.environ["PROMETHEUS_MULTIPROC_DIR"]
    assert Path(path).is_dir()
    assert Path(path).name.startswith("surimi-metrics-")


def test_one_process_keeps_the_usual_registry(
    monkeypatch: pytest.MonkeyPatch, no_uvicorn: dict[str, Any]
) -> None:
    import os

    monkeypatch.setenv("WEB_CONCURRENCY", "1")
    monkeypatch.setenv("PROMETHEUS_MULTIPROC_DIR", "")
    cli.serve()
    assert os.environ["PROMETHEUS_MULTIPROC_DIR"] == ""
    assert no_uvicorn["workers"] == 1


METRICS_TOKEN = "metrics-test-token-0123456789-abcdefghij"


def test_with_a_token_only_the_bearer_gets_the_api_metrics(settings: Settings) -> None:
    from pydantic import SecretStr

    guarded = settings.model_copy(update={"metrics_token": SecretStr(METRICS_TOKEN)})
    app = create_app(guarded, controller=FakeControllerClient(), species=CsvSpeciesLookup())
    with TestClient(app) as c:
        missing = c.get("/metrics")
        assert missing.status_code == 401
        assert missing.headers["www-authenticate"].startswith("Bearer")
        assert missing.json()["error"]["code"] == "not_authenticated"
        for wrong in ("Bearer nope", f"Basic {METRICS_TOKEN}", METRICS_TOKEN):
            assert c.get("/metrics", headers={"Authorization": wrong}).status_code == 401, wrong
        ok = c.get("/metrics", headers={"Authorization": f"Bearer {METRICS_TOKEN}"})
        assert ok.status_code == 200
        assert "surimi_http_requests_total" in ok.text


def test_the_worker_server_asks_for_the_same_token() -> None:
    import urllib.error
    import urllib.request

    from pydantic import SecretStr

    from surimi_backend.observability.metrics import serve_metrics

    server = serve_metrics(0, SecretStr(METRICS_TOKEN))
    url = f"http://127.0.0.1:{server.server_port}/metrics"
    try:
        with pytest.raises(urllib.error.HTTPError) as refused:
            urllib.request.urlopen(url, timeout=5)
        assert refused.value.code == 401
        request = urllib.request.Request(url, headers={"Authorization": f"Bearer {METRICS_TOKEN}"})
        with urllib.request.urlopen(request, timeout=5) as answer:  # noqa: S310
            assert answer.status == 200
            assert b"surimi_worker_leader" in answer.read()
    finally:
        server.shutdown()
        server.server_close()


def test_a_short_metrics_token_is_refused() -> None:
    from pydantic import SecretStr, ValidationError

    with pytest.raises(ValidationError, match="METRICS_TOKEN"):
        Settings(metrics_token=SecretStr("too-short"))
