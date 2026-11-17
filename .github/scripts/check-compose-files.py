"""deployments/compose.yml (images) and deployments/compose.local.yml (built from
source) must describe the same stack: they may differ only in the `image` of
the services built here and in their `build` sections (ADR 0026).

Compares what Docker Compose itself resolves from each file, every profile on,
variables not expanded. Exit 1 and a diff when they drift. Needs Docker Compose.

    python .github/scripts/check-compose-files.py
"""

from __future__ import annotations

import difflib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

DEPLOYMENTS = Path(__file__).resolve().parents[2] / "deployments"
BUILT = ("migrate", "api", "worker", "web")


def resolved(name: str) -> dict[str, Any]:
    out = subprocess.run(  # noqa: S603 - fixed docker command
        [  # noqa: S607 - docker from PATH
            "docker",
            "compose",
            "-f",
            str(DEPLOYMENTS / name),
            "--profile",
            "*",
            "config",
            "--no-interpolate",
            "--format",
            "json",
        ],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    config: dict[str, Any] = json.loads(out)
    # x-* blocks are YAML anchors (x-backend holds the image and build); compose
    # has already applied them to the services compared below.
    for key in [k for k in config if k.startswith("x-")]:
        del config[key]
    for service_name, service in config["services"].items():
        service.pop("build", None)
        if service_name in BUILT:
            service.pop("image", None)
    return config


def main() -> int:
    images = json.dumps(resolved("compose.yml"), indent=2, sort_keys=True).splitlines()
    local = json.dumps(resolved("compose.local.yml"), indent=2, sort_keys=True).splitlines()
    if images == local:
        sys.stdout.write("compose.yml and compose.local.yml describe the same stack\n")
        return 0
    sys.stdout.write("compose.yml and compose.local.yml differ outside image and build:\n")
    sys.stdout.writelines(
        line + "\n"
        for line in difflib.unified_diff(
            images, local, "compose.yml", "compose.local.yml", lineterm=""
        )
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
