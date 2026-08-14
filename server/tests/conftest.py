"""
Pytest configuration and global test fixtures.
"""

import pytest
from server.tests.harness.virtual_clock import VirtualClock
from server.tests.harness.schema_validator import SchemaValidator
from server.tests.harness.factories import EntityFactory
from server.tests.harness.mock_client import MockClient


@pytest.fixture
def clock():
    """Provides a fresh VirtualClock instance for zero-sleep time progression."""
    return VirtualClock(start_time=0.0, default_dt=0.0333333333)


@pytest.fixture
def validator():
    """Provides the OpenSpec schema validator."""
    return SchemaValidator


@pytest.fixture
def factory():
    """Provides entity and packet factories."""
    return EntityFactory


@pytest.fixture
def create_mock_client():
    """Factory fixture to spawn mock clients."""
    def _create(client_id: str = "client-1", nickname: str = "TestPlayer", skin: str = "neon_blue"):
        return MockClient(client_id=client_id, nickname=nickname, skin=skin)
    return _create
