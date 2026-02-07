"""
Dedalus MCP - Model Context Protocol Server Framework
======================================================

A lightweight framework for building MCP-compliant tool servers
with decorator-based tool registration and HTTP/SSE transport.
"""

from .server import MCPServer
from .decorators import tool
from .types import ToolResult, ToolError

__version__ = "0.1.0"
__all__ = ["MCPServer", "tool", "ToolResult", "ToolError"]

