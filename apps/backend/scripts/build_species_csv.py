"""Write `catalog/data/species.csv`: every species of the FAO ASFIS list with
six of its fields (ADR 0023, docs/features/scenario-catalog).

Every ASFIS row is kept (user, 2026-11-16), so a code a contract adds later
already has a name. The codes the scenarios use are still collected, to add a
`manual` row for each one ASFIS lacks and to report them. They are those of:
- the three contracts: the copies the fake controller serves
  (`integrations/controller/fake_contracts/`, refreshed by
  `build_scenario_catalog.py --fake-contracts`), or the live ones with
  `--controller-url`;
- the shipped catalog (`catalog/data/catalog/`): group members and
  HCR-eligible entries. A functional group's code (`DF2`) is not a species
  and gets no row (ADR 0029).

Each ASFIS row gets its English and scientific name, family, order or higher
taxa and ISSCAAP group (`source = asfis`). A code in use that ASFIS lacks keeps
the `manual` row already in the file, or gets one with empty fields: nothing
is made up. Manual rows are never dropped. Load the result with
`surimi-backend seed-species`.

    cd apps/backend
    uv run python scripts/build_species_csv.py --asfis <path>/ASFIS_sp_2024.csv

`ASFIS_sp_2024.csv` is the attachment of the controller team's mail of 2026-10-15
(`discussions/CSV with Species names.eml`).
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import sys
from pathlib import Path
from typing import Any

from surimi_backend.catalog.models import SpeciesSource
from surimi_backend.catalog.scenario_data import read_shipped
from surimi_backend.catalog.species import (
    SPECIES_CSV,
    SpeciesRow,
    format_species_csv,
    read_species_file,
)
from surimi_backend.integrations.controller.fake import FAKE_CONTRACTS_DIR
from surimi_backend.integrations.controller.grpc_client import GrpcControllerClient

# ASFIS column -> SpeciesRow field. ASFIS's header has a trailing space after
# ISSCAAP_Group; names are compared stripped.
ASFIS_COLUMNS = {
    "Alpha3_Code": "species_code",
    "English_name": "name",
    "Scientific_Name": "scientific_name",
    "Family": "family",
    "Order or higher taxa": "order_or_higher_taxa",
    "ISSCAAP_Group": "isscaap_group",
}


def read_asfis(path: Path) -> dict[str, SpeciesRow]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows: dict[str, SpeciesRow] = {}
        for raw in csv.DictReader(f):
            cells = {k.strip(): (v or "").strip() for k, v in raw.items() if k}
            missing = [c for c in ASFIS_COLUMNS if c not in cells]
            if missing:
                sys.exit(f"{path.name} lacks the column(s) {', '.join(missing)}")
            values = {field: cells[column] or None for column, field in ASFIS_COLUMNS.items()}
            code = values.pop("species_code")
            if code:
                rows[code] = SpeciesRow(species_code=code, source=SpeciesSource.ASFIS, **values)
    return rows


def contract_species(contract: dict[str, Any]) -> set[str]:
    items = contract.get("simulation", contract).get("items", {})
    return {s["species_code"] for s in items.get("species", []) if s.get("species_code")}


async def live_contract_codes(url: str) -> dict[str, set[str]]:
    client = GrpcControllerClient(url, timeout=30, read_retries=2)
    try:
        return {
            scenario: contract_species(await client.get_simulation_contract(scenario))
            for scenario in await client.get_scenario_names()
        }
    finally:
        await client.close()


def copied_contract_codes(directory: Path) -> dict[str, set[str]]:
    return {
        path.stem: contract_species(json.loads(path.read_text(encoding="utf-8")))
        for path in sorted(directory.glob("*.json"))
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--asfis", type=Path, required=True, help="ASFIS_sp_2024.csv")
    parser.add_argument("--out", type=Path, default=SPECIES_CSV)
    parser.add_argument(
        "--controller-url", help="read the contracts from this controller instead of the copies"
    )
    args = parser.parse_args()

    asfis = read_asfis(args.asfis)
    contracts = (
        asyncio.run(live_contract_codes(args.controller_url))
        if args.controller_url
        else copied_contract_codes(FAKE_CONTRACTS_DIR)
    )
    needed: set[str] = set().union(*contracts.values())
    groups: set[str] = set()
    for data in read_shipped().values():
        groups |= {g.code for g in data.groups}
        needed |= data.member_codes() | {code for code, _ in data.hcr_eligible}
    needed -= groups

    previous = read_species_file(args.out) if args.out.exists() else []
    manual = {r.species_code: r for r in previous if r.source == SpeciesSource.MANUAL}
    rows: dict[str, SpeciesRow] = {**manual, **asfis}
    for code in needed - set(asfis):
        rows.setdefault(code, SpeciesRow(species_code=code, source=SpeciesSource.MANUAL))

    args.out.write_bytes(format_species_csv(rows.values()).encode("utf-8"))
    not_in_asfis = sorted(c for c in needed if c not in asfis)
    unused_manual = sorted(set(manual) - needed)
    report = [
        f"contracts: {', '.join(f'{s} {len(c)} codes' for s, c in contracts.items())}",
        f"ASFIS rows {len(asfis)}; codes the scenarios use {len(needed)}, "
        f"not in ASFIS {len(not_in_asfis)} ({', '.join(not_in_asfis) or 'none'})",
    ]
    if unused_manual:
        report.append(
            f"manual rows kept although no scenario uses them: {', '.join(unused_manual)}"
        )
    report.append(f"wrote {len(rows)} rows to {args.out}")
    sys.stdout.write("\n".join(report) + "\n")


if __name__ == "__main__":
    main()
