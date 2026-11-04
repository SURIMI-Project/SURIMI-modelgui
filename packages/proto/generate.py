"""Generate the Python code of the SURIMI controller protocol (ADR 0011).

Exports the pinned module from the Buf Schema Registry and runs grpcio-tools'
protoc on it. Writes packages/proto/src/{surimi,buf}/, which is committed.

    uv run --package surimi-protocol python packages/proto/generate.py

Needs the `buf` CLI: on PATH, or the one the frontend installs
(node_modules/.bin/buf after `npm install`).
"""

from __future__ import annotations

import importlib.metadata
import re
import shutil
import subprocess
import sys
import tempfile
import tomllib
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SRC = HERE / "src"


def find_buf() -> str:
    """buf on PATH, else the native binary npm installs for this platform
    (node_modules/.bin/buf is a shell wrapper that Windows cannot execute)."""
    on_path = shutil.which("buf")
    if on_path:
        return on_path
    for binary in sorted((REPO / "node_modules" / "@bufbuild").glob("buf-*/bin/buf*")):
        if binary.suffix in ("", ".exe"):
            return str(binary)
    sys.exit("buf CLI not found: install it, or run `npm install` at the repo root")


def main() -> None:
    pin = tomllib.loads((HERE / "pyproject.toml").read_text(encoding="utf-8"))["tool"][
        "surimi-protocol"
    ]
    source = f"{pin['module']}:{pin['ref']}"

    from grpc_tools import protoc  # dev dependency of this package

    well_known = Path(protoc.__file__).parent / "_proto"

    with tempfile.TemporaryDirectory() as tmp:
        print(f"export {source}")
        subprocess.run([find_buf(), "export", source, "-o", tmp], check=True)  # noqa: S603
        # protoc wants import-style names with "/" (Windows paths use "\").
        protos = sorted(p.relative_to(tmp).as_posix() for p in Path(tmp).rglob("*.proto"))

        for pkg in ("surimi", "buf"):
            shutil.rmtree(SRC / pkg, ignore_errors=True)
        SRC.mkdir(parents=True, exist_ok=True)

        args = [
            "protoc",
            f"-I{tmp}",
            f"-I{well_known}",
            f"--python_out={SRC}",
            f"--pyi_out={SRC}",
            f"--grpc_python_out={SRC}",
            *protos,
        ]
        if protoc.main(args) != 0:
            sys.exit("protoc failed")

    # Regular packages (not namespace packages), typed.
    for d in [p for p in SRC.rglob("*") if p.is_dir() and "__pycache__" not in p.parts]:
        (d / "__init__.py").touch()
    (SRC / "surimi" / "py.typed").touch()
    # newline="\n": the same bytes on Windows and Linux, so CI's drift check holds.
    (SRC / "surimi" / "PROTOCOL").write_text(f"{source}\n", encoding="utf-8", newline="\n")

    # Runtime lower bounds = versions the code was generated with.
    sample = next((SRC / "surimi" / "v1").glob("*_pb2.py")).read_text(encoding="utf-8")
    pb = re.search(
        r"ValidateProtobufRuntimeVersion\(\s*_runtime_version\.Domain\.PUBLIC,\s*(\d+),\s*(\d+),\s*(\d+)",
        sample,
    )
    protobuf_min = ".".join(pb.groups()) if pb else importlib.metadata.version("protobuf")
    grpc_min = importlib.metadata.version("grpcio-tools")
    pyproject = HERE / "pyproject.toml"
    text = pyproject.read_text(encoding="utf-8")
    text = re.sub(r'"grpcio>=[^"]*"', f'"grpcio>={grpc_min}"', text)
    text = re.sub(r'"protobuf>=[^"]*"', f'"protobuf>={protobuf_min}"', text)
    text = re.sub(r'"grpcio-tools>=[^"]*"', f'"grpcio-tools>={grpc_min}"', text)
    pyproject.write_text(text, encoding="utf-8", newline="\n")

    print(
        f"generated {len(protos)} protos into {SRC}; grpcio>={grpc_min}, protobuf>={protobuf_min}"
    )


if __name__ == "__main__":
    main()
