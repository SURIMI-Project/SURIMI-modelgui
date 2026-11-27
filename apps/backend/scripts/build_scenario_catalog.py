"""Refresh the shipped scenario catalog (ADR 0029, 0030) in
`src/surimi_backend/catalog/data/catalog/`.

- `--groups <scenario>=<csv>` (repeatable): writes `<scenario>.groups.csv`
  from a partner list of functional groups (one row per member species), read
  as the admin import reads it: the partner headers (`Stock`, `GroupMICE`,
  `Species`, `Name`, `GroupCMSY`, `SpecCode`, `Continent`, `Region`,
  `Subregion`) need no mapping; `--name-source` sets the groups' name source.
- `--fisheries-authority <repo>`: rewrites the HCR-eligible entries of every
  scenario that has fisheries authority inputs (an entry with a row in all
  three files: recruitment, initial quota, quota share). Scenarios without
  inputs keep their rows in `hcr_eligible.csv` (`aegean_sea`'s groups are set
  there by hand, ADR 0029).
- `--controller-url` with `--fake-contracts`: writes the contracts that
  `CONTROLLER_MODE=fake` serves.

A scenario the controller reports that `scenarios.csv` lacks is added with
no notes. Nothing is made up. The result is loaded by `surimi-backend
seed-catalog` (or `--update`); an admin can also import a groups file at
`POST /api/v1/admin/scenarios/{name}/groups/import`.

    cd apps/backend
    uv run python scripts/build_scenario_catalog.py \\
        --groups aegean_sea=scripts/sources/aegean_sea_species_functional_groups.csv \\
        --name-source model_team
    git clone -q --depth 1 https://github.com/SURIMI-Project/SURIMI-fisheries-authority.git <tmp>/fa
    uv run python scripts/build_scenario_catalog.py --fisheries-authority <tmp>/fa \\
        --controller-url https://project-surimi-surimi-controller.lab.dive.edito.eu --fake-contracts
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import io
import json
import sys
from pathlib import Path
from typing import Any, Literal, cast

from surimi_backend.catalog.group_import import GroupImportOptions, convert
from surimi_backend.catalog.scenario_data import (
    CATALOG_DIR,
    GROUPS_SUFFIX,
    HCR_ELIGIBLE_CSV,
    SCENARIOS_CSV,
    read_shipped,
)
from surimi_backend.integrations.controller.fake import FAKE_CONTRACTS_DIR
from surimi_backend.integrations.controller.grpc_client import GrpcControllerClient

FA_FILES = ("recruitment", "initial_quota", "quotashare")


def read_hcr_eligible(folder: Path, scenario: str) -> list[tuple[str, str]] | None:
    """None when the scenario has no fisheries authority inputs at all."""
    lists: list[list[tuple[str, str]]] = []
    for name in FA_FILES:
        path = folder / f"{scenario}_{name}.csv"
        if not path.exists():
            return None
        with path.open(encoding="utf-8-sig", newline="") as f:
            lists.append(
                [
                    (r["species_code"].strip(), r["life_stage"].strip().lower())
                    for r in csv.DictReader(f)
                    if r.get("species_code", "").strip()
                ]
            )
    common = set(lists[1]) & set(lists[2])
    return sorted({e for e in lists[0] if e in common})


def write_csv(path: Path, rows: list[list[str]]) -> None:
    out = io.StringIO()
    csv.writer(out, lineterminator="\n").writerows(rows)
    path.write_text(out.getvalue(), encoding="utf-8", newline="\n")


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, indent=1, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8", newline="\n")


async def live_scenarios(url: str, *, fake_contracts: bool) -> list[str]:
    client = GrpcControllerClient(url, timeout=30, read_retries=2)
    try:
        names = await client.get_scenario_names()
        if fake_contracts:
            for scenario in names:
                write_json(
                    FAKE_CONTRACTS_DIR / f"{scenario}.json",
                    await client.get_simulation_contract(scenario),
                )
        return names
    finally:
        await client.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--groups", action="append", default=[], metavar="SCENARIO=CSV")
    parser.add_argument("--name-source", choices=("model_team", "manual"), default="model_team")
    parser.add_argument("--fisheries-authority", type=Path)
    parser.add_argument("--controller-url")
    parser.add_argument("--fake-contracts", action="store_true")
    parser.add_argument("--out", type=Path, default=CATALOG_DIR)
    args = parser.parse_args()

    report: list[str] = []
    shipped = read_shipped(args.out)
    notes = {name: "\n".join(d.notes) for name, d in shipped.items()}
    if args.controller_url:
        for scenario in asyncio.run(
            live_scenarios(args.controller_url, fake_contracts=args.fake_contracts)
        ):
            if scenario not in notes:
                notes[scenario] = ""
                report.append(f"{scenario}: added to {SCENARIOS_CSV}")
    write_csv(args.out / SCENARIOS_CSV, [["scenario_name", "notes"], *map(list, notes.items())])

    name_source = cast(Literal["model_team", "manual"], args.name_source)
    for spec in args.groups:
        scenario, _, source = spec.partition("=")
        if scenario not in notes or not source:
            sys.exit(f"--groups {spec}: give a scenario of {SCENARIOS_CSV} and a file")
        text = convert(
            Path(source).read_bytes(), GroupImportOptions(default_name_source=name_source)
        )
        (args.out / f"{scenario}{GROUPS_SUFFIX}").write_text(text, encoding="utf-8", newline="\n")
        report.append(f"{scenario}: {text.count(chr(10)) - 1} member rows from {source}")

    eligible = {name: list(d.hcr_eligible) for name, d in shipped.items()}
    if args.fisheries_authority:
        includes = args.fisheries_authority / "SURIMI-fisheries-authority" / "Includes"
        for scenario in notes:
            entries = read_hcr_eligible(includes / scenario, scenario)
            if entries is not None:
                eligible[scenario] = entries
                report.append(
                    f"{scenario}: {len(entries)} HCR-eligible from the fisheries authority"
                )
    write_csv(
        args.out / HCR_ELIGIBLE_CSV,
        [
            ["scenario_name", "species_code", "life_stage"],
            *([s, c, st] for s in notes for c, st in eligible.get(s, [])),
        ],
    )
    read_shipped(args.out)  # what seed-catalog will read must load
    sys.stdout.write("\n".join(report or ["nothing changed"]) + "\n")


if __name__ == "__main__":
    main()
