"""Unit tests for structured logging and secret redaction."""

import logging
from app.core.logging import SecretRedactingFilter


def test_secret_redaction_filter_known_secrets() -> None:
    """Test that registered secret strings are masked with [REDACTED]."""
    filter_instance = SecretRedactingFilter(secrets=["super_secret_whatsapp_token", "topsecretkey123"])
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg="Connecting with token super_secret_whatsapp_token to service",
        args=(),
        exc_info=None,
    )
    filter_instance.filter(record)
    assert "super_secret_whatsapp_token" not in record.msg
    assert "[REDACTED]" in record.msg


def test_secret_redaction_filter_bearer_pattern() -> None:
    """Test that Authorization Bearer header patterns are masked."""
    filter_instance = SecretRedactingFilter()
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg="Request headers: Authorization: Bearer EAAB1234567890abcdef",
        args=(),
        exc_info=None,
    )
    filter_instance.filter(record)
    assert "EAAB1234567890abcdef" not in record.msg
    assert "[REDACTED]" in record.msg


def test_secret_redaction_in_record_args() -> None:
    """Test that arguments passed to logger are also sanitized."""
    filter_instance = SecretRedactingFilter(secrets=["confidential_password"])
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg="User authenticated with pass %s",
        args=("confidential_password",),
        exc_info=None,
    )
    filter_instance.filter(record)
    assert record.args == ("[REDACTED]",)
