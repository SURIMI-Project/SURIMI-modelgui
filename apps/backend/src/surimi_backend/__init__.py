"""Backend of the SURIMI model GUI: REST API and worker."""

from importlib.metadata import PackageNotFoundError, version

try:
    __version__ = version("surimi-backend")
except PackageNotFoundError:  # running from a source tree without install
    __version__ = "0.0.0"
