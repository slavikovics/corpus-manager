import os
import json
import asyncio
import aiohttp
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

        except:
            logger.error(f'Failed to load prompts')
            raise Exception('Failed to load prompts')
    
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
        #formatted_user_prompt = user_prompt.format(sentence=sentence)
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
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f'Failed to send request to OpenRouter. API Error {response.status}: {error_text}')
                    raise Exception(f"API Error {response.status}: {error_text}")
                
                data = await response.json()
                content = data["choices"][0]["message"]["content"]
                
                try:
                    result = SemanticAnalysisResponse.model_validate_json(content)
                    return result
                
                except ValidationError as e:
                    import re
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        result = SemanticAnalysisResponse.model_validate_json(json_match.group())
                        return result
                    raise ValueError(f"Failed to parse response: {e}\nRaw: {content[:500]}")