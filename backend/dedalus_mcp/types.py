"""
Type definitions for Dedalus MCP
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from enum import Enum


class ToolParameterType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"


class ToolParameter(BaseModel):
    """Schema for a tool parameter"""
    name: str
    type: ToolParameterType
    description: str
    required: bool = True
    default: Optional[Any] = None
    enum: Optional[List[Any]] = None


class ToolSchema(BaseModel):
    """MCP Tool Schema definition"""
    name: str
    description: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ToolResult(BaseModel):
    """Result returned from a tool execution"""
    success: bool = True
    data: Any = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def to_mcp_response(self) -> Dict[str, Any]:
        """Convert to MCP-compliant response format"""
        if self.success:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": str(self.data) if not isinstance(self.data, str) else self.data
                    }
                ],
                "isError": False
            }
        return {
            "content": [
                {
                    "type": "text", 
                    "text": self.error or "Unknown error"
                }
            ],
            "isError": True
        }


class ToolError(Exception):
    """Exception raised when a tool execution fails"""
    def __init__(self, message: str, code: str = "TOOL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class MCPRequest(BaseModel):
    """Incoming MCP request"""
    jsonrpc: str = "2.0"
    id: Union[str, int]
    method: str
    params: Optional[Dict[str, Any]] = None


class MCPResponse(BaseModel):
    """Outgoing MCP response"""
    jsonrpc: str = "2.0"
    id: Union[str, int]
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None

