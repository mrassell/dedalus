"""
LLM Client abstraction for multiple providers
"""

import asyncio
import json
import os
import logging
from typing import Any, AsyncIterator, Dict, List, Optional, Union
from abc import ABC, abstractmethod
import httpx

from .types import Message, MessageRole, ToolCall, TextContent, ImageContent

logger = logging.getLogger(__name__)


class LLMClient(ABC):
    """Abstract base class for LLM clients"""
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        pass


class AnthropicClient(LLMClient):
    """Client for Anthropic Claude models"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.base_url = "https://api.anthropic.com/v1"
    
    def _convert_messages(self, messages: List[Message]) -> tuple[Optional[str], List[Dict]]:
        """Convert messages to Anthropic format"""
        system_prompt = None
        converted = []
        
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system_prompt = msg.content if isinstance(msg.content, str) else str(msg.content)
                continue
            
            content = msg.content
            if isinstance(content, list):
                anthropic_content = []
                for item in content:
                    if isinstance(item, TextContent):
                        anthropic_content.append({"type": "text", "text": item.text})
                    elif isinstance(item, ImageContent):
                        if item.url:
                            anthropic_content.append({
                                "type": "image",
                                "source": {
                                    "type": "url",
                                    "url": item.url
                                }
                            })
                        elif item.base64_data:
                            anthropic_content.append({
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": item.media_type,
                                    "data": item.base64_data
                                }
                            })
                content = anthropic_content
            
            converted.append({
                "role": "user" if msg.role == MessageRole.USER else "assistant",
                "content": content
            })
        
        return system_prompt, converted
    
    def _convert_tools(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert tools to Anthropic format"""
        anthropic_tools = []
        for tool in tools:
            if tool.get("type") == "function":
                func = tool["function"]
                anthropic_tools.append({
                    "name": func["name"],
                    "description": func.get("description", ""),
                    "input_schema": func.get("parameters", {"type": "object", "properties": {}})
                })
        return anthropic_tools
    
    async def chat(
        self,
        messages: List[Message],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        model: str = "claude-3-5-sonnet-20241022"
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        
        system_prompt, converted_messages = self._convert_messages(messages)
        
        payload = {
            "model": model,
            "messages": converted_messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        if system_prompt:
            payload["system"] = system_prompt
        
        if tools:
            payload["tools"] = self._convert_tools(tools)
        
        if stream:
            return self._stream_chat(payload)
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Anthropic API error: {response.text}")
                raise Exception(f"Anthropic API error: {response.status_code}")
            
            return self._parse_response(response.json())
    
    def _parse_response(self, response: Dict) -> Dict[str, Any]:
        """Parse Anthropic response to common format"""
        content = ""
        tool_calls = []
        
        for block in response.get("content", []):
            if block["type"] == "text":
                content += block["text"]
            elif block["type"] == "tool_use":
                tool_calls.append(ToolCall(
                    id=block["id"],
                    name=block["name"],
                    arguments=block["input"]
                ))
        
        return {
            "content": content,
            "tool_calls": tool_calls,
            "stop_reason": response.get("stop_reason"),
            "usage": response.get("usage", {})
        }
    
    async def _stream_chat(self, payload: Dict) -> AsyncIterator[Dict[str, Any]]:
        """Stream chat completion"""
        payload["stream"] = True
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json=payload
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = json.loads(line[6:])
                        yield data


class GoogleClient(LLMClient):
    """Client for Google Gemini models"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
    
    def _convert_messages(self, messages: List[Message]) -> tuple[Optional[str], List[Dict]]:
        """Convert messages to Gemini format"""
        system_prompt = None
        converted = []
        
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system_prompt = msg.content if isinstance(msg.content, str) else str(msg.content)
                continue
            
            parts = []
            content = msg.content
            
            if isinstance(content, str):
                parts.append({"text": content})
            elif isinstance(content, list):
                for item in content:
                    if isinstance(item, TextContent):
                        parts.append({"text": item.text})
                    elif isinstance(item, ImageContent):
                        if item.url:
                            parts.append({
                                "file_data": {
                                    "mime_type": item.media_type,
                                    "file_uri": item.url
                                }
                            })
                        elif item.base64_data:
                            parts.append({
                                "inline_data": {
                                    "mime_type": item.media_type,
                                    "data": item.base64_data
                                }
                            })
            
            role = "user" if msg.role == MessageRole.USER else "model"
            converted.append({"role": role, "parts": parts})
        
        return system_prompt, converted
    
    async def chat(
        self,
        messages: List[Message],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        model: str = "gemini-2.0-flash"
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        
        system_prompt, converted_messages = self._convert_messages(messages)
        
        payload = {
            "contents": converted_messages,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }
        
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}
        
        endpoint = f"{self.base_url}/models/{model}:generateContent"
        if stream:
            endpoint = f"{self.base_url}/models/{model}:streamGenerateContent"
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                endpoint,
                params={"key": self.api_key},
                headers={"content-type": "application/json"},
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Google API error: {response.text}")
                raise Exception(f"Google API error: {response.status_code}")
            
            return self._parse_response(response.json())
    
    def _parse_response(self, response: Dict) -> Dict[str, Any]:
        """Parse Gemini response to common format"""
        content = ""
        
        candidates = response.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                if "text" in part:
                    content += part["text"]
        
        return {
            "content": content,
            "tool_calls": [],
            "stop_reason": candidates[0].get("finishReason") if candidates else None,
            "usage": response.get("usageMetadata", {})
        }


def get_llm_client(model: str) -> tuple[LLMClient, str]:
    """
    Get appropriate LLM client based on model string.
    
    Args:
        model: Model identifier (e.g., "anthropic/claude-3-5-sonnet", "google/gemini-2.0-flash")
    
    Returns:
        Tuple of (client instance, model name)
    """
    if "/" in model:
        provider, model_name = model.split("/", 1)
    else:
        # Default to Anthropic
        provider = "anthropic"
        model_name = model
    
    provider = provider.lower()
    
    if provider == "anthropic":
        return AnthropicClient(), model_name
    elif provider in ("google", "gemini"):
        return GoogleClient(), model_name
    else:
        raise ValueError(f"Unsupported provider: {provider}")

