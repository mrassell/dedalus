"""
Dedalus Labs - Multi-Agent Orchestration Framework
===================================================

A hierarchical multi-agent system framework with support for
MCP tool servers, streaming, and multimodal inputs.
"""

from .client import AsyncDedalus, Dedalus
from .runner import DedalusRunner
from .agent import Agent
from .types import (
    AgentConfig,
    RunConfig,
    Message,
    StreamEvent,
    StreamEventType,
    AgentResponse,
    ToolCall
)

__version__ = "0.1.0"
__all__ = [
    "AsyncDedalus",
    "Dedalus", 
    "DedalusRunner",
    "Agent",
    "AgentConfig",
    "RunConfig",
    "Message",
    "StreamEvent",
    "StreamEventType",
    "AgentResponse",
    "ToolCall"
]

