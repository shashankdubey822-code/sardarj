"""Structured logging configuration with automatic secret redaction."""

import logging
import re
from typing import Any, Iterable

from app.config import get_settings


class SecretRedactingFilter(logging.Filter):
    """Logging filter that sanitizes and redacts sensitive tokens and secrets."""

    def __init__(self, secrets: Iterable[str] | None = None) -> None:
        """Initialize filter with optional known secrets to mask.

        Args:
            secrets: Collection of sensitive string tokens to redact.
        """
        super().__init__()
        self._secrets: set[str] = set()
        if secrets:
            for s in secrets:
                if s and len(s) >= 4:
                    self._secrets.add(s)

        # Generic patterns for sensitive headers, query parameters, or signatures
        self._regex_patterns = [
            re.compile(r"(Bearer\s+)[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE),
            re.compile(r"(key=)[A-Za-z0-9\-._~+/]+", re.IGNORECASE),
            re.compile(r"(api_key=)[^&\s]+", re.IGNORECASE),
            re.compile(r"(hub\.verify_token=)[^&\s]+", re.IGNORECASE),
            re.compile(r"(verify_token=)[^&\s]+", re.IGNORECASE),
            re.compile(r"(token=)[^&\s]+", re.IGNORECASE),
            re.compile(r"(secret=)[^&\s]+", re.IGNORECASE),
            re.compile(r"(sha256=)[a-fA-F0-9]{64}", re.IGNORECASE),
        ]

    def register_secret(self, secret: str | None) -> None:
        """Add a sensitive token to the redaction registry.

        Args:
            secret: String secret to mask in log outputs.
        """
        if secret and len(secret) >= 4:
            self._secrets.add(secret)

    def _redact_text(self, text: str) -> str:
        """Replace all known secrets and sensitive patterns with [REDACTED].

        Args:
            text: Raw input string message.

        Returns:
            Sanitized string with secrets masked.
        """
        redacted = text
        for secret in self._secrets:
            if secret in redacted:
                redacted = redacted.replace(secret, "[REDACTED]")

        for pattern in self._regex_patterns:
            redacted = pattern.sub(r"\1[REDACTED]", redacted)

        return redacted

    def filter(self, record: logging.LogRecord) -> bool:
        """Intercept and redact log record messages and arguments.

        Args:
            record: The logging event record.

        Returns:
            Always returns True to allow record processing.
        """
        if isinstance(record.msg, str):
            record.msg = self._redact_text(record.msg)

        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: (self._redact_text(v) if isinstance(v, str) else v)
                    for k, v in record.args.items()
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    self._redact_text(arg) if isinstance(arg, str) else arg
                    for arg in record.args
                )

        return True


_GLOBAL_FILTER: SecretRedactingFilter | None = None


def get_redacting_filter() -> SecretRedactingFilter:
    """Return the global secret redacting filter instance.

    Returns:
        SecretRedactingFilter: The configured filter.
    """
    global _GLOBAL_FILTER
    if _GLOBAL_FILTER is None:
        _GLOBAL_FILTER = SecretRedactingFilter()
    return _GLOBAL_FILTER


def setup_logging(level: str | None = None) -> None:
    """Configure structured logging and attach the secret redaction filter.

    Args:
        level: Optional log level override (e.g., 'DEBUG', 'INFO').
    """
    settings = get_settings()
    log_level_str = level or settings.log_level
    numeric_level = getattr(logging, log_level_str.upper(), logging.INFO)

    redacting_filter = get_redacting_filter()
    # Register secrets from settings
    for secret in (
        settings.whatsapp_token,
        settings.meta_app_secret,
        settings.verify_token,
        settings.gemini_api_key,
    ):
        if secret:
            redacting_filter.register_secret(secret)

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Attach filter to all existing handlers, or create console handler if none exist
    if not root_logger.handlers:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.addFilter(redacting_filter)
        root_logger.addHandler(console_handler)
    else:
        for handler in root_logger.handlers:
            handler.setFormatter(formatter)
            if redacting_filter not in handler.filters:
                handler.addFilter(redacting_filter)

    # Attach filter to standard web framework loggers
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "fastapi"):
        fw_logger = logging.getLogger(logger_name)
        if redacting_filter not in fw_logger.filters:
            fw_logger.addFilter(redacting_filter)
        for h in fw_logger.handlers:
            if redacting_filter not in h.filters:
                h.addFilter(redacting_filter)


def get_logger(name: str) -> logging.Logger:
    """Obtain a named logger configured with secret redaction.

    Args:
        name: The logger name/module path.

    Returns:
        logging.Logger: The logger instance.
    """
    logger = logging.getLogger(name)
    redacting_filter = get_redacting_filter()
    if redacting_filter not in logger.filters:
        logger.addFilter(redacting_filter)
    return logger
