"""
Aegis-1 Backend Configuration
All values read from environment variables - no hardcoding
"""

import os
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ServerConfig:
    """MCP Server configuration"""
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # MCP specific
    mcp_server_name: str = os.getenv("MCP_SERVER_NAME", "relief-ops")
    

@dataclass
class GestureConfig:
    """WebSocket Gesture Controller configuration"""
    host: str = os.getenv("GESTURE_WS_HOST", "0.0.0.0")
    port: int = int(os.getenv("GESTURE_WS_PORT", "8765"))


@dataclass
class ExternalServicesConfig:
    """External MCP servers and APIs"""
    external_mcp_servers: List[str] = None
    
    # LLM API Keys
    anthropic_api_key: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    google_api_key: Optional[str] = os.getenv("GOOGLE_API_KEY")
    
    # Optional services
    elevenlabs_api_key: Optional[str] = os.getenv("ELEVENLABS_API_KEY")
    featherless_api_key: Optional[str] = os.getenv("FEATHERLESS_API_KEY")
    
    def __post_init__(self):
        mcp_servers_env = os.getenv("EXTERNAL_MCP_SERVERS", "")
        self.external_mcp_servers = [
            s.strip() for s in mcp_servers_env.split(",") if s.strip()
        ]


@dataclass 
class Config:
    """Main configuration container"""
    server: ServerConfig = None
    gesture: GestureConfig = None
    external: ExternalServicesConfig = None
    
    def __post_init__(self):
        self.server = ServerConfig()
        self.gesture = GestureConfig()
        self.external = ExternalServicesConfig()


# Global config instance
config = Config()


def get_config() -> Config:
    """Get the global configuration"""
    return config

