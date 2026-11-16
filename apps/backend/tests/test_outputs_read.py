"""Chunk index and reader (ADR 0020) against a file with the real layout, and
the series, map and report rules (docs/features/experiment-outputs § Rules)."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from pathlib import Path

import numpy as np
import pytest
from pydantic import SecretStr, ValidationError

from surimi_backend.core.config import Settings
from surimi_backend.core.errors import InvalidInputError
from surimi_backend.outputs import queries
from surimi_backend.outputs.build import build_index
from surimi_backend.outputs.index import OutputIndex, Variable, pack, unpack
from surimi_backend.outputs.read import Array, OutputReader, merge_ranges
from surimi_backend.outputs.storage import OutputStorage
from tests.outputs_fixture import FLEETS, MONTHS, catalog, write_output_file

EID = uuid.UUID("77c1e2a4-5d3f-4e8a-9c6b-1f2a3d4e5f60")


class Counting(OutputStorage):
    def __init__(self, settings: Settings) -> None:
        super().__init__(settings)
        self.requests = 0

    def read_ranges_sync(self, uri: str, ranges: list[tuple[int, int]]) -> list[bytes]:
        self.requests += len(ranges)
        return super().read_ranges_sync(uri, ranges)


@pytest.fixture(scope="module")
def built(
    tmp_path_factory: pytest.TempPathFactory,
) -> tuple[dict[str, np.ndarray], Counting, OutputIndex, str]:
    root = tmp_path_factory.mktemp("outputs")
    folder = root / str(EID)
    folder.mkdir()
    path = folder / f"{EID}.nc"
    data = write_output_file(path)
    settings = Settings(outputs_uri=root.as_uri(), jwt_secret="x" * 40)
    storage = Counting(settings)
    uri = f"{root.as_uri()}/{EID}/{EID}.nc"
    with storage.open_sync(uri) as handle:
        index = unpack(pack(build_index(handle, path.stat().st_size)))
    return data, storage, index, uri


def reader_for(storage: OutputStorage, uri: str) -> tuple[OutputReader, queries.ReadBox]:
    reader = OutputReader(storage, cache_mb=16, merge_gap_kb=64)

    def read(var: Variable, box: Sequence[slice]) -> Array:
        return reader.read_box_sync(uri, EID, var, box)

    return reader, read


def test_index_has_the_axes_and_variables(
    built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str],
) -> None:
    _, _, index, _ = built
    assert index.months[:2] == ["2013-01", "2013-02"]
    assert len(index.months) == MONTHS
    assert index.axes["species"][1] == {"species_code": "HKE", "life_stage": "adult"}
    assert index.axes["fleets"][1] == {"country_code": "FRA", "gear_code": "PS"}
    assert index.variables["gross_catch"].dims == ("time", "species", "fleet", "lat", "lon")
    assert index.variables["gross_catch"].filters == ("shuffle", "deflate")


@pytest.mark.parametrize(
    "name",
    [
        "biomass_total",
        "gross_catch_total",
        "price",
        "sales_value",
        "fishing_activity",
        "biomass",
        "gross_catch",
    ],
)
def test_every_variable_reads_back_exactly(
    built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str], name: str
) -> None:
    data, storage, index, uri = built
    _, read = reader_for(storage, uri)
    var = index.variables[name]
    whole = read(var, [slice(0, n) for n in var.shape])
    np.testing.assert_array_equal(whole, data[name].astype(np.float64))
    # A box that cuts through chunks on every axis (edge chunks included).
    box = [slice(1, min(3, n)) if n > 1 else slice(0, 1) for n in var.shape]
    part = read(var, box)
    np.testing.assert_array_equal(part, data[name].astype(np.float64)[tuple(box)])


def test_chunks_are_fetched_in_merged_ranges_and_cached(
    built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str],
) -> None:
    _, storage, index, uri = built
    reader, read = reader_for(storage, uri)
    var = index.variables["biomass_total"]
    before = storage.requests
    read(var, [slice(0, n) for n in var.shape])
    assert storage.requests - before == 1  # 14 months x 3 species chunks in one request
    read(var, [slice(0, n) for n in var.shape])
    assert storage.requests - before == 1  # second time from the cache
    assert reader.cache.used > 0


def test_merge_ranges() -> None:
    assert merge_ranges([(100, 200), (0, 50), (60, 90), (1000, 1100)], gap=20) == [
        (0, 200),
        (1000, 1100),
    ]
    assert merge_ranges([(0, 50), (80, 90)], gap=20) == [(0, 50), (80, 90)]


def series(
    built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str], **kw: object
) -> dict[str, object]:
    _, storage, index, uri = built
    _, read = reader_for(storage, uri)
    metric = str(kw.pop("metric"))
    period = kw.pop("period", "month")
    return queries.series(
        index, catalog(), read, metric=metric, selection=queries.Selection(**kw), period=period
    )  # type: ignore[arg-type]


def values(result: dict[str, object]) -> list[float | None]:
    return [p["value"] for p in result["points"]]  # type: ignore[attr-defined,index]


def test_a_species_total_sums_its_life_stages_and_the_empty_row_adds_nothing(
    built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str],
) -> None:
    data = built[0]
    hke = values(series(built, metric="gross_catch", species="HKE"))
    expected = data["gross_catch_total"][:, 1:3, :].astype(np.float64).sum(axis=(1, 2))
    np.testing.assert_allclose(hke, expected, rtol=1e-6)
    adult_esp = values(
        series(built, metric="gross_catch", species="HKE", life_stage="adult", fleet=0)
    )
    np.testing.assert_allclose(adult_esp, data["gross_catch_total"][:, 1, 0], rtol=1e-6)


def test_group_biomass_is_one_member_not_the_sum(
    built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str],
) -> None:
    data = built[0]
    group = values(series(built, metric="biomass", functional_group="g1"))
    np.testing.assert_allclose(group, data["biomass_total"][:, 1], rtol=1e-6)
    # Total biomass: one member per group (HKE adult + PIL adult), not 1.5x.
    total = values(series(built, metric="biomass"))
    np.testing.assert_allclose(
        total, data["biomass_total"][:, 1] + data["biomass_total"][:, 3], rtol=1e-6
    )
    with pytest.raises(InvalidInputError, match="functional-group value"):
        series(built, metric="biomass", species="HKE")


def test_price_is_cleaned_and_counted(
    built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str],
) -> None:
    result = series(built, metric="price", species="HKE", life_stage="adult")
    assert result["cleaned"] == {"non_finite": 1, "out_of_range": 1}
    data = built[0]
    month3 = values(result)[3]
    assert month3 == pytest.approx(
        float(data["price"][3, 1, 1, 0]), rel=1e-6
    )  # the inf market dropped


def test_yearly_sum_and_mean(
    built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str],
) -> None:
    data = built[0]
    yearly = series(built, metric="gross_catch", species="PIL", period="year")
    assert [p["period"] for p in yearly["points"]] == ["2013", "2014"]  # type: ignore[attr-defined,index]
    np.testing.assert_allclose(
        values(yearly)[0], data["gross_catch_total"][:12, 3, :].sum(), rtol=1e-5
    )
    biomass = series(built, metric="biomass", functional_group="g2", period="year")
    np.testing.assert_allclose(values(biomass)[1], data["biomass_total"][12:, 3].mean(), rtol=1e-5)


def test_unknown_inputs_are_422(
    built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str],
) -> None:
    for kw in (
        {"metric": "nope"},
        {"metric": "gross_catch", "species": "XXX"},
        {"metric": "gross_catch", "fleet": len(FLEETS)},
    ):
        with pytest.raises(InvalidInputError):
            series(built, **kw)


def test_maps(built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str]) -> None:
    data, storage, index, uri = built
    _, read = reader_for(storage, uri)
    grid, header = queries.grid(
        index,
        catalog(),
        read,
        metric="gross_catch",
        selection=queries.Selection(species="HKE"),
        month="2013-03",
        year=None,
    )
    np.testing.assert_allclose(
        grid, data["gross_catch"][2, 1:3].astype(np.float64).sum(axis=(0, 1)), rtol=1e-6
    )
    assert header["shape"] == [4, 5]
    # The month whose chunks were never written is all null.
    empty, _ = queries.grid(
        index,
        catalog(),
        read,
        metric="gross_catch",
        selection=queries.Selection(species="HKE"),
        month="2013-06",
        year=None,
    )
    assert np.isnan(empty).all()
    year, _ = queries.grid(
        index,
        catalog(),
        read,
        metric="biomass",
        selection=queries.Selection(functional_group="g1"),
        month=None,
        year="2013",
    )
    np.testing.assert_allclose(
        year, data["biomass"][:12, 1].astype(np.float64).mean(axis=0), rtol=1e-5
    )


def test_report(built: tuple[dict[str, np.ndarray], Counting, OutputIndex, str]) -> None:
    _, storage, index, uri = built
    _, read = reader_for(storage, uri)
    report = queries.report(index, read)
    assert report["months"] == MONTHS
    assert report["metrics"]["price"]["non_finite"] == 1
    assert report["metrics"]["price"]["out_of_range"] == 1
    assert report["shared_biomass_series"] == [["HKE adult", "HKE juvenile"]]


def test_windows_and_posix_file_uris(tmp_path: Path) -> None:
    storage = OutputStorage(Settings(outputs_uri=tmp_path.as_uri(), jwt_secret="x" * 40))
    target = tmp_path / "a.nc"
    target.write_bytes(b"0123456789")
    assert storage.read_ranges_sync(target.as_uri(), [(2, 5)]) == [b"234"]
    assert storage.size_sync(target.as_uri()) == 10
    assert storage.size_sync((tmp_path / "missing.nc").as_uri()) is None


def test_presigned_link_is_for_the_public_endpoint_and_expires(settings: Settings) -> None:
    """Signing is local: no request reaches S3."""
    s3 = settings.model_copy(
        update={
            "outputs_uri": "s3://experiments/output_creator/experiments",
            "s3_endpoint_url": "http://minio.internal:9000",
            "s3_public_endpoint": "https://minio.dive.edito.eu",
            "s3_access_key_id": "AKIAEXAMPLE",
            "s3_secret_access_key": SecretStr("not-a-real-secret"),
        }
    )
    url = OutputStorage(s3).presigned_url(
        "s3://experiments/output_creator/experiments/x/x.nc", "run_x.nc"
    )
    assert url.startswith(
        "https://minio.dive.edito.eu/experiments/output_creator/experiments/x/x.nc?"
    )
    assert "X-Amz-Expires=3600" in url  # 1 hour by default (user, 2026-11-16)
    assert "response-content-disposition=attachment" in url


@pytest.mark.parametrize("seconds", [59, 604_801])
def test_the_link_lifetime_is_bounded(seconds: int) -> None:
    """At least a minute; at most 7 days, the longest an S3 SigV4 signature lives."""
    with pytest.raises(ValidationError):
        Settings(presigned_url_ttl_seconds=seconds)
