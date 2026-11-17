"""`surimi-backend` command line.

surimi-backend serve          run the API (uvicorn)
surimi-backend migrate        apply database migrations (alembic upgrade head)
surimi-backend create-admin   create the first admin, or make a user admin
surimi-backend seed-species   load catalog/data/species.csv into the species table
                              (missing codes only; --update overwrites changed rows)
surimi-backend worker         run the worker: poll, queue dispatch, output indexing
surimi-backend version        print the backend version and the pinned protocol
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from importlib import resources
from pathlib import Path
from typing import TYPE_CHECKING

from surimi_backend import __version__

if TYPE_CHECKING:
    from alembic.config import Config


def alembic_config() -> Config:
    from alembic.config import Config

    config = Config()
    config.set_main_option("script_location", str(resources.files("surimi_backend") / "migrations"))
    return config


def migrate(revision: str) -> None:
    from alembic import command

    from surimi_backend.core.config import Settings
    from surimi_backend.core.logging import configure_logging

    configure_logging(Settings())
    command.upgrade(alembic_config(), revision)


def serve() -> None:
    import uvicorn

    from surimi_backend.core.config import Settings

    settings = Settings()
    uvicorn.run(
        "surimi_backend.main:create_app",
        factory=True,
        host=settings.host,
        port=settings.port,
        workers=settings.web_concurrency,
        proxy_headers=True,
        forwarded_allow_ips=settings.trusted_proxies,
        access_log=False,  # RequestContextMiddleware logs requests
        log_config=None,  # keep our structlog configuration
    )


async def _create_admin(
    email: str, username: str, names: tuple[str, str], password: str, *, reset_password: bool
) -> str:
    from surimi_backend.core.config import Settings
    from surimi_backend.core.db import create_engine, create_sessionmaker
    from surimi_backend.users.service import ensure_admin

    engine = create_engine(Settings())
    try:
        async with create_sessionmaker(engine)() as db:
            user, done = await ensure_admin(
                db,
                email=email,
                username=username,
                first_name=names[0],
                last_name=names[1],
                password=password,
                reset_password=reset_password,
            )
            return f"admin {user.username} <{user.email}>: {done}"
    finally:
        await engine.dispose()


def create_admin(args: argparse.Namespace) -> int:
    """Idempotent, so it can run on every start (compose `migrate` service).
    With --from-env it reads ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_FIRST_NAME,
    ADMIN_LAST_NAME, ADMIN_PASSWORD and does nothing when they are not set."""
    from surimi_backend.auth.errors import WeakPasswordError
    from surimi_backend.core.config import Settings
    from surimi_backend.core.errors import ConflictError
    from surimi_backend.core.logging import configure_logging

    settings = Settings()
    configure_logging(settings)
    email = args.email or (settings.admin_email if args.from_env else "")
    username = args.username or (settings.admin_username if args.from_env else "")
    first_name = args.first_name or (settings.admin_first_name if args.from_env else "")
    last_name = args.last_name or (settings.admin_last_name if args.from_env else "")
    password = settings.admin_password.get_secret_value() if args.from_env else ""
    if not password and not args.from_env:
        import getpass

        password = getpass.getpass("Password for the admin: ")
    given = (email, username, first_name, last_name, password)
    if args.from_env and not any(given):
        print("create-admin: ADMIN_* not set; nothing to do")
        return 0
    if not all(given):
        print(
            "create-admin: e-mail, username, first name, last name and password are all "
            "required (--email, --username, --first-name, --last-name, or ADMIN_* with "
            "--from-env)",
            file=sys.stderr,
        )
        return 2
    try:
        print(
            asyncio.run(
                _create_admin(
                    email,
                    username,
                    (first_name, last_name),
                    password,
                    reset_password=args.reset_password,
                )
            )
        )
    except (WeakPasswordError, ConflictError) as exc:
        print(f"create-admin: {exc.message}", file=sys.stderr)
        return 1
    return 0


async def _seed_species(path: Path | None, *, update: bool) -> list[str]:
    import surimi_backend.models  # noqa: F401 - every table, so foreign keys resolve
    from surimi_backend.catalog.species import SPECIES_CSV, read_species_file, seed_species
    from surimi_backend.core.config import Settings
    from surimi_backend.core.db import create_engine, create_sessionmaker

    rows = read_species_file(path or SPECIES_CSV)
    engine = create_engine(Settings())
    try:
        async with create_sessionmaker(engine)() as db:
            report = await seed_species(db, rows, update=update)
    finally:
        await engine.dispose()
    return report.lines()


def seed_species(path: Path | None = None, *, update: bool = False) -> int:
    """Inserts missing codes; with `update` also overwrites changed rows; never
    deletes (catalog/species.py)."""
    from surimi_backend.core.config import Settings
    from surimi_backend.core.logging import configure_logging

    configure_logging(Settings())
    try:
        lines = asyncio.run(_seed_species(path, update=update))
    except (OSError, ValueError) as exc:
        print(f"seed-species: {exc}", file=sys.stderr)
        return 1
    for line in lines:
        print(f"seed-species: {line}")
    return 0


def worker() -> None:
    from surimi_backend.core.config import Settings
    from surimi_backend.core.logging import configure_logging
    from surimi_backend.scheduler.worker import run_worker

    settings = Settings()
    configure_logging(settings)
    asyncio.run(run_worker(settings))


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="surimi-backend")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("serve", help="run the API")
    m = sub.add_parser("migrate", help="apply database migrations")
    m.add_argument("revision", nargs="?", default="head")
    a = sub.add_parser(
        "create-admin", help="create the first admin, or make an existing local user admin"
    )
    a.add_argument("--email")
    a.add_argument("--username")
    a.add_argument("--first-name")
    a.add_argument("--last-name")
    a.add_argument(
        "--from-env",
        action="store_true",
        help="read ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_PASSWORD",
    )
    a.add_argument(
        "--reset-password", action="store_true", help="also set the password of an existing user"
    )
    sp = sub.add_parser(
        "seed-species", help="load species names into the species table (missing codes only)"
    )
    sp.add_argument("--file", type=Path, help="default: catalog/data/species.csv")
    sp.add_argument(
        "--update", action="store_true", help="also overwrite rows that differ from the file"
    )
    sub.add_parser("worker", help="run the worker (one leader at a time, ADR 0019)")
    sub.add_parser("version", help="print versions")
    args = parser.parse_args(argv)

    if args.command == "serve":
        serve()
    elif args.command == "migrate":
        migrate(args.revision)
    elif args.command == "create-admin":
        sys.exit(create_admin(args))
    elif args.command == "seed-species":
        sys.exit(seed_species(args.file, update=args.update))
    elif args.command == "worker":
        worker()
    else:
        from surimi_backend.api.health import pinned_protocol

        print(f"surimi-backend {__version__}, protocol {pinned_protocol()}")
