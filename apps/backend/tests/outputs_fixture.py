"""A small output file with the real layout (one month per chunk, shuffle +
deflate level 1, fill 1e20, NaN for never-written cells, (code, "") rows that
hold nothing), and a matching scenario catalog."""

from __future__ import annotations

from pathlib import Path

import h5py
import numpy as np

from surimi_backend.catalog.schemas import (
    FunctionalGroupOut,
    ScenarioCatalogOut,
    SpeciesEntryOut,
    SpeciesRefOut,
)

FILL = np.float32(1e20)
SPECIES = [("HKE", ""), ("HKE", "adult"), ("HKE", "juvenile"), ("PIL", "adult"), ("PIL", "")]
FLEETS = [("ESP", "OTB"), ("FRA", "PS")]
MARKETS = ["ES", "FR"]
MONTHS = 14  # 2013-01 .. 2014-02
LAT, LON = 4, 5
# 2013-01-01 and every month after, in seconds since 1970.
TIMES = [
    np.datetime64(f"{2013 + m // 12}-{m % 12 + 1:02d}-01").astype("datetime64[s]").astype(np.int64)
    for m in range(MONTHS)
]


def _values(shape: tuple[int, ...], seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.uniform(1, 100, size=shape).astype(np.float32)


def expected_arrays() -> dict[str, np.ndarray]:
    """What the file holds, NaN where nothing was written."""
    t, s, f, m = MONTHS, len(SPECIES), len(FLEETS), len(MARKETS)
    data = {
        "biomass_total": _values((t, s), 1),
        "gross_catch_total": _values((t, s, f), 2),
        "price": _values((t, s, m, 1), 3),
        "sales_value": _values((t, s, f, m), 4),
        "fishing_activity": _values((t, f), 5),
        "biomass": _values((t, s, LAT, LON), 6),
        "gross_catch": _values((t, s, f, LAT, LON), 7),
    }
    for name, values in data.items():
        if "species" in dims_of(name):
            values[:, 0] = np.nan  # (HKE, "") holds nothing
            values[:, 4] = np.nan  # (PIL, "") neither
    # HKE adult and juvenile share one biomass series (one functional group).
    data["biomass_total"][:, 2] = data["biomass_total"][:, 1]
    data["price"][3, 1, 0, 0] = np.inf
    data["price"][4, 1, 1, 0] = 1.3e15
    data["gross_catch"][5] = np.nan  # month 6 never written: chunk absent
    return data


def dims_of(name: str) -> tuple[str, ...]:
    return {
        "biomass_total": ("time", "species"),
        "gross_catch_total": ("time", "species", "fleet"),
        "price": ("time", "species", "market", "category"),
        "sales_value": ("time", "species", "fleet", "market"),
        "fishing_activity": ("time", "fleet"),
        "biomass": ("time", "species", "lat", "lon"),
        "gross_catch": ("time", "species", "fleet", "lat", "lon"),
    }[name]


CHUNKS = {"time": 1, "species": 2, "fleet": 2, "market": 2, "category": 1, "lat": 2, "lon": 3}


def write_output_file(path: Path) -> dict[str, np.ndarray]:
    data = expected_arrays()
    strings = h5py.string_dtype()
    with h5py.File(path, "w") as f:
        scales = {}
        time = f.create_dataset("time", data=np.array(TIMES, dtype=np.float64))
        time.attrs["units"] = b"seconds since 1970-01-01 00:00:00"
        scales["time"] = time
        for name, n in (
            ("species", len(SPECIES)),
            ("fleet", len(FLEETS)),
            ("market", len(MARKETS)),
            ("category", 1),
        ):
            scales[name] = f.create_dataset(name, data=np.zeros(n, dtype=np.float32))
        scales["lat"] = f.create_dataset("lat", data=np.linspace(40, 43, LAT, dtype=np.float32))
        scales["lon"] = f.create_dataset("lon", data=np.linspace(0, 4, LON, dtype=np.float32))
        for name, scale in scales.items():
            scale.make_scale(name)
        axes = {
            "species_code": ([c for c, _ in SPECIES], "species"),
            "species_life_stage": ([s for _, s in SPECIES], "species"),
            "fleet_country_code": ([c for c, _ in FLEETS], "fleet"),
            "fleet_gear_code": ([g for _, g in FLEETS], "fleet"),
            "market_code": (MARKETS, "market"),
            "price_category_code": (["Fresh - Whole"], "category"),
        }
        for name, (values, dim) in axes.items():
            ds = f.create_dataset(name, data=values, dtype=strings)
            ds.dims[0].attach_scale(scales[dim])
        for name, values in data.items():
            dims = dims_of(name)
            ds = f.create_dataset(
                name,
                shape=values.shape,
                dtype=np.float32,
                chunks=tuple(CHUNKS[d] for d in dims),
                compression="gzip",
                compression_opts=1,
                shuffle=True,
                fillvalue=FILL,
            )
            ds.attrs["units"] = b"EUR" if name == "price" else b"kg"
            for month in range(values.shape[0]):
                if name == "gross_catch" and month == 5:
                    continue  # leave the chunks of this month unwritten
                ds[month] = values[month]
            for i, dim in enumerate(dims):
                ds.dims[i].attach_scale(scales[dim])
    data["gross_catch"][5] = np.nan
    return data


def catalog() -> ScenarioCatalogOut:
    return ScenarioCatalogOut(
        scenario_name="test_sea",
        status="complete",
        levels=["functional_group", "species"],
        metric_levels={
            "biomass": "functional_group",
            "gross_catch": "species",
            "price": "species",
            "sales_value": "species",
        },
        functional_groups=[
            FunctionalGroupOut(
                key="g1",
                name="Hake",
                name_source="manual",
                members=[
                    SpeciesRefOut(species_code="HKE", life_stage="adult"),
                    SpeciesRefOut(species_code="HKE", life_stage="juvenile"),
                ],
            ),
            FunctionalGroupOut(
                key="g2",
                name="Sardine",
                name_source="manual",
                members=[SpeciesRefOut(species_code="PIL", life_stage="adult")],
            ),
        ],
        species=[
            SpeciesEntryOut(
                species_code=c,
                life_stage=s,
                name=None,
                scientific_name=None,
                isscaap_group=None,
                functional_group=None,
                hcr_eligible=False,
            )
            for c, s in SPECIES
            if s
        ],
        climate_scenarios=[],
        fleets=[],
        markets=MARKETS,
        built_from={},
        notes=[],
        drift=[],
    )
