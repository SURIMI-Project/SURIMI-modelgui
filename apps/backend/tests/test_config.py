from __future__ import annotations

import pytest
from sqlalchemy.engine import make_url

from surimi_backend.core.config import Settings
from surimi_backend.integrations.controller import (
    FakeControllerClient,
    GrpcControllerClient,
    build_controller_client,
)


def test_database_url_is_built_from_pieces_and_escapes_the_password() -> None:
    s = Settings(db_host="db", db_password="p@ss:w/rd%", controller_mode="fake")
    url = make_url(s.sqlalchemy_url.render_as_string(hide_password=False))
    assert url.drivername == "postgresql+asyncpg"
    assert (url.username, url.password, url.host, url.port, url.database) == (
        "surimi_modelgui",
        "p@ss:w/rd%",
        "db",
        5432,
        "surimi_modelgui_db",
    )


def test_database_url_overrides_pieces_and_gets_the_async_driver() -> None:
    s = Settings(
        database_url="postgresql://u:pw@external:6543/other_db",
        db_host="ignored",
        controller_mode="fake",
    )
    assert s.sqlalchemy_url.drivername == "postgresql+asyncpg"
    assert (s.sqlalchemy_url.host, s.sqlalchemy_url.database) == ("external", "other_db")


@pytest.mark.parametrize(("user", "admin_like"), [("postgres", True), ("surimi_modelgui", False)])
def test_admin_like_user_is_detected(user: str, admin_like: bool) -> None:
    assert Settings(db_user=user, controller_mode="fake").db_user_is_admin_like is admin_like


def test_settings_do_not_need_a_controller_url() -> None:
    # The migrate job builds Settings too and has no use for the controller.
    assert Settings(controller_mode="grpc", controller_grpc_url="").controller_grpc_url == ""


async def test_controller_client_follows_the_mode() -> None:
    # async: a grpc.aio channel belongs to a running event loop, as in the app.
    assert isinstance(
        build_controller_client(Settings(controller_mode="fake")), FakeControllerClient
    )
    client = build_controller_client(
        Settings(controller_mode="grpc", controller_grpc_url="http://localhost:50051")
    )
    assert isinstance(client, GrpcControllerClient)
    await client.close()


def test_grpc_mode_without_a_usable_url_fails_with_a_clear_message() -> None:
    with pytest.raises(ValueError, match="CONTROLLER_MODE=fake"):
        build_controller_client(
            Settings(controller_mode="grpc", controller_grpc_url="controller:443")
        )
