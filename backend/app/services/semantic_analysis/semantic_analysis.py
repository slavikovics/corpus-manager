import logging
import os
import traceback
from pathlib import Path
from typing import Optional

from openai import AsyncOpenAI
from pydantic import ValidationError

from ...core.config import settings
from ...models.semantics import SemanticAnalysisResponse

logger = logging.getLogger(__name__)


class OpenAIService:
    def __init__(
        self,
        model: str = "deepseek/deepseek-v3.2",
        timeout: int = 60,
    ):
        api_key = getattr(settings, "OPENROUTER_API_KEY", None) or os.getenv(
            "OPENROUTER_API_KEY"
        )
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY is required")

        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            timeout=timeout,
        )
        self.model = model
        self.timeout = timeout
        self._prompt_dir = Path(__file__).resolve().parent

    def _read_prompt(self, filename: str) -> str:
        path = self._prompt_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Prompt file not found: {path}")
        return path.read_text(encoding="utf-8").strip()

    async def analyze_with_default_prompts(
        self, sentence: str
    ) -> SemanticAnalysisResponse:
        try:
            system_prompt = self._read_prompt("system_prompt.txt")
            user_prompt = self._read_prompt("user_prompt.txt")
        except Exception as e:
            logger.error("Failed to load prompts: %s", e)
            logger.error(traceback.format_exc())
            raise RuntimeError("Failed to load prompts") from e

        return await self.analyze(
            sentence=sentence,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

    async def analyze(
        self,
        sentence: str,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2000,
    ) -> SemanticAnalysisResponse:
        model_name = model or self.model
        formatted_user_prompt = f"{user_prompt}\nSentence: {sentence}"

        logger.info("Model: %s", model_name)
        logger.info("Formatted user prompt:\n%s", formatted_user_prompt)
        logger.info("System prompt:\n%s", system_prompt)

        try:
            completion = await self.client.chat.completions.parse(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": formatted_user_prompt},
                ],
                response_format=SemanticAnalysisResponse,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            message = completion.choices[0].message

            if message.parsed:
                return message.parsed

            raise ValueError("Parsing failed")

        except ValueError as e:
            logger.error("Parsing response failed: %s", e)
            logger.error(traceback.format_exc())
            raise
        except Exception as e:
            logger.error("Exception in analyze: %s: %s", type(e).__name__, e)
            logger.error(traceback.format_exc())
            raise

    async def close(self) -> None:
        await self.client.close()
