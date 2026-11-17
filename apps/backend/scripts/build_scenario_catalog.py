"""Generate the scenario catalog files (ADR 0017, ADR 0023).

For every scenario the controller reports, reads:
- the contract, from the live controller (GetSimulationContract);
- the Ecopath species -> group mapping, `SURIMI-Ecopath/.../Includes/<s>/<s>.semantics`;
- the Ecopath group names (`EcopathGroup.GroupName`) from the EwE model file
  `<s>.eiixml`, looked up first in SURIMI-data_preprocessing `data-raw/<s>/`,
  then in SURIMI-Ecopath `Includes/<s>/`;
- the entries that can carry a harvest control rule: those with a row in all
  three fisheries authority files (recruitment, initial quota, quota share).

Species names and higher taxa are not here: `scripts/build_species_csv.py`
writes them to `catalog/data/species.csv` (run it after this script, which
refreshes the contract copies it reads).

Nothing is made up: what the sources lack stays null and is listed in the
file's `notes`. Group names set by hand (`"name_source": "manual"`) are kept.
Writes `src/surimi_backend/catalog/data/<scenario>.json` and, with
`--fake-contracts`, the contracts that `CONTROLLER_MODE=fake` serves.

    GIT_LFS_SKIP_SMUDGE=1 git clone -q --depth 1 https://github.com/SURIMI-Project/SURIMI-data_preprocessing.git <tmp>/SURIMI-data_preprocessing
    git clone -q --depth 1 https://github.com/SURIMI-Project/SURIMI-Ecopath.git <tmp>/SURIMI-Ecopath
    git clone -q --depth 1 https://github.com/SURIMI-Project/SURIMI-fisheries-authority.git <tmp>/SURIMI-fisheries-authority
    cd apps/backend
    uv run python scripts/build_scenario_catalog.py \\
        --controller-url https://user-<developer>-surimi-controller.lab.dive.edito.eu \\
        --data-preprocessing <tmp>/SURIMI-data_preprocessing --ecopath <tmp>/SURIMI-Ecopath \\
        --fisheries-authority <tmp>/SURIMI-fisheries-authority \\
        --fake-contracts
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

from surimi_backend.catalog.scenario_catalog import CATALOG_DATA_DIR, CATALOG_FORMAT_VERSION
from surimi_backend.integrations.controller.fake import FAKE_CONTRACTS_DIR
from surimi_backend.integrations.controller.grpc_client import GrpcControllerClient

FA_FILES = ("recruitment", "initial_quota", "quotashare")


def commit_of(repo: Path) -> str:
    result = subprocess.run(  # noqa: S603 - fixed git command on a path given by the developer
        ["git", "-C", str(repo), "log", "-1", "--format=%h"],  # noqa: S607 - git from PATH
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def _fields(text: str) -> dict[str, str]:
    return dict(part.strip().split("=", 1) for part in text.split(";") if "=" in part)


def read_semantics(path: Path) -> list[tuple[str, str, str]]:
    """(group DBID, species code, life stage) in file order."""
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    mappings: list[tuple[str, str, str]] = []
    for domain in data["Domains"]:
        if domain["Domain"] != "Species":
            continue
        for m in domain["Mappings"]:
            source, target = _fields(m["Source"]), _fields(m["Target"])
            mappings.append(
                (
                    target["DBID"].strip(),
                    source["speciescode"].strip(),
                    source.get("lifestage", "").strip(),
                )
            )
    return mappings


def read_ewe_group_names(path: Path) -> dict[str, str]:
    """GroupID -> GroupName of the EwE model's EcopathGroup table. The GroupID
    is the DBID the semantics file refers to (checked for both models)."""
    text = path.read_text(encoding="utf-8")
    table = re.search(
        r'<Table Name="EcopathGroup" Columns="([^"]*)"[^>]*>(.*?)</Table>', text, re.S
    )
    if not table:
        return {}
    columns = [c.split(":")[0] for c in table.group(1).split(",")]
    id_col, name_col = columns.index("GroupID"), columns.index("GroupName")
    rows = csv.reader(re.findall(r"<Row>(.*?)</Row>", table.group(2), re.S))
    return {row[id_col]: row[name_col] for row in rows if row[name_col].strip()}


def read_hcr_eligible(folder: Path, scenario: str) -> list[dict[str, str]] | None:
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
    return [{"species_code": c, "life_stage": s} for c, s in lists[0] if (c, s) in common]


def find_model(scenario: str, preprocessing: Path, ecopath: Path) -> tuple[Path, str] | None:
    for repo, path in (
        (preprocessing, preprocessing / "data-raw" / scenario / f"{scenario}.eiixml"),
        (ecopath, ecopath / "SURIMI-Ecopath" / "Includes" / scenario / f"{scenario}.eiixml"),
    ):
        if path.exists():
            return path, f"{repo.name}@{commit_of(repo)}"
    return None


def build(
    scenario: str,
    contract: dict[str, Any],
    args: argparse.Namespace,
    built_from: dict[str, str],
    previous: dict[str, Any] | None,
) -> dict[str, Any]:
    notes: list[str] = []
    semantics = args.ecopath / "SURIMI-Ecopath" / "Includes" / scenario / f"{scenario}.semantics"
    mappings = read_semantics(semantics) if semantics.exists() else []
    if not mappings:
        notes.append(
            f"No Ecopath species-to-group mapping ({scenario}.semantics) in "
            f"{built_from['SURIMI-Ecopath']}: functional groups unknown"
        )

    model = find_model(scenario, args.data_preprocessing, args.ecopath)
    group_names = read_ewe_group_names(model[0]) if model else {}
    built_from = {**built_from, "ewe_model": model[1] if model else "none"}
    manual = {
        g["key"]: g["name"]
        for g in (previous or {}).get("functional_groups", [])
        if g.get("name_source") == "manual"
    }

    groups: dict[str, list[tuple[str, str]]] = {}
    for key, code, stage in mappings:
        groups.setdefault(key, []).append((code, stage))
    functional_groups: list[dict[str, Any]] = []
    unnamed: list[str] = []
    for key, members in groups.items():
        name, source = (
            (manual[key], "manual")
            if key in manual
            else (group_names[key], "ewe_model")
            if key in group_names
            else (None, None)
        )
        if name is None:
            unnamed.append(key)
        functional_groups.append(
            {
                "key": key,
                "name": name,
                "name_source": source,
                "members": [{"species_code": c, "life_stage": s} for c, s in members],
            }
        )
    if unnamed:
        where = "the EwE model" if model else "any EwE model file found"
        notes.append(f"No name in {where} for group(s) {', '.join(unnamed)}")

    hcr = read_hcr_eligible(
        args.fisheries_authority / "SURIMI-fisheries-authority" / "Includes" / scenario, scenario
    )
    if hcr is None:
        notes.append(
            f"No fisheries authority inputs in {built_from['SURIMI-fisheries-authority']}: "
            "no species can carry a harvest control rule"
        )

    return {
        "format_version": CATALOG_FORMAT_VERSION,
        "scenario_name": scenario,
        "built_from": built_from,
        "notes": notes,
        "functional_groups": functional_groups,
        "hcr_eligible": hcr or [],
    }


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, indent=1, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8", newline="\n")


async def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--controller-url", required=True)
    parser.add_argument("--data-preprocessing", type=Path, required=True)
    parser.add_argument("--ecopath", type=Path, required=True)
    parser.add_argument("--fisheries-authority", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=CATALOG_DATA_DIR)
    parser.add_argument(
        "--fake-contracts", action="store_true", help=f"also write {FAKE_CONTRACTS_DIR}"
    )
    args = parser.parse_args()

    client = GrpcControllerClient(args.controller_url, timeout=30, read_retries=2)
    try:
        built_from = {
            "SURIMI-Ecopath": f"SURIMI-Ecopath@{commit_of(args.ecopath)}",
            "SURIMI-fisheries-authority": (
                f"SURIMI-fisheries-authority@{commit_of(args.fisheries_authority)}"
            ),
            "controller_protocol": await client.get_protocol_version(),
        }
        for scenario in await client.get_scenario_names():
            contract = await client.get_simulation_contract(scenario)
            target = args.out / f"{scenario}.json"
            previous = json.loads(target.read_text(encoding="utf-8")) if target.exists() else None
            data = build(scenario, contract, args, built_from, previous)
            write_json(target, data)
            if args.fake_contracts:
                write_json(FAKE_CONTRACTS_DIR / f"{scenario}.json", contract)
            sys.stdout.write(
                f"{scenario}: {len(data['functional_groups'])} groups, "
                f"{len(data['hcr_eligible'])} HCR-eligible, {len(data['notes'])} notes\n"
            )
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
