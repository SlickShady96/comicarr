#  Copyright (C) 2025–2026 Comicarr contributors
#
#  This file is part of Comicarr.
#
#  Comicarr is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.

"""Tests for comicarr.app.ai.client."""

from unittest.mock import MagicMock, patch

import pytest


class _MockConfig:
    """Minimal config object for testing."""

    def __init__(self, **kwargs):
        self.AI_BASE_URL = kwargs.get("AI_BASE_URL", None)
        self.AI_API_KEY = kwargs.get("AI_API_KEY", None)
        self.AI_MODEL = kwargs.get("AI_MODEL", None)


class TestCreateAiClients:
    @patch("comicarr.app.ai.client.OpenAI")
    @patch("comicarr.app.ai.client.AsyncOpenAI")
    def test_valid_config_returns_clients(self, mock_async, mock_sync):
        mock_sync.return_value = MagicMock()
        mock_async.return_value = MagicMock()

        from comicarr.app.ai.client import create_ai_clients

        config = _MockConfig(
            AI_BASE_URL="http://localhost:11434/v1",
            AI_API_KEY="sk-test-key",
            AI_MODEL="llama3",
        )
        sync_client, async_client = create_ai_clients(config)
        assert sync_client is not None
        assert async_client is not None
        mock_sync.assert_called_once()
        mock_async.assert_called_once()

    def test_empty_config_returns_none(self):
        from comicarr.app.ai.client import create_ai_clients

        config = _MockConfig()
        sync_client, async_client = create_ai_clients(config)
        assert sync_client is None
        assert async_client is None

    def test_missing_model_returns_none(self):
        from comicarr.app.ai.client import create_ai_clients

        config = _MockConfig(
            AI_BASE_URL="http://localhost:11434/v1",
            AI_API_KEY="sk-test-key",
        )
        sync_client, async_client = create_ai_clients(config)
        assert sync_client is None
        assert async_client is None

    def test_failed_decryption_returns_none(self):
        from comicarr.app.ai.client import create_ai_clients

        config = _MockConfig(
            AI_BASE_URL="http://localhost:11434/v1",
            AI_API_KEY="gAAAAABf1234encrypted_key_here",
            AI_MODEL="llama3",
        )
        sync_client, async_client = create_ai_clients(config)
        assert sync_client is None
        assert async_client is None

    def test_file_scheme_rejected(self):
        from comicarr.app.ai.client import create_ai_clients

        config = _MockConfig(
            AI_BASE_URL="file:///etc/passwd",
            AI_API_KEY="sk-test-key",
            AI_MODEL="llama3",
        )
        sync_client, async_client = create_ai_clients(config)
        assert sync_client is None
        assert async_client is None

    def test_ftp_scheme_rejected(self):
        from comicarr.app.ai.client import create_ai_clients

        config = _MockConfig(
            AI_BASE_URL="ftp://evil.com/v1",
            AI_API_KEY="sk-test-key",
            AI_MODEL="llama3",
        )
        sync_client, async_client = create_ai_clients(config)
        assert sync_client is None
        assert async_client is None

    def test_http_non_local_rejected(self):
        from comicarr.app.ai.client import create_ai_clients

        config = _MockConfig(
            AI_BASE_URL="http://api.openai.com/v1",
            AI_API_KEY="sk-test-key",
            AI_MODEL="gpt-4",
        )
        sync_client, async_client = create_ai_clients(config)
        assert sync_client is None
        assert async_client is None

    @patch("comicarr.app.ai.client.OpenAI")
    @patch("comicarr.app.ai.client.AsyncOpenAI")
    def test_https_non_local_accepted(self, mock_async, mock_sync):
        mock_sync.return_value = MagicMock()
        mock_async.return_value = MagicMock()

        from comicarr.app.ai.client import create_ai_clients

        config = _MockConfig(
            AI_BASE_URL="https://api.openai.com/v1",
            AI_API_KEY="sk-test-key",
            AI_MODEL="gpt-4",
        )
        sync_client, async_client = create_ai_clients(config)
        assert sync_client is not None
        assert async_client is not None

    @patch("comicarr.app.ai.client.OpenAI")
    @patch("comicarr.app.ai.client.AsyncOpenAI")
    def test_http_localhost_accepted(self, mock_async, mock_sync):
        mock_sync.return_value = MagicMock()
        mock_async.return_value = MagicMock()

        from comicarr.app.ai.client import create_ai_clients

        config = _MockConfig(
            AI_BASE_URL="http://127.0.0.1:11434/v1",
            AI_API_KEY="sk-test-key",
            AI_MODEL="llama3",
        )
        sync_client, async_client = create_ai_clients(config)
        assert sync_client is not None
        assert async_client is not None


def _clients_for(base_url):
    from comicarr.app.ai.client import create_ai_clients

    config = _MockConfig(AI_BASE_URL=base_url, AI_API_KEY="sk-test-key", AI_MODEL="llama3")
    return create_ai_clients(config)


class TestPlainHttpHosts:
    @pytest.mark.parametrize(
        "base_url",
        [
            "http://localhost:11434/v1",
            "http://127.0.0.1:11434/v1",
            "http://[::1]:11434/v1",
            "http://10.0.0.5:11434/v1",
            "http://192.168.1.20:11434/v1",
            "http://172.16.0.1:11434/v1",
            "http://172.20.0.3:4000/v1",
            "http://172.31.255.254:4000/v1",
            "http://omniroute:20128/v1",
            "http://ollama:11434/v1",
        ],
    )
    @patch("comicarr.app.ai.client.OpenAI")
    @patch("comicarr.app.ai.client.AsyncOpenAI")
    def test_local_private_and_container_hosts_accepted(self, mock_async, mock_sync, base_url):
        sync_client, async_client = _clients_for(base_url)
        assert sync_client is not None
        assert async_client is not None

    @pytest.mark.parametrize(
        "base_url",
        [
            "http://172.15.255.255:4000/v1",
            "http://172.32.0.1:4000/v1",
            "http://8.8.8.8/v1",
            "http://api.openai.com/v1",
            "http://ollama.example.com:11434/v1",
            "http://10.example.com/v1",
            "http://192.168.evil.com/v1",
        ],
    )
    def test_public_hosts_rejected_over_http(self, base_url):
        sync_client, async_client = _clients_for(base_url)
        assert sync_client is None
        assert async_client is None

    @pytest.mark.parametrize(
        "base_url",
        ["https://api.openai.com/v1", "https://172.32.0.1/v1", "https://omniroute:20128/v1"],
    )
    @patch("comicarr.app.ai.client.OpenAI")
    @patch("comicarr.app.ai.client.AsyncOpenAI")
    def test_https_unaffected(self, mock_async, mock_sync, base_url):
        sync_client, async_client = _clients_for(base_url)
        assert sync_client is not None
        assert async_client is not None
