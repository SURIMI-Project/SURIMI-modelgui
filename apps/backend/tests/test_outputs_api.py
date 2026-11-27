"""Outputs end to end (phase 6): a run finishes, the worker indexes its file
from a local outputs folder, and the API serves charts, maps and downloads to
the owner and admins only."""

from __future__ import annotations

import asyncio
import json
import struct
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from surimi_backend.core.db import create_engine, create_sessionmaker
from surimi_backend.outputs.indexer import index_pending
from surimi_backend.outputs.read import OutputReader
from surimi_backend.outputs.storage import OutputStorage
from surimi_backend.users.models import Role, User
from tests.conftest import bearer
from tests.outputs_fixture import write_output_file
from tests.world import World, body

pytestmark = pytest.mark.integration


def index(w: World) -> int:
    storage = OutputStorage(w.settings)
    reader = OutputReader(storage, cache_mb=8, merge_gap_kb=64)

    async def go() -> int:
        engine = create_engine(w.settings)
        try:
            async with create_sessionmaker(engine)() as db:
                return await index_pending(db, storage, reader, w.settings)
        finally:
            await engine.dispose()

    return asyncio.run(go())


def finished_run(w: World, headers: dict[str, str]) -> str:
    eid = str(w.client.post("/api/v1/experiments", json=body(), headers=headers).json()["id"])
    w.dispatch()
    w.poll()
    w.clock.advance(500)
    w.poll()
    return eid


def test_outputs_from_finish_to_download(
    make_world: Callable[..., World],
    users: Callable[..., User],
    tmp_path: Path,
    sql: Callable[..., list[Any]],
) -> None:
    w = make_world(outputs_uri=tmp_path.as_uri(), output_stable_seconds=0)
    users("maria")
    users("nikos")
    users("root", Role.ADMIN)
    maria, nikos, admin = (
        bearer(w.client, "maria"),
        bearer(w.client, "nikos"),
        bearer(w.client, "root"),
    )
    eid = finished_run(w, maria)
    base = f"/api/v1/experiments/{eid}/outputs"

    experiment = f"/api/v1/experiments/{eid}"
    assert w.client.get(experiment, headers=maria).json()["status"] == "copying_results"
    assert index(w) == 0  # no file yet
    assert w.client.get(base, headers=maria).json()["state"] == "waiting_for_file"
    assert w.client.get(f"{base}/download-url", headers=maria).status_code == 409
    assert w.client.get(f"{base}/series?metric=gross_catch", headers=maria).status_code == 409

    (tmp_path / eid).mkdir()
    write_output_file(tmp_path / eid / f"{eid}.nc")
    sql("UPDATE experiment_outputs SET next_attempt_at = now()")
    assert index(w) == 0  # size seen for the first time; must be stable
    sql("UPDATE experiment_outputs SET next_attempt_at = now()")
    assert index(w) == 1
    done = w.client.get(experiment, headers=maria).json()
    assert done["status"] == "completed"
    assert done["completed_at"] is not None
    assert [e["type"] for e in done["events"][:2]] == [
        "experiment.status_changed",
        "experiment.status_changed",
    ]
    assert done["events"][0]["data"]["previous_status"] == "copying_results"

    _check_reads(w, base, maria)
    _check_access(w, base, eid, maria, nikos, admin, sql)


def _check_reads(w: World, base: str, maria: dict[str, str]) -> None:
    outputs = w.client.get(base, headers=maria).json()
    assert outputs["state"] == "ready"
    assert outputs["months"][0] == "2013-01"
    assert outputs["report"]["metrics"]["price"]["non_finite"] == 1
    assert {"species_code": "HKE", "life_stage": "adult"}.items() <= outputs["species"][1].items()
    assert outputs["species"][1]["name"] == "European hake"
    assert outputs["fleets"][1] == {"index": 1, "country_code": "FRA", "gear_code": "PS"}

    series = w.client.get(
        f"{base}/series?metric=gross_catch&species=HKE&period=year", headers=maria
    )
    assert series.status_code == 200, series.text
    assert [p["period"] for p in series.json()["points"]] == ["2013", "2014"]
    assert "immutable" in series.headers["cache-control"]
    again = w.client.get(
        f"{base}/series?metric=gross_catch&species=HKE&period=year",
        headers={**maria, "If-None-Match": series.headers["etag"]},
    )
    assert again.status_code == 304

    # No functional groups in northwestern_med since 2026-11-27 (ADR 0029).
    assert {s["functional_group"] for s in outputs["species"]} == {None}
    grid = w.client.get(
        f"{base}/maps?metric=biomass&species=HKE&life_stage=adult&year=2013", headers=maria
    )
    assert grid.status_code == 200, grid.text
    assert len(grid.json()["values"]) == 4
    binary = w.client.get(
        f"{base}/maps?metric=gross_catch&species=HKE&month=2013-02&format=binary", headers=maria
    )
    (length,) = struct.unpack("<I", binary.content[:4])
    header = json.loads(binary.content[4 : 4 + length])
    assert header["shape"] == [4, 5]
    assert len(binary.content) == 4 + length + 4 * 4 * 5


def _check_access(
    w: World,
    base: str,
    eid: str,
    maria: dict[str, str],
    nikos: dict[str, str],
    admin: dict[str, str],
    sql: Callable[..., list[Any]],
) -> None:
    # Someone else's experiment does not exist for nikos; the .bin is for admins.
    assert w.client.get(base, headers=nikos).status_code == 404
    assert w.client.get(f"{base}/download?file=bin", headers=maria).status_code == 403
    files = w.client.get(f"{base}/files", headers=admin).json()
    assert [f["file"] for f in files] == ["nc", "bin"]
    assert files[1]["size_bytes"] is None  # no .bin in this folder
    assert w.client.get(f"{base}/download?file=bin", headers=admin).status_code == 404

    download = w.client.get(f"{base}/download?file=nc", headers=maria, follow_redirects=False)
    assert download.status_code == 200
    assert download.headers["x-accel-redirect"] == f"/protected-outputs/{eid}/{eid}.nc"
    assert download.headers["content-disposition"].startswith(
        'attachment; filename="Hake_and_sardine_to_2014_'
    )
    link = w.client.get(f"{base}/download-url", headers=maria)
    assert link.status_code == 200, link.text
    assert link.json() == {
        "file": "nc",
        "file_name": download.headers["content-disposition"].split('"')[1],
        "size_bytes": files[0]["size_bytes"],
        "url": f"/api/v1/experiments/{eid}/outputs/download?file=nc",
        "presigned": False,  # local mode; the S3 link: test_outputs_read
        "expires_at": None,
    }
    assert w.client.get(f"{base}/download-url", headers=nikos).status_code == 404
    assert w.client.get(f"{base}/download-url?file=bin", headers=maria).status_code == 403
    assert sql(
        "SELECT action, details->>'file' FROM audit_events WHERE action LIKE 'outputs%'"
    ) == [("outputs.downloaded", "nc"), ("outputs.downloaded", "nc")]

    assert (
        w.client.post(f"/api/v1/admin/experiments/{eid}/outputs/reindex", headers=maria).status_code
        == 403
    )
    assert w.client.post(
        f"/api/v1/admin/experiments/{eid}/outputs/reindex", headers=admin
    ).json() == {"state": "pending"}


def test_results_that_never_arrive_fail_and_reindex_copies_again(
    make_world: Callable[..., World],
    users: Callable[..., User],
    tmp_path: Path,
    sql: Callable[..., list[Any]],
) -> None:
    w = make_world(outputs_uri=tmp_path.as_uri(), output_stable_seconds=0, output_wait_minutes=0)
    users("maria")
    users("root", Role.ADMIN)
    maria, admin = bearer(w.client, "maria"), bearer(w.client, "root")
    eid = finished_run(w, maria)
    experiment = f"/api/v1/experiments/{eid}"

    sql("UPDATE experiment_outputs SET created_at = now() - interval '1 minute'")
    assert index(w) == 0
    failed = w.client.get(experiment, headers=maria).json()
    assert failed["status"] == "failed"
    assert failed["error"].startswith(f"results: no file at {tmp_path.as_uri()}")
    assert failed["finished_at"] is not None  # the run itself did finish

    w.settings = w.settings.model_copy(update={"output_wait_minutes": 60})  # for index()
    w.client.post(f"/api/v1/admin/experiments/{eid}/outputs/reindex", headers=admin)
    again = w.client.get(experiment, headers=maria).json()
    assert (again["status"], again["error"]) == ("copying_results", None)
    (tmp_path / eid).mkdir()
    write_output_file(tmp_path / eid / f"{eid}.nc")
    for _ in range(2):
        sql("UPDATE experiment_outputs SET next_attempt_at = now()")
        index(w)
    assert w.client.get(experiment, headers=maria).json()["status"] == "completed"
