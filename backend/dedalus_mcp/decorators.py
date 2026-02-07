"""
Decorators for Dedalus MCP tool registration
"""

import inspect
import functools
from typing import Any, Callable, Dict, List, Optional, get_type_hints
from .types import ToolSchema, ToolParameterType


def _python_type_to_mcp(py_type: Any) -> str:
    """Convert Python type hints to MCP parameter types"""
    type_mapping = {
        str: "string",
        int: "integer", 
        float: "number",
        bool: "boolean",
        list: "array",
        dict: "object",
        List: "array",
        Dict: "object",
    }
    
    # Handle generic types
    origin = getattr(py_type, "__origin__", None)
    if origin is not None:
        if origin in (list, List):
            return "array"
        if origin in (dict, Dict):
            return "object"
    
    return type_mapping.get(py_type, "string")


def tool(
    name: Optional[str] = None,
    description: Optional[str] = None
) -> Callable:
    """
    Decorator to register a function as an MCP tool.
    
    Usage:
        @tool(name="my_tool", description="Does something useful")
        def my_tool(param1: str, param2: int) -> dict:
            '''Tool docstring used if no description provided'''
            return {"result": "success"}
    
    Args:
        name: Override the tool name (defaults to function name)
        description: Override the description (defaults to docstring)
    
    Returns:
        Decorated function with MCP tool metadata
    """
    def decorator(func: Callable) -> Callable:
        # Get function metadata
        tool_name = name or func.__name__
        tool_description = description or (func.__doc__ or "No description provided").strip()
        
        # Parse function signature for parameters
        sig = inspect.signature(func)
        type_hints = get_type_hints(func) if hasattr(func, "__annotations__") else {}
        
        properties = {}
        required = []
        
        for param_name, param in sig.parameters.items():
            if param_name in ("self", "cls"):
                continue
                
            param_type = type_hints.get(param_name, str)
            mcp_type = _python_type_to_mcp(param_type)
            
            properties[param_name] = {
                "type": mcp_type,
                "description": f"Parameter: {param_name}"
            }
            
            if param.default is inspect.Parameter.empty:
                required.append(param_name)
            else:
                properties[param_name]["default"] = param.default
        
        # Create tool schema
        schema = ToolSchema(
            name=tool_name,
            description=tool_description,
            parameters={
                "type": "object",
                "properties": properties,
                "required": required
            }
        )
        
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Handle both sync and async functions
            if inspect.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            return func(*args, **kwargs)
        
        # Attach metadata to the wrapper
        wrapper._mcp_tool = True
        wrapper._mcp_schema = schema
        wrapper._original_func = func
        
        return wrapper
    
    return decorator

