# Backend image: API (`surimi-backend serve`), migrations
# (`surimi-backend migrate`) and, from phase 5, the worker.
# Build context is the repository root (deployments/compose.yml): the uv
# workspace lock file lives there.

FROM python:3.13-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.10.4 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /repo

# Dependencies first, so source changes do not reinstall them.
COPY pyproject.toml uv.lock ./
COPY apps/backend/pyproject.toml apps/backend/pyproject.toml
COPY packages/proto/pyproject.toml packages/proto/pyproject.toml
RUN uv sync --frozen --no-dev --package surimi-backend --no-install-workspace

COPY packages/proto packages/proto
COPY apps/backend apps/backend
RUN uv sync --frozen --no-dev --package surimi-backend --no-editable

FROM python:3.13-slim
RUN useradd --system --uid 10001 --home-dir /app surimi
COPY --from=build /app/.venv /app/.venv
ENV PATH=/app/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
USER 10001
WORKDIR /app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3)"]
CMD ["surimi-backend", "serve"]
