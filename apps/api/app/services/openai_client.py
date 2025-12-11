"""OpenAI client service with retry logic."""

import logging
from functools import lru_cache
from typing import List, Optional
import httpx
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from ..core.config import get_settings

logger = logging.getLogger(__name__)


class OpenAIClient:
    """OpenAI API client with retry and error handling."""

    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        self.default_model = "gpt-4o-mini"
        self.vision_model = "gpt-4o"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def chat_completion(
        self,
        messages: List[dict],
        model: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2000,
    ) -> str:
        """
        Create a chat completion with retry logic.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (defaults to gpt-4o-mini)
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response

        Returns:
            The assistant's response content
        """
        model = model or self.default_model

        logger.info(f"Creating chat completion with model: {model}")

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            content = response.choices[0].message.content or ""

            logger.info(
                f"Chat completion successful. Tokens used: "
                f"{response.usage.total_tokens if response.usage else 'unknown'}"
            )

            return content

        except Exception as e:
            logger.error(f"Chat completion failed: {e}")
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def vision_completion(
        self,
        prompt: str,
        image_url: str,
        model: Optional[str] = None,
        max_tokens: int = 4000,
    ) -> str:
        """
        Create a vision completion with an image URL.

        Args:
            prompt: The text prompt
            image_url: URL of the image (can be base64 data URL)
            model: Model to use (defaults to gpt-4o)
            max_tokens: Maximum tokens in response

        Returns:
            The assistant's response content
        """
        model = model or self.vision_model

        logger.info(f"Creating vision completion with model: {model}")

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
            )

            content = response.choices[0].message.content or ""

            logger.info(
                f"Vision completion successful. Tokens used: "
                f"{response.usage.total_tokens if response.usage else 'unknown'}"
            )

            return content

        except Exception as e:
            logger.error(f"Vision completion failed: {e}")
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def upload_file(self, file_content: bytes, filename: str) -> str:
        """
        Upload a file to OpenAI for use with assistants/responses API.

        Args:
            file_content: The file content as bytes
            filename: The filename

        Returns:
            The file ID from OpenAI
        """
        logger.info(f"Uploading file to OpenAI: {filename}")

        try:
            # Create a file-like object from bytes
            file = await self.client.files.create(
                file=(filename, file_content),
                purpose="assistants",
            )

            logger.info(f"File uploaded successfully. ID: {file.id}")
            return file.id

        except Exception as e:
            logger.error(f"File upload failed: {e}")
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def extract_from_pdf_file(
        self,
        file_id: str,
        prompt: str,
        model: str = "gpt-4.1",
    ) -> str:
        """
        Extract data from a PDF file using OpenAI's responses API.

        Args:
            file_id: The OpenAI file ID
            prompt: The extraction prompt
            model: Model to use

        Returns:
            The extracted content
        """
        logger.info(f"Extracting from PDF file: {file_id}")

        # Use the responses API endpoint directly via httpx
        # since the SDK might not have full support yet
        settings = get_settings()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "input": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "input_text", "text": prompt},
                                {"type": "input_file", "file_id": file_id},
                            ],
                        }
                    ],
                },
                timeout=120.0,
            )

            response.raise_for_status()
            data = response.json()

            # Extract text from response
            output = data.get("output", [])
            if output and len(output) > 0:
                content = output[0].get("content", [])
                if content and len(content) > 0:
                    return content[0].get("text", "")

            return ""


@lru_cache()
def get_openai_client() -> OpenAIClient:
    """Get cached OpenAI client instance."""
    settings = get_settings()
    return OpenAIClient(api_key=settings.openai_api_key)
