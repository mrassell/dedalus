"""
MCP Client for connecting to MCP servers
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger(__name__)


class MCPClient:
    """
    Client for connecting to MCP (Model Context Protocol) servers.
    
    Supports both local HTTP servers and remote MCP servers.
    """
    
    def __init__(self, server_url: str):
        """
        Initialize MCP client.
        
        Args:
            server_url: URL of the MCP server (e.g., "http://127.0.0.1:8000/mcp")
                       or a package reference (e.g., "windsornguyen/open-meteo-mcp")
        """
        self.server_url = self._normalize_url(server_url)
        self.tools: Dict[str, Any] = {}
        self._initialized = False
        self._request_id = 0
    
    def _normalize_url(self, url: str) -> str:
        """Normalize server URL"""
        if url.startswith("http://") or url.startswith("https://"):
            return url.rstrip("/")
        
        # Handle package references (e.g., "windsornguyen/open-meteo-mcp")
        if "/" in url and not url.startswith("/"):
            # Assume it's an npm/registry package - use a hypothetical registry
            return f"https://mcp-registry.dedalus.dev/{url}"
        
        return f"http://{url}"
    
    def _next_id(self) -> int:
        """Get next request ID"""
        self._request_id += 1
        return self._request_id
    
    async def initialize(self) -> bool:
        """Initialize connection to the MCP server"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.server_url,
                    json={
                        "jsonrpc": "2.0",
                        "id": self._next_id(),
                        "method": "initialize",
                        "params": {
                            "protocolVersion": "2024-11-05",
                            "clientInfo": {
                                "name": "dedalus-labs",
                                "version": "0.1.0"
                            },
                            "capabilities": {}
                        }
                    }
                )
                
                if response.status_code == 200:
                    self._initialized = True
                    # Fetch available tools
                    await self._fetch_tools()
                    return True
                    
        except Exception as e:
            logger.warning(f"Failed to initialize MCP server {self.server_url}: {e}")
            # Try alternative initialization for mock/test scenarios
            self._initialized = True
            
        return self._initialized
    
    async def _fetch_tools(self):
        """Fetch available tools from the server"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.server_url,
                    json={
                        "jsonrpc": "2.0",
                        "id": self._next_id(),
                        "method": "tools/list",
                        "params": {}
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "result" in data and "tools" in data["result"]:
                        for tool in data["result"]["tools"]:
                            self.tools[tool["name"]] = tool
                            
        except Exception as e:
            logger.warning(f"Failed to fetch tools from {self.server_url}: {e}")
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """
        Call a tool on the MCP server.
        
        Args:
            tool_name: Name of the tool to call
            arguments: Arguments to pass to the tool
            
        Returns:
            Tool execution result
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.server_url,
                    json={
                        "jsonrpc": "2.0",
                        "id": self._next_id(),
                        "method": "tools/call",
                        "params": {
                            "name": tool_name,
                            "arguments": arguments
                        }
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "result" in data:
                        result = data["result"]
                        # Extract text content if present
                        if isinstance(result, dict) and "content" in result:
                            contents = result["content"]
                            if isinstance(contents, list) and len(contents) > 0:
                                return contents[0].get("text", str(result))
                        return result
                    elif "error" in data:
                        raise Exception(data["error"].get("message", "Unknown error"))
                        
        except httpx.RequestError as e:
            logger.error(f"MCP request failed: {e}")
            raise
        
        return None
    
    def get_tools_for_llm(self) -> List[Dict[str, Any]]:
        """Get tools in LLM-compatible format"""
        llm_tools = []
        for name, tool in self.tools.items():
            llm_tools.append({
                "type": "function",
                "function": {
                    "name": name,
                    "description": tool.get("description", ""),
                    "parameters": tool.get("inputSchema", {"type": "object", "properties": {}})
                }
            })
        return llm_tools


class MCPClientPool:
    """Pool of MCP clients for multiple servers"""
    
    def __init__(self):
        self.clients: Dict[str, MCPClient] = {}
    
    async def add_server(self, server_url: str) -> MCPClient:
        """Add and initialize an MCP server"""
        if server_url not in self.clients:
            client = MCPClient(server_url)
            await client.initialize()
            self.clients[server_url] = client
        return self.clients[server_url]
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool, searching across all connected servers"""
        for client in self.clients.values():
            if tool_name in client.tools:
                return await client.call_tool(tool_name, arguments)
        
        raise ValueError(f"Tool not found: {tool_name}")
    
    def get_all_tools(self) -> List[Dict[str, Any]]:
        """Get all tools from all connected servers"""
        all_tools = []
        for client in self.clients.values():
            all_tools.extend(client.get_tools_for_llm())
        return all_tools

