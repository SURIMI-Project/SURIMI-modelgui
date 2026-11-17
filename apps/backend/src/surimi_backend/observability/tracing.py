"""OpenTelemetry traces (ADR 0010; docs/features/observability-and-activity § Traces).

On only when OTEL_EXPORTER_OTLP_ENDPOINT is set: then a tracer provider with a
batching OTLP/HTTP exporter is installed for the process, and FastAPI,
SQLAlchemy, the grpc aio client and httpx are instrumented. Otherwise no
provider is installed and nothing is patched (importing the instrumentation
packages changes nothing until `instrument()` runs); the `trace.get_tracer`
spans in the worker are then no-ops.

Sampling, headers and resource attributes follow the standard OTEL_* variables,
which the SDK reads itself. `service.name` defaults to `surimi-api` or
`surimi-worker`; OTEL_SERVICE_NAME overrides it.
"""

from __future__ import annotations

from collections.abc import MutableMapping
from typing import TYPE_CHECKING, Any

import structlog
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.grpc import GrpcAioInstrumentorClient
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SimpleSpanProcessor

from surimi_backend.core.config import Settings

if TYPE_CHECKING:
    from fastapi import FastAPI
    from opentelemetry.sdk.trace.export import SpanExporter

log = structlog.get_logger("surimi.tracing")

API_SERVICE = "surimi-api"
WORKER_SERVICE = "surimi-worker"
# Probes and scrapes would be most of the traces and tell nothing.
EXCLUDED_URLS = "healthz,readyz,metrics"
TRACES_PATH = "/v1/traces"

# One provider per process: OpenTelemetry's global can be set only once.
_provider: TracerProvider | None = None


def traces_endpoint(base: str) -> str:
    """OTEL_EXPORTER_OTLP_ENDPOINT is the collector's base URL; traces go to
    <base>/v1/traces (OTLP/HTTP)."""
    return base.rstrip("/") + TRACES_PATH


def configure_tracing(
    settings: Settings, service_name: str, *, exporter: SpanExporter | None = None
) -> TracerProvider | None:
    """Installs tracing for this process if it is configured; idempotent.
    `exporter` lets tests collect spans in memory."""
    global _provider  # noqa: PLW0603 - one provider per process, set once
    if _provider is not None:
        return _provider
    if not settings.otel_exporter_otlp_endpoint and exporter is None:
        return None

    provider = TracerProvider(resource=Resource.create({SERVICE_NAME: service_name}))
    if exporter is not None:
        provider.add_span_processor(SimpleSpanProcessor(exporter))
    else:
        endpoint = traces_endpoint(settings.otel_exporter_otlp_endpoint)
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint)))
    trace.set_tracer_provider(provider)
    # Patches engine and channel creation: must run before the first engine and
    # the controller channel exist (create_app and Worker call this first).
    # skip_dep_check: the newest instrumentation (0.66b2) declares SQLAlchemy < 2.1
    # and would do nothing on our 2.1; it only hooks engine events, which 2.1 keeps.
    # tests/test_tracing.py checks the SQL spans. Remove when it declares 2.1
    # (docs/ISSUES.md).
    SQLAlchemyInstrumentor().instrument(tracer_provider=provider, skip_dep_check=True)
    GrpcAioInstrumentorClient().instrument(tracer_provider=provider)  # type: ignore[no-untyped-call]  # untyped __init__
    HTTPXClientInstrumentor().instrument(tracer_provider=provider)
    _provider = provider
    log.info(
        "tracing.enabled",
        service=provider.resource.attributes.get(SERVICE_NAME),
        endpoint=settings.otel_exporter_otlp_endpoint or "in-memory",
    )
    return provider


def instrument_app(app: FastAPI, provider: TracerProvider | None) -> None:
    if provider is None:
        return

    FastAPIInstrumentor.instrument_app(app, tracer_provider=provider, excluded_urls=EXCLUDED_URLS)


def shutdown_tracing() -> None:
    """Sends the spans still in the batch; called when the process stops."""
    if _provider is not None:
        _provider.force_flush()


def add_trace_ids(_: Any, __: str, event: MutableMapping[str, Any]) -> MutableMapping[str, Any]:
    """structlog processor: a line written inside a span carries its ids, so a
    log line leads to its trace. Without tracing the span is invalid: no ids."""
    context = trace.get_current_span().get_span_context()
    if context.is_valid:
        event["trace_id"] = format(context.trace_id, "032x")
        event["span_id"] = format(context.span_id, "016x")
    return event
