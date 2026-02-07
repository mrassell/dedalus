"""
Type definitions for Dedalus Labs
"""

from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class ContentType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    IMAGE_URL = "image_url"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"


class ImageContent(BaseModel):
    """Image content for multimodal messages"""
    type: Literal["image", "image_url"] = "image_url"
    url: Optional[str] = None
    base64_data: Optional[str] = None
    media_type: str = "image/jpeg"


class TextContent(BaseModel):
    """Text content for messages"""
    type: Literal["text"] = "text"
    text: str


class ToolCall(BaseModel):
    """Tool call made by an agent"""
    id: str
    name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


class ToolResult(BaseModel):
    """Result from a tool execution"""
    tool_call_id: str
    content: Any
    is_error: bool = False


class Message(BaseModel):
    """Message in a conversation"""
    role: MessageRole
    content: Union[str, List[Union[TextContent, ImageContent]]]
    tool_calls: Optional[List[ToolCall]] = None
    tool_call_id: Optional[str] = None
    name: Optional[str] = None
    
    @classmethod
    def user(cls, content: str) -> "Message":
        return cls(role=MessageRole.USER, content=content)
    
    @classmethod
    def assistant(cls, content: str) -> "Message":
        return cls(role=MessageRole.ASSISTANT, content=content)
    
    @classmethod
    def system(cls, content: str) -> "Message":
        return cls(role=MessageRole.SYSTEM, content=content)
    
    @classmethod
    def with_image(cls, text: str, image_url: str) -> "Message":
        return cls(
            role=MessageRole.USER,
            content=[
                TextContent(text=text),
                ImageContent(url=image_url)
            ]
        )


class AgentConfig(BaseModel):
    """Configuration for an agent"""
    name: str
    model: str
    system_prompt: str
    temperature: float = 0.7
    max_tokens: int = 4096
    tools: List[str] = Field(default_factory=list)
    mcp_servers: List[str] = Field(default_factory=list)
    handoff_agents: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RunConfig(BaseModel):
    """Configuration for a run"""
    stream: bool = False
    max_turns: int = 10
    timeout: float = 300.0
    mcp_servers: List[str] = Field(default_factory=list)
    include_reasoning: bool = True
    structured_output: Optional[Any] = None


class StreamEventType(str, Enum):
    START = "start"
    THINKING = "thinking"
    TEXT_DELTA = "text_delta"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    HANDOFF = "handoff"
    COMPLETE = "complete"
    ERROR = "error"


class StreamEvent(BaseModel):
    """Event emitted during streaming"""
    type: StreamEventType
    agent: str
    data: Any = None
    timestamp: datetime = Field(default_factory=datetime.now)
    
    def to_sse(self) -> str:
        """Convert to Server-Sent Event format"""
        return f"data: {self.model_dump_json()}\n\n"


class AgentResponse(BaseModel):
    """Response from an agent run"""
    agent: str
    content: str
    tool_calls: List[ToolCall] = Field(default_factory=list)
    tool_results: List[ToolResult] = Field(default_factory=list)
    handoff_to: Optional[str] = None
    reasoning: Optional[str] = None
    messages: List[Message] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @property
    def final_output(self) -> str:
        """Get the final text output"""
        return self.content

