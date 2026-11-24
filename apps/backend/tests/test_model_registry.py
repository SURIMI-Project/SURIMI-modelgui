"""Every process that writes rows must know every table its foreign keys name.

The pytest process imports the whole app, so this checks each entry point in a
fresh interpreter: the worker once flushed an `Experiment` without knowing
`initial_hcr_snapshots` (NoReferencedTableError, 2026-11-24)."""

from __future__ import annotations

import subprocess
import sys

import pytest

CHILD = """
import importlib, sys
importlib.import_module(sys.argv[1])
from sqlalchemy.orm import configure_mappers
from surimi_backend.core.db import Base
configure_mappers()
for table in Base.metadata.sorted_tables:
    for fk in table.foreign_keys:
        fk.column  # raises NoReferencedTableError for an unknown table
"""


@pytest.mark.parametrize("module", ["surimi_backend.scheduler.worker"])
def test_entry_point_resolves_every_foreign_key(module: str) -> None:
    done = subprocess.run(  # noqa: S603 - our own interpreter and code
        [sys.executable, "-c", CHILD, module],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    assert done.returncode == 0, done.stderr
