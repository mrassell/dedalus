"""
MCP Server implementation for Dedalus
"""

import asyncio
import json
import logging
from typing import Any, Callable, Dict, List, Optional
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .types import MCPRequest, MCPResponse, ToolResult, ToolError, ToolSchema

logger = logging.getLogger(__name__)


class MCPServer:
    """
    Model Context Protocol Server
    
    Exposes registered tools via HTTP endpoints compatible with MCP clients.
    
    Usage:
        server = MCPServer("my-server")
        
        @server.tool()
        def my_tool(param: str) -> dict:
            return {"result": param}
        
        server.run(port=8000)
    """
    
    def __init__(self, name: str, version: str = "1.0.0"):
        self.name = name
        self.version = version
        self.tools: Dict[str, Callable] = {}
        self.tool_schemas: Dict[str, ToolSchema] = {}
        self.app = FastAPI(
            title=f"MCP Server: {name}",
            version=version,
            description="Dedalus MCP-compliant tool server"
        )
        self._setup_routes()
        self._setup_cors()
    
    def _setup_cors(self):
        """Configure CORS for cross-origin requests"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Set up MCP-compliant HTTP routes"""
        
        @self.app.get("/")
        async def root():
            return {
                "name": self.name,
                "version": self.version,
                "protocol": "mcp",
                "tools": list(self.tools.keys())
            }
        
        @self.app.get("/mcp")
        async def mcp_info():
            """MCP server information endpoint"""
            return {
                "protocolVersion": "2024-11-05",
                "serverInfo": {
                    "name": self.name,
                    "version": self.version
                },
                "capabilities": {
                    "tools": {}
                }
            }
        
        @self.app.post("/mcp")
        async def mcp_handler(request: Request):
            """Main MCP JSON-RPC handler"""
            try:
                body = await request.json()
                mcp_request = MCPRequest(**body)
                
                if mcp_request.method == "tools/list":
                    return self._handle_tools_list(mcp_request)
                elif mcp_request.method == "tools/call":
                    return await self._handle_tools_call(mcp_request)
                elif mcp_request.method == "initialize":
                    return self._handle_initialize(mcp_request)
                else:
                    return MCPResponse(
                        id=mcp_request.id,
                        error={"code": -32601, "message": f"Method not found: {mcp_request.method}"}
                    ).model_dump()
                    
            except Exception as e:
                logger.exception("MCP handler error")
                return {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": str(e)}}
        
        @self.app.get("/mcp/sse")
        async def mcp_sse(request: Request):
            """Server-Sent Events endpoint for streaming"""
            async def event_generator():
                yield f"data: {json.dumps({'type': 'connected', 'server': self.name})}\n\n"
                while True:
                    if await request.is_disconnected():
                        break
                    await asyncio.sleep(30)
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
            
            return StreamingResponse(
                event_generator(),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
            )
        
        @self.app.post("/tools/{tool_name}")
        async def call_tool_direct(tool_name: str, request: Request):
            """Direct tool invocation endpoint"""
            if tool_name not in self.tools:
                return JSONResponse(
                    status_code=404,
                    content={"error": f"Tool not found: {tool_name}"}
                )
            
            try:
                params = await request.json()
                result = await self._execute_tool(tool_name, params)
                return result.model_dump() if isinstance(result, ToolResult) else result
            except Exception as e:
                logger.exception(f"Tool execution error: {tool_name}")
                return JSONResponse(
                    status_code=500,
                    content={"error": str(e)}
                )
    
    def _handle_initialize(self, request: MCPRequest) -> dict:
        """Handle MCP initialize request"""
        return {
            "jsonrpc": "2.0",
            "id": request.id,
            "result": {
                "protocolVersion": "2024-11-05",
                "serverInfo": {
                    "name": self.name,
                    "version": self.version
                },
                "capabilities": {
                    "tools": {}
                }
            }
        }
    
    def _handle_tools_list(self, request: MCPRequest) -> dict:
        """Handle tools/list request"""
        tools = []
        for name, schema in self.tool_schemas.items():
            tools.append({
                "name": schema.name,
                "description": schema.description,
                "inputSchema": schema.parameters
            })
        
        return {
            "jsonrpc": "2.0",
            "id": request.id,
            "result": {"tools": tools}
        }
    
    async def _handle_tools_call(self, request: MCPRequest) -> dict:
        """Handle tools/call request"""
        params = request.params or {}
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if not tool_name or tool_name not in self.tools:
            return {
                "jsonrpc": "2.0",
                "id": request.id,
                "error": {"code": -32602, "message": f"Unknown tool: {tool_name}"}
            }
        
        try:
            result = await self._execute_tool(tool_name, arguments)
            return {
                "jsonrpc": "2.0",
                "id": request.id,
                "result": result.to_mcp_response() if isinstance(result, ToolResult) else result
            }
        except ToolError as e:
            return {
                "jsonrpc": "2.0",
                "id": request.id,
                "result": {"content": [{"type": "text", "text": e.message}], "isError": True}
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": request.id,
                "error": {"code": -32603, "message": str(e)}
            }
    
    async def _execute_tool(self, tool_name: str, arguments: dict) -> ToolResult:
        """Execute a registered tool"""
        tool_func = self.tools[tool_name]
        
        try:
            result = await tool_func(**arguments)
            
            if isinstance(result, ToolResult):
                return result
            
            return ToolResult(success=True, data=result)
            
        except ToolError:
            raise
        except Exception as e:
            logger.exception(f"Tool execution failed: {tool_name}")
            raise ToolError(str(e))
    
    def tool(self, name: Optional[str] = None, description: Optional[str] = None):
        """
        Decorator to register a tool with this server instance.
        
        Usage:
            @server.tool(name="my_tool", description="Does something")
            def my_tool(param: str) -> dict:
                return {"result": param}
        """
        from .decorators import tool as tool_decorator
        
        def decorator(func: Callable) -> Callable:
            # Apply the tool decorator
            wrapped = tool_decorator(name=name, description=description)(func)
            
            # Register with this server
            tool_name = wrapped._mcp_schema.name
            self.tools[tool_name] = wrapped
            self.tool_schemas[tool_name] = wrapped._mcp_schema
            
            return wrapped
        
        return decorator
    
    def register_tool(self, func: Callable):
        """Register a pre-decorated tool function"""
        if not hasattr(func, "_mcp_tool") or not func._mcp_tool:
            raise ValueError("Function must be decorated with @tool")
        
        tool_name = func._mcp_schema.name
        self.tools[tool_name] = func
        self.tool_schemas[tool_name] = func._mcp_schema
    
    def run(self, host: str = "127.0.0.1", port: int = 8000, **kwargs):
        """Run the MCP server"""
        logger.info(f"Starting MCP server '{self.name}' on {host}:{port}")
        uvicorn.run(self.app, host=host, port=port, **kwargs)
    
    async def run_async(self, host: str = "127.0.0.1", port: int = 8000):
        """Run the MCP server asynchronously"""
        config = uvicorn.Config(self.app, host=host, port=port)
        server = uvicorn.Server(config)
        await server.serve()

