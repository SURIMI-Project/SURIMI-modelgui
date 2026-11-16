"""Where outputs live: `OUTPUTS_URI` (`s3://bucket/prefix` or `file:///dir`),
read through fsspec in place, by byte range (ADR 0009). Files are never copied
whole. fsspec's calls are blocking, so the API runs them in a thread.

Download links are signed locally with botocore for S3_PUBLIC_ENDPOINT: no
request to S3, and the link allows only a GET of that one object (**Verified**
2026-11-03 against MinIO)."""

from __future__ import annotations

import asyncio
import re
import uuid
from typing import IO, Any
from urllib.parse import urlsplit

import fsspec
from botocore.config import Config
from botocore.session import get_session

from surimi_backend.core.config import Settings
from surimi_backend.core.errors import AppError


class StorageUnavailableError(AppError):
    status_code = 503
    code = "storage_unavailable"


def output_uri(settings: Settings, experiment_id: uuid.UUID) -> str:
    """`<OUTPUTS_URI>/<id>/<id>.nc`, as the output creator writes it."""
    return f"{settings.outputs_uri.rstrip('/')}/{experiment_id}/{experiment_id}.nc"


class OutputStorage:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        parts = urlsplit(settings.outputs_uri)
        self.scheme = parts.scheme or "file"
        if self.scheme == "s3":
            options: dict[str, Any] = {
                "key": settings.s3_access_key_id or None,
                "secret": settings.s3_secret_access_key.get_secret_value() or None,
                "token": settings.s3_session_token.get_secret_value() or None,
                "client_kwargs": {"region_name": settings.s3_region},
            }
            if settings.s3_endpoint_url:
                options["client_kwargs"]["endpoint_url"] = settings.s3_endpoint_url
            self.fs = fsspec.filesystem("s3", **options)
        elif self.scheme == "file":
            self.fs = fsspec.filesystem("file")
        else:
            raise ValueError(f"OUTPUTS_URI must be s3:// or file://, got {settings.outputs_uri!r}")

    @property
    def is_s3(self) -> bool:
        return self.scheme == "s3"

    def path(self, uri: str) -> str:
        """fsspec path of a stored uri: `bucket/key` for S3, a local path for files."""
        parts = urlsplit(uri)
        if parts.scheme == "s3":
            return f"{parts.netloc}{parts.path}"
        path = parts.path if parts.netloc in ("", "localhost") else f"//{parts.netloc}{parts.path}"
        if re.match(r"^/[A-Za-z]:/", path):  # file:///C:/… on Windows
            path = path[1:]
        return path

    def sibling(self, uri: str, suffix: str) -> str:
        """`<id>.bin` next to `<id>.nc`."""
        return uri.rsplit(".", 1)[0] + suffix

    # --- blocking calls (run in a thread) --------------------------------------------

    def size_sync(self, uri: str) -> int | None:
        try:
            info = self.fs.info(self.path(uri))
        except FileNotFoundError:
            return None
        return int(info.get("size") or 0)

    def open_sync(self, uri: str) -> IO[bytes]:
        """For h5py in the worker: a read-ahead cache keeps metadata reads few."""
        handle: IO[bytes] = self.fs.open(
            self.path(uri), "rb", block_size=2**20, cache_type="readahead"
        )
        return handle

    def read_ranges_sync(self, uri: str, ranges: list[tuple[int, int]]) -> list[bytes]:
        if not ranges:
            return []
        path = self.path(uri)
        data: list[bytes] = self.fs.cat_ranges(
            [path] * len(ranges), [a for a, _ in ranges], [b for _, b in ranges]
        )
        return data

    # --- async wrappers ------------------------------------------------------------------

    async def size(self, uri: str) -> int | None:
        try:
            return await asyncio.to_thread(self.size_sync, uri)
        except (OSError, ValueError) as exc:
            raise StorageUnavailableError(f"output storage cannot be read: {exc}") from exc

    async def read_ranges(self, uri: str, ranges: list[tuple[int, int]]) -> list[bytes]:
        try:
            return await asyncio.to_thread(self.read_ranges_sync, uri, ranges)
        except FileNotFoundError:
            raise
        except (OSError, ValueError) as exc:
            raise StorageUnavailableError(f"output storage cannot be read: {exc}") from exc

    # --- downloads -----------------------------------------------------------------------

    def presigned_url(self, uri: str, filename: str) -> str:
        parts = urlsplit(uri)
        endpoint = self.settings.s3_public_endpoint or self.settings.s3_endpoint_url or None
        client = get_session().create_client(
            "s3",
            endpoint_url=endpoint,
            region_name=self.settings.s3_region,
            aws_access_key_id=self.settings.s3_access_key_id or None,
            aws_secret_access_key=self.settings.s3_secret_access_key.get_secret_value() or None,
            aws_session_token=self.settings.s3_session_token.get_secret_value() or None,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )
        url: str = client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": parts.netloc,
                "Key": parts.path.lstrip("/"),
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
            },
            ExpiresIn=self.settings.presigned_url_ttl_seconds,
        )
        return url

    def nginx_location(self, uri: str) -> str:
        """Local mode: the internal nginx path of the file (X-Accel-Redirect)."""
        root = urlsplit(self.settings.outputs_uri).path.rstrip("/")
        relative = urlsplit(uri).path.removeprefix(root).lstrip("/")
        return self.settings.outputs_nginx_prefix.rstrip("/") + "/" + relative
