"""OpenTelemetry traces (docs/features/observability-and-activity § Traces).

OpenTelemetry's tracer provider is global and can be set once per process, and
the instrumentations patch httpx, grpc and SQLAlchemy for the whole process. So
the test with tracing on runs in a child process, and the rest of the suite
keeps running without tracing."""

from __future__ import annotations

import json
import subprocess
import sys
import textwrap

import pytest

from surimi_backend.core.config import Settings
from surimi_backend.observability.tracing import configure_tracing, traces_endpoint
from tests.conftest import APP_DB_PASSWORD, JWT_SECRET

CHILD = textwrap.dedent(
    """
    import json, sys
    from fastapi.testclient import TestClient
    from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
    from surimi_backend.catalog.species import CsvSpeciesLookup
    from surimi_backend.core.config import Settings
    from surimi_backend.integrations.controller import FakeControllerClient
    from surimi_backend.main import create_app
    from surimi_backend.observability.tracing import configure_tracing

    exporter = InMemorySpanExporter()
    settings = Settings(
        controller_mode="fake", db_port=1, jwt_secret=sys.argv[1], cookie_secure=False,
        log_format="json", log_level="DEBUG",
    )
    provider = configure_tracing(settings, "surimi-api", exporter=exporter)
    assert configure_tracing(settings, "other") is provider  # once per process
    app = create_app(settings, controller=FakeControllerClient(), species=CsvSpeciesLookup())
    with TestClient(app) as c:
        c.get("/api/v1/auth/providers")
        c.get("/healthz")
        c.get("/metrics")
    spans = [
        {"name": s.name, "trace_id": format(s.context.trace_id, "032x"),
         "service": s.resource.attributes.get("service.name")}
        for s in exporter.get_finished_spans()
    ]
    print("SPANS " + json.dumps(spans))
    """
)


def test_tracing_is_off_without_an_endpoint(settings: Settings) -> None:
    assert configure_tracing(settings, "surimi-api") is None


def test_traces_go_to_the_otlp_http_path() -> None:
    assert traces_endpoint("http://jaeger:4318") == "http://jaeger:4318/v1/traces"
    assert traces_endpoint("http://jaeger:4318/") == "http://jaeger:4318/v1/traces"


def test_requests_are_traced_and_their_log_lines_carry_the_trace() -> None:
    done = subprocess.run(  # noqa: S603 - our own interpreter and code
        [sys.executable, "-c", CHILD, JWT_SECRET],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    assert done.returncode == 0, done.stderr
    lines = done.stdout.splitlines()
    [spans_line] = [line for line in lines if line.startswith("SPANS ")]
    spans = json.loads(spans_line.removeprefix("SPANS "))
    traced = {s["trace_id"] for s in spans if s["name"] == "GET /api/v1/auth/providers"}
    assert len(traced) == 1
    assert {s["service"] for s in spans} == {"surimi-api"}
    # Probes and scrapes are not traced.
    assert not [s for s in spans if "healthz" in s["name"] or "metrics" in s["name"]]

    records = [json.loads(line) for line in lines if line.startswith("{")]
    [request_line] = [
        r
        for r in records
        if r.get("event") == "http.request" and r.get("path") == "/api/v1/auth/providers"
    ]
    assert request_line["trace_id"] in traced
    assert len(request_line["span_id"]) == 16
    [probe_line] = [
        r for r in records if r.get("event") == "http.request" and r.get("path") == "/healthz"
    ]
    assert "trace_id" not in probe_line


SQL_CHILD = textwrap.dedent(
    """
    import asyncio, json, sys
    from opentelemetry import trace
    from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
    from sqlalchemy import text
    from surimi_backend.core.config import Settings
    from surimi_backend.core.db import create_engine
    from surimi_backend.observability.tracing import configure_tracing

    exporter = InMemorySpanExporter()
    settings = Settings(db_host=sys.argv[1], db_port=int(sys.argv[2]), db_password=sys.argv[3])
    configure_tracing(settings, "surimi-worker", exporter=exporter)

    async def main():
        engine = create_engine(settings)
        try:
            with trace.get_tracer("test").start_as_current_span("worker.cycle"):
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))
        finally:
            await engine.dispose()

    asyncio.run(main())
    spans = exporter.get_finished_spans()
    parents = {s.context.span_id: s.name for s in spans}
    print("SPANS " + json.dumps(
        [{"name": s.name, "parent": parents.get(s.parent.span_id) if s.parent else None,
          "statement": s.attributes.get("db.statement") or s.attributes.get("db.query.text")}
         for s in spans]
    ))
    """
)


@pytest.mark.integration
def test_sql_statements_are_spans_under_the_caller(db_env: dict[str, str]) -> None:
    done = subprocess.run(  # noqa: S603 - our own interpreter and code
        [sys.executable, "-c", SQL_CHILD, db_env["DB_HOST"], db_env["DB_PORT"], APP_DB_PASSWORD],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    assert done.returncode == 0, done.stderr
    [line] = [x for x in done.stdout.splitlines() if x.startswith("SPANS ")]
    spans = json.loads(line.removeprefix("SPANS "))
    sql = [s for s in spans if s["statement"] == "SELECT 1"]
    assert sql, spans
    assert sql[0]["parent"] == "worker.cycle"


GRPC_CHILD = textwrap.dedent(
    """
    import asyncio, json
    import grpc
    from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
    from surimi.v1 import controller_service_pb2_grpc
    from surimi_backend.core.config import Settings
    from surimi_backend.integrations.controller import GrpcControllerClient
    from surimi_backend.observability.tracing import configure_tracing
    from tests.test_grpc_client import Servicer

    exporter = InMemorySpanExporter()
    configure_tracing(Settings(), "surimi-worker", exporter=exporter)

    async def main():
        srv = grpc.aio.server()
        controller_service_pb2_grpc.add_ControllerServiceServicer_to_server(Servicer(), srv)
        port = srv.add_insecure_port("127.0.0.1:0")
        await srv.start()
        client = GrpcControllerClient(f"http://127.0.0.1:{port}", timeout=2, read_retries=0)
        try:
            await client.get_scenario_names()
        finally:
            await client.close()
            await srv.stop(0)

    asyncio.run(main())
    print("SPANS " + json.dumps([s.name for s in exporter.get_finished_spans()]))
    """
)


def test_controller_calls_are_spans() -> None:
    done = subprocess.run(  # noqa: S603 - our own interpreter and code
        [sys.executable, "-c", GRPC_CHILD],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    assert done.returncode == 0, done.stderr
    [line] = [x for x in done.stdout.splitlines() if x.startswith("SPANS ")]
    names = json.loads(line.removeprefix("SPANS "))
    assert "/surimi.v1.ControllerService/GetScenarioNames" in names, names
