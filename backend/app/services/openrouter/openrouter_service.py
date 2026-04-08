import os
import json
import asyncio
import aiohttp
import traceback
from typing import Optional, List
from pydantic import BaseModel, ValidationError
from enum import Enum
from ...models.semantics import SemanticAnalysisResponse
from ...core.config import settings
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class OpenRouterService:    
    def __init__(
        self,
        base_url: str = "https://openrouter.ai/api/v1",
        timeout: int = 60
    ):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is required")
        
        self.base_url = base_url
        self.timeout = timeout
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Title": "Semantic Analyzer"
        }

    async def analyze_with_default_prompts(self, sentence: str) -> SemanticAnalysisResponse:
        path = os.path.dirname(os.path.abspath(__file__))
        try:
            SYSTEM_PROMPT = None
            with open(os.path.join(path, 'system_prompt.txt')) as file:
                SYSTEM_PROMPT = file.read()

            USER_PROMPT = None
            with open(os.path.join(path, 'user_prompt.txt')) as file:
                USER_PROMPT = file.read()

            if not SYSTEM_PROMPT or not USER_PROMPT:
                raise Exception('Prompt was None')

        except Exception as e:
            logger.error(f'Failed to load prompts: {e}')
            logger.error(traceback.format_exc())
            raise Exception('Failed to load prompts') from e
    
        result = await self.analyze(
            sentence=sentence,
            system_prompt=SYSTEM_PROMPT,
            user_prompt=USER_PROMPT
        )

        return result
    
    async def analyze(
        self,
        sentence: str,
        system_prompt: str,
        user_prompt: str,
        model: str = "openai/gpt-4o-mini",
        temperature: float = 0.1,
        max_tokens: int = 2000
    ) -> SemanticAnalysisResponse:
        formatted_user_prompt = user_prompt + f"Sentence: {sentence}"
        json_schema = SemanticAnalysisResponse.model_json_schema()

        logger.info(f'Formatted user prompt: \n{formatted_user_prompt}')
        logger.info(f'System prompt: {system_prompt}')
        logger.info(f'JSON schema: {json_schema}')
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": formatted_user_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {                
                "type": "json_schema",
                "json_schema": {
                    "name": "semantic_analysis",
                    "schema": json_schema,
                    "strict": True
                }
            }
        }

        logger.info(payload)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f'OpenRouter API Error {response.status}: {error_text}')
                        raise Exception(f"API Error {response.status}: {error_text}\nResponse body: {error_text}")
                    
                    data = await response.json()
                    content = data["choices"][0]["message"]["content"]
                    
                    logger.info(f"OpenRouter raw response: {content}")
                    
                    try:
                        result = SemanticAnalysisResponse.model_validate_json(content)
                        return result
                    
                    except ValidationError as e:
                        
                        import re
                        json_match = re.search(r'\{.*\}', content, re.DOTALL)
                        if json_match:
                            try:
                                result = SemanticAnalysisResponse.model_validate_json(json_match.group())
                                return result
                            except ValidationError as e2:
                                logger.error(f"Failed to parse even matched JSON. Original: {content[:500]}")
                                logger.error(f"Matched: {json_match.group()[:500]}")
                                raise ValueError(f"Failed to parse response even after JSON extraction. Original error: {e}\nRaw content: {content[:500]}") from e2
                        raise ValueError(f"Failed to parse response: {e}\nRaw content: {content[:500]}")
                        
        except Exception as e:
            logger.error(f"Exception in analyze method: {type(e).__name__}: {e}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")
            raise