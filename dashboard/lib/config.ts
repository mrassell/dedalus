/**
 * Aegis-1 Dashboard Configuration
 * All values are read from environment variables - no hardcoding
 */

export const config = {
  // WebSocket URLs
  gestureWsUrl: process.env.NEXT_PUBLIC_GESTURE_WS_URL || "ws://localhost:8765",
  
  // API URLs
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  
  // MCP Servers (comma-separated in env)
  mcpServers: (process.env.NEXT_PUBLIC_MCP_SERVERS || "http://localhost:8000/mcp")
    .split(",")
    .map((s) => s.trim()),
  
  // Feature flags
  enableVoice: process.env.NEXT_PUBLIC_ENABLE_VOICE !== "false",
  enableCesium: process.env.NEXT_PUBLIC_ENABLE_CESIUM !== "false",
  
  // Cesium
  cesiumToken: process.env.NEXT_PUBLIC_CESIUM_TOKEN || "",
  
  // WebSocket reconnect settings
  wsReconnectDelay: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_DELAY || "3000", 10),
  wsMaxRetries: parseInt(process.env.NEXT_PUBLIC_WS_MAX_RETRIES || "5", 10),
} as const;

export type Config = typeof config;

