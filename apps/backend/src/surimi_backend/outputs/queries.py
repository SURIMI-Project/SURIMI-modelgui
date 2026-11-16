"""Charts, maps and the data-quality report from an output file
(docs/features/experiment-outputs § Rules). Pure numpy over arrays the
reader returns; nothing here does I/O.

Rules, from the real files (**Verified** 2026-11-05 and 2026-11-06):
- The species axis has every contract (code, life stage) plus a (code, "")
  row per code; values sit in the life-stage rows and the (code, "") rows are
  NaN. A species total is the NaN-ignoring sum of its rows.
- Biomass is a functional-group value copied to every member species, so a
  group's biomass is **one** member's series, never a sum (ADR 0017); a total
  takes one member per group.
- Cleaning: ±inf and values out of range become null and are counted; NaN
  (never written) is null and not counted as a problem.
- Yearly values: mean for biomass, price and fishing activity; sum otherwise.
"""

from __future__ import annotations

import warnings
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any, Literal

import numpy as np

from surimi_backend.catalog.schemas import ScenarioCatalogOut
from surimi_backend.core.errors import InvalidInputError
from surimi_backend.outputs.index import OutputIndex, Variable
from surimi_backend.outputs.read import Array

Period = Literal["month", "year"]
Level = Literal["functional_group", "species"]
ReadBox = Callable[[Variable, Sequence[slice]], Array]


@dataclass(frozen=True)
class Metric:
    variable: str
    yearly: Literal["sum", "mean"]
    combine: Literal["sum", "mean"]  # across species rows, fleets, markets
    bound: float  # larger values are out of range


SERIES_METRICS: dict[str, Metric] = {
    "biomass": Metric("biomass_total", "mean", "sum", 1e12),
    "gross_catch": Metric("gross_catch_total", "sum", "sum", 1e12),
    "dead_discards": Metric("dead_discards_total", "sum", "sum", 1e12),
    "live_discards": Metric("live_discards_total", "sum", "sum", 1e12),
    "sales_quantity": Metric("sales_quantity", "sum", "sum", 1e12),
    "sales_value": Metric("sales_value", "sum", "sum", 1e12),
    # EUR per kg; real files hold values up to 1.3e15 (docs/ISSUES.md).
    "price": Metric("price", "mean", "mean", 1e4),
    "fishing_activity": Metric("fishing_activity", "mean", "mean", 1e12),
}
MAP_METRICS: dict[str, Metric] = {
    "biomass": Metric("biomass", "mean", "sum", 1e12),
    "gross_catch": Metric("gross_catch", "sum", "sum", 1e12),
    "dead_discards": Metric("dead_discards", "sum", "sum", 1e12),
    "live_discards": Metric("live_discards", "sum", "sum", 1e12),
}


# --- helpers ----------------------------------------------------------------------------


def clean(values: Array, bound: float) -> tuple[Array, dict[str, int]]:
    out = values.copy()
    infinite = np.isinf(out)
    finite = np.isfinite(out)
    with np.errstate(invalid="ignore"):
        wild = finite & ((out < 0) | (out > bound))
    out[infinite | wild] = np.nan
    return out, {"non_finite": int(infinite.sum()), "out_of_range": int(wild.sum())}


def combine(values: Array, axis: int, how: Literal["sum", "mean"]) -> Array:
    """NaN-ignoring sum or mean that stays NaN where every input is NaN."""
    empty = np.isnan(values).all(axis=axis)
    with np.errstate(invalid="ignore"), warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)  # mean of an all-NaN slice
        result = np.nansum(values, axis=axis) if how == "sum" else np.nanmean(values, axis=axis)
    result = np.asarray(result, dtype=np.float64)
    result[empty] = np.nan
    return result


def _months_slice(index: OutputIndex, start: str | None, end: str | None) -> slice:
    months = index.months
    lo = 0 if start is None else next((i for i, m in enumerate(months) if m >= start), len(months))
    hi = (
        len(months)
        if end is None
        else next((i + 1 for i in range(len(months) - 1, -1, -1) if months[i] <= end), 0)
    )
    if lo >= hi:
        raise InvalidInputError(
            f"no months between {start} and {end}; the run covers {months[0]} to {months[-1]}"
        )
    return slice(lo, hi)


def _rows(index: OutputIndex, code: str, stage: str | None) -> list[int]:
    rows = [
        i
        for i, s in enumerate(index.axes["species"])
        if s["species_code"].upper() == code.upper()
        and (stage is None or s["life_stage"].lower() == stage.lower())
    ]
    if not rows:
        label = f"{code} {stage or ''}".strip()
        raise InvalidInputError(f"{label} is not in this run's outputs")
    return rows


def _group(catalog: ScenarioCatalogOut, key: str) -> list[tuple[str, str]]:
    for g in catalog.functional_groups:
        if g.key == key:
            return [(m.species_code, m.life_stage) for m in g.members]
    raise InvalidInputError(
        f"no functional group {key!r} in {catalog.scenario_name}; see /api/v1/scenarios/{catalog.scenario_name}/catalog"
    )


def _member_rows(index: OutputIndex, members: list[tuple[str, str]]) -> list[list[int]]:
    """Rows per member; a member without a life stage takes all its code's rows."""
    out = []
    for code, stage in members:
        rows = [
            i
            for i, s in enumerate(index.axes["species"])
            if s["species_code"] == code and (not stage or s["life_stage"].lower() == stage.lower())
        ]
        if rows:
            out.append(rows)
    return out


def _first_with_data(per_member: list[Array]) -> Array:
    for series in per_member:
        if not np.isnan(series).all():
            return series
    return per_member[0]


def _by_year(
    months: list[str], values: Array, how: Literal["sum", "mean"]
) -> tuple[list[str], Array]:
    """`values` has time as its first axis."""
    years = sorted({m[:4] for m in months})
    stacked = [
        combine(values[[i for i, m in enumerate(months) if m[:4] == y]], 0, how) for y in years
    ]
    return years, np.stack(stacked)


def _check_level(catalog: ScenarioCatalogOut, metric: str, level: Level) -> None:
    finest = catalog.metric_levels.get(metric)
    if metric == "biomass" and level == "species" and finest == "functional_group":
        raise InvalidInputError(
            f"biomass in {catalog.scenario_name} is a functional-group value copied to each member "
            "species; ask by functional_group (ADR 0017)"
        )
    if level not in catalog.levels and metric != "fishing_activity":
        raise InvalidInputError(
            f"{catalog.scenario_name} has no {level} level; it has {', '.join(catalog.levels)}"
        )


# --- selection --------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Selection:
    """What to read: a species (all its life stages unless one is given) or a
    functional group, and optionally one fleet or market."""

    species: str | None = None
    life_stage: str | None = None
    functional_group: str | None = None
    fleet: int | None = None
    market: str | None = None

    @property
    def level(self) -> Level:
        return "functional_group" if self.functional_group else "species"

    def describe(self) -> dict[str, Any]:
        return {
            "species": self.species,
            "life_stage": self.life_stage,
            "functional_group": self.functional_group,
            "fleet": self.fleet,
            "market": self.market,
        }


def _select_species(
    index: OutputIndex,
    catalog: ScenarioCatalogOut,
    values: Array,
    axis: int,
    metric: str,
    how: Literal["sum", "mean"],
    selection: Selection,
) -> Array:
    """Reduce the species axis of `values` by the rules above."""

    def rows_of(rows: list[int]) -> Array:
        return combine(np.take(values, rows, axis=axis), axis, how)

    if selection.species:
        return rows_of(_rows(index, selection.species, selection.life_stage))
    if selection.functional_group:
        group = selection.functional_group
        per_member = [rows_of(r) for r in _member_rows(index, _group(catalog, group))]
        if not per_member:
            raise InvalidInputError(
                f"no member of functional group {group} is in this run's outputs"
            )
        if metric == "biomass":
            return _first_with_data(per_member)
        return combine(np.stack(per_member), 0, how)
    if metric == "biomass" and catalog.functional_groups:
        # A total takes one member per group, plus every species in no group.
        grouped: set[int] = set()
        parts: list[Array] = []
        for g in catalog.functional_groups:
            members = _member_rows(index, [(m.species_code, m.life_stage) for m in g.members])
            for rows in members:
                grouped.update(rows)
            if members:
                parts.append(_first_with_data([rows_of(r) for r in members]))
        rest = [i for i in range(values.shape[axis]) if i not in grouped]
        if rest:
            parts.append(rows_of(rest))
        return combine(np.stack(parts), 0, "sum")
    return combine(values, axis, how)


def _reduce_dim(
    index: OutputIndex,
    values: Array,
    dims: list[str],
    dim: str,
    selection: Selection,
    how: Literal["sum", "mean"],
) -> Array:
    """Pick the selected fleet or market, or combine the dimension away."""
    axis = dims.index(dim)
    if dim == "fleet" and selection.fleet is not None:
        if not 0 <= selection.fleet < values.shape[axis]:
            raise InvalidInputError(
                f"fleet must be 0..{values.shape[axis] - 1} (see the outputs' fleets)"
            )
        values = np.take(values, selection.fleet, axis=axis)
    elif dim == "market" and selection.market is not None:
        markets = index.axes["markets"]
        if selection.market not in markets:
            raise InvalidInputError(f"market {selection.market!r} is not in this run's outputs")
        values = np.take(values, markets.index(selection.market), axis=axis)
    else:
        values = combine(values, axis, how)
    dims.pop(axis)
    return values


def _variable(index: OutputIndex, name: str) -> Variable:
    var = index.variables.get(name)
    if var is None:
        raise InvalidInputError(f"this run's outputs have no {name}")
    return var


# --- series ---------------------------------------------------------------------------


def series(
    index: OutputIndex,
    catalog: ScenarioCatalogOut,
    read: ReadBox,
    *,
    metric: str,
    selection: Selection,
    period: Period = "month",
    start: str | None = None,
    end: str | None = None,
) -> dict[str, Any]:
    spec = SERIES_METRICS.get(metric)
    if spec is None:
        raise InvalidInputError(f"metric must be one of {', '.join(SERIES_METRICS)}")
    if selection.species and selection.functional_group:
        raise InvalidInputError("ask by species or by functional_group, not both")
    if selection.species or selection.functional_group:
        _check_level(catalog, metric, selection.level)
    var = _variable(index, spec.variable)
    months = _months_slice(index, start, end)
    box = [months if d == "time" else slice(0, n) for d, n in zip(var.dims, var.shape, strict=True)]
    values, cleaned = clean(read(var, box), spec.bound)
    dims = list(var.dims)
    for dim in ("fleet", "market", "category"):
        if dim in dims:
            values = _reduce_dim(index, values, dims, dim, selection, spec.combine)
    if "species" in dims:
        values = _select_species(
            index, catalog, values, dims.index("species"), metric, spec.combine, selection
        )
    labels = index.months[months]
    if period == "year":
        labels, values = _by_year(labels, values, spec.yearly)
    return {
        "metric": metric,
        "unit": var.units or None,
        "period": period,
        **selection.describe(),
        "points": [
            {"period": label, "value": None if np.isnan(v) else float(v)}
            for label, v in zip(labels, values.tolist(), strict=True)
        ],
        "cleaned": cleaned,
    }


# --- maps ------------------------------------------------------------------------------


def _map_rows(
    index: OutputIndex, catalog: ScenarioCatalogOut, selection: Selection
) -> list[list[int]]:
    """Species rows per member: one entry for a species, one per member for a group."""
    if selection.species:
        return [_rows(index, selection.species, selection.life_stage)]
    rows = _member_rows(index, _group(catalog, str(selection.functional_group)))
    if not rows:
        raise InvalidInputError(
            f"no member of functional group {selection.functional_group} is in this run's outputs"
        )
    return rows


def _map_box(var: Variable, months: slice, lo: int, hi: int, fleet: int | None) -> list[slice]:
    box: list[slice] = []
    for d, n in zip(var.dims, var.shape, strict=True):
        if d == "time":
            box.append(months)
        elif d == "species":
            box.append(slice(lo, hi))
        elif d == "fleet" and fleet is not None:
            if not 0 <= fleet < n:
                raise InvalidInputError(f"fleet must be 0..{n - 1}")
            box.append(slice(fleet, fleet + 1))
        else:
            box.append(slice(0, n))
    return box


def grid(
    index: OutputIndex,
    catalog: ScenarioCatalogOut,
    read: ReadBox,
    *,
    metric: str,
    selection: Selection,
    month: str | None,
    year: str | None,
) -> tuple[Array, dict[str, Any]]:
    """A lat x lon grid for a month or a year, and the facts that go with it."""
    spec = MAP_METRICS.get(metric)
    if spec is None:
        raise InvalidInputError(f"map metric must be one of {', '.join(MAP_METRICS)}")
    if bool(selection.species) == bool(selection.functional_group):
        raise InvalidInputError("give species (and optionally life_stage) or functional_group")
    if (month is None) == (year is None):
        raise InvalidInputError("give month (YYYY-MM) or year (YYYY)")
    _check_level(catalog, metric, selection.level)
    var = _variable(index, spec.variable)
    months = _months_slice(index, month or f"{year}-01", month or f"{year}-12")
    groups = _map_rows(index, catalog, selection)
    every = sorted({r for rows in groups for r in rows})
    lo, hi = every[0], every[-1] + 1
    values, cleaned = clean(read(var, _map_box(var, months, lo, hi, selection.fleet)), spec.bound)
    dims = list(var.dims)
    if "fleet" in dims:
        values = combine(values, dims.index("fleet"), "sum")
        dims.remove("fleet")
    axis = dims.index("species")
    per_member = [
        combine(np.take(values, [r - lo for r in rows], axis=axis), axis, "sum") for rows in groups
    ]
    if metric == "biomass" and selection.functional_group:
        values = _first_with_data(per_member)
    else:
        values = combine(np.stack(per_member), 0, "sum")
    values = combine(values, 0, spec.yearly)  # time away; lat x lon remain
    return values, {
        "metric": metric,
        "unit": var.units or None,
        "period": month or year,
        **selection.describe(),
        "shape": list(values.shape),
        "lat": index.axes["lat"],
        "lon": index.axes["lon"],
        "cleaned": cleaned,
    }


# --- report ---------------------------------------------------------------------------


def report(index: OutputIndex, read: ReadBox) -> dict[str, Any]:
    """Counts per chart metric, and species rows that share one biomass series."""
    counts: dict[str, Any] = {}
    for metric, spec in SERIES_METRICS.items():
        var = index.variables.get(spec.variable)
        if var is None:
            continue
        raw = read(var, [slice(0, n) for n in var.shape])
        _, cleaned = clean(raw, spec.bound)
        counts[metric] = {
            "cells": int(raw.size),
            "with_value": int(np.isfinite(raw).sum()) - cleaned["out_of_range"],
            "never_written": int(np.isnan(raw).sum()),
            **cleaned,
        }
    shared: list[list[str]] = []
    var = index.variables.get("biomass_total")
    if var is not None:
        values = read(var, [slice(0, n) for n in var.shape])
        seen: dict[bytes, list[str]] = {}
        for row, s in enumerate(index.axes["species"]):
            column = values[:, row]
            if np.isnan(column).all():
                continue
            seen.setdefault(np.nan_to_num(column, nan=-1.0).tobytes(), []).append(
                f"{s['species_code']} {s['life_stage']}".strip()
            )
        shared = [members for members in seen.values() if len(members) > 1]
    months = index.months
    return {
        "parser_version": index.parser_version,
        "months": len(months),
        "first_month": months[0] if months else None,
        "last_month": months[-1] if months else None,
        "metrics": counts,
        "shared_biomass_series": shared,
    }
