"""LLM provider abstraction and Google Gemini implementation."""

import abc
from typing import Optional
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class LLMProvider(abc.ABC):
    """Abstract interface for Language Model providers."""

    @abc.abstractmethod
    async def generate_reply(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate response from language model.

        Args:
            prompt: User message or formatted prompt.
            system_prompt: Optional system instruction prompt.

        Returns:
            str: Generated reply text.
        """
        pass


class GeminiProvider(LLMProvider):
    """Google Gemini AI implementation of LLMProvider."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        """Initialize Gemini client.

        Args:
            settings: Optional configuration settings.
        """
        self.settings = settings or get_settings()
        self._client: Optional[genai.Client] = None
        if self.settings.gemini_api_key:
            try:
                self._client = genai.Client(api_key=self.settings.gemini_api_key)
            except Exception as exc:
                logger.error("Failed to initialize Gemini Client: %s", exc)

    async def generate_reply(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate a response using Gemini API asynchronously.

        Args:
            prompt: The input prompt text.
            system_prompt: Optional system instructions.

        Returns:
            str: Generated response content.
        """
        if not self._client:
            return "AI service is currently unconfigured."

        config: Optional[types.GenerateContentConfig] = None
        if system_prompt:
            config = types.GenerateContentConfig(system_instruction=system_prompt)

        try:
            response = await self._client.aio.models.generate_content(
                model=self.settings.gemini_model,
                contents=prompt,
                config=config,
            )
            return response.text or "No response generated."
        except genai_errors.ServerError as err:
            logger.warning("Gemini server error (%s); attempting fallback to gemini-2.5-flash", err)
            try:
                fallback = await self._client.aio.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=config,
                )
                return fallback.text or "No response generated."
            except Exception as fb_exc:
                logger.error("Fallback Gemini error: %s", fb_exc)
                return f"Error processing request: {fb_exc}"
        except Exception as exc:
            logger.error("Error generating Gemini reply: %s", exc, exc_info=True)
            return f"Error processing request: {exc}"
