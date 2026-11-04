"""Failed sign-ins per client IP, in memory (ADR 0013: IPs used for rate
limiting are not stored for this). Per-account limits use the database, so they
hold across API replicas; this one is per process and only slows down one
address trying many accounts."""

from __future__ import annotations

import time
from collections import deque


class FailureCounter:
    def __init__(self, *, max_failures: int, window_seconds: float) -> None:
        self._max = max_failures
        self._window = window_seconds
        self._failures: dict[str, deque[float]] = {}

    def _recent(self, key: str) -> deque[float]:
        cutoff = time.monotonic() - self._window
        q = self._failures.get(key)
        if q is None:
            return deque()
        while q and q[0] < cutoff:
            q.popleft()
        if not q:
            del self._failures[key]
        return q

    def blocked(self, key: str | None) -> bool:
        return bool(key) and len(self._recent(key or "")) >= self._max

    def add(self, key: str | None) -> None:
        if not key:
            return
        self._recent(key)
        self._failures.setdefault(key, deque()).append(time.monotonic())

    def clear(self) -> None:
        self._failures.clear()
