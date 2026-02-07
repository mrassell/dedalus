"""
Gesture Controller - WebSocket Server for Holographic UI Control
================================================================

Streams gesture events to the Aegis-1 Mission Control HUD.
Supports hand tracking for camera control and marker placement.

Events:
- MOVE: {lat_delta, lon_delta, zoom_delta} - Camera movement
- SELECT: {lat, lon} - Drop marker at location (pinch gesture)
- ZOOM: {delta} - Zoom in/out
- ROTATE: {angle} - Rotate view
- VOICE_START: Voice input started
- VOICE_END: Voice input ended with transcription

Run: python gesture_controller.py
"""

import asyncio
import json
import logging
import math
import os
import random
from datetime import datetime
from typing import Dict, Set, Optional
from dataclasses import dataclass, asdict
from enum import Enum

try:
    import websockets
    from websockets.server import serve
except ImportError:
    print("Install websockets: pip install websockets")
    exit(1)

# Configuration from environment
GESTURE_HOST = os.getenv("GESTURE_WS_HOST", "0.0.0.0")
GESTURE_PORT = int(os.getenv("GESTURE_WS_PORT", "8765"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gesture")


class GestureType(str, Enum):
    MOVE = "MOVE"
    SELECT = "SELECT"
    ZOOM = "ZOOM"
    ROTATE = "ROTATE"
    VOICE_START = "VOICE_START"
    VOICE_END = "VOICE_END"
    AGENT_SPEAK_START = "AGENT_SPEAK_START"
    AGENT_SPEAK_END = "AGENT_SPEAK_END"
    TOOL_EXECUTE = "TOOL_EXECUTE"
    ALERT = "ALERT"


@dataclass
class GestureEvent:
    type: GestureType
    timestamp: str
    data: Dict
    
    def to_json(self) -> str:
        return json.dumps({
            "type": self.type.value,
            "timestamp": self.timestamp,
            "data": self.data
        })


class GestureServer:
    """
    WebSocket server for streaming gesture and agent events to the HUD.
    """
    
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set = set()
        self._running = False
        
        # Camera state (lat, lon, altitude)
        self.camera_lat = 0.0
        self.camera_lon = 0.0
        self.camera_altitude = 15000000  # meters
        
        # Markers
        self.markers = []
        
        # Voice state
        self.is_listening = False
        self.is_speaking = False
    
    async def register(self, websocket):
        """Register a new client"""
        self.clients.add(websocket)
        logger.info(f"Client connected. Total: {len(self.clients)}")
        
        # Send initial state
        await websocket.send(json.dumps({
            "type": "INIT",
            "timestamp": datetime.now().isoformat(),
            "data": {
                "camera": {
                    "lat": self.camera_lat,
                    "lon": self.camera_lon,
                    "altitude": self.camera_altitude
                },
                "markers": self.markers
            }
        }))
    
    async def unregister(self, websocket):
        """Unregister a client"""
        self.clients.discard(websocket)
        logger.info(f"Client disconnected. Total: {len(self.clients)}")
    
    async def broadcast(self, event: GestureEvent):
        """Broadcast event to all clients"""
        if self.clients:
            message = event.to_json()
            await asyncio.gather(
                *[client.send(message) for client in self.clients],
                return_exceptions=True
            )
    
    async def handler(self, websocket):
        """Handle WebSocket connection"""
        await self.register(websocket)
        try:
            async for message in websocket:
                # Handle incoming commands from UI
                data = json.loads(message)
                await self.handle_command(data)
        finally:
            await self.unregister(websocket)
    
    async def handle_command(self, data: Dict):
        """Handle commands from the UI"""
        cmd = data.get("command")
        
        if cmd == "START_LISTENING":
            self.is_listening = True
            await self.broadcast(GestureEvent(
                type=GestureType.VOICE_START,
                timestamp=datetime.now().isoformat(),
                data={}
            ))
        
        elif cmd == "STOP_LISTENING":
            self.is_listening = False
            await self.broadcast(GestureEvent(
                type=GestureType.VOICE_END,
                timestamp=datetime.now().isoformat(),
                data={"transcription": data.get("transcription", "")}
            ))
        
        elif cmd == "DROP_MARKER":
            lat = data.get("lat", 0)
            lon = data.get("lon", 0)
            self.markers.append({"lat": lat, "lon": lon, "timestamp": datetime.now().isoformat()})
            await self.broadcast(GestureEvent(
                type=GestureType.SELECT,
                timestamp=datetime.now().isoformat(),
                data={"lat": lat, "lon": lon}
            ))
    
    async def simulate_events(self):
        """Simulate gesture and agent events for demo"""
        logger.info("Starting event simulation...")
        
        # Disaster zones to cycle through
        zones = [
            {"name": "Jakarta Flood", "lat": -6.2088, "lon": 106.8456},
            {"name": "California Wildfire", "lat": 34.0522, "lon": -118.2437},
            {"name": "Tokyo Earthquake", "lat": 35.6762, "lon": 139.6503},
            {"name": "Miami Hurricane", "lat": 25.7617, "lon": -80.1918},
        ]
        
        zone_idx = 0
        tick = 0
        
        while self._running:
            tick += 1
            
            # Every 5 seconds, simulate camera movement to a zone
            if tick % 50 == 0:
                zone = zones[zone_idx % len(zones)]
                zone_idx += 1
                
                # Smooth camera move
                for i in range(20):
                    progress = (i + 1) / 20
                    self.camera_lat += (zone["lat"] - self.camera_lat) * 0.1
                    self.camera_lon += (zone["lon"] - self.camera_lon) * 0.1
                    
                    await self.broadcast(GestureEvent(
                        type=GestureType.MOVE,
                        timestamp=datetime.now().isoformat(),
                        data={
                            "lat": self.camera_lat,
                            "lon": self.camera_lon,
                            "altitude": self.camera_altitude,
                            "target_name": zone["name"]
                        }
                    ))
                    await asyncio.sleep(0.05)
            
            # Every 8 seconds, simulate a SELECT (marker drop)
            if tick % 80 == 30:
                lat = self.camera_lat + (random.random() - 0.5) * 2
                lon = self.camera_lon + (random.random() - 0.5) * 2
                
                await self.broadcast(GestureEvent(
                    type=GestureType.SELECT,
                    timestamp=datetime.now().isoformat(),
                    data={
                        "lat": lat,
                        "lon": lon,
                        "marker_type": random.choice(["relief", "rescue", "medical", "shelter"])
                    }
                ))
            
            # Every 10 seconds, simulate agent speaking
            if tick % 100 == 0:
                await self.broadcast(GestureEvent(
                    type=GestureType.AGENT_SPEAK_START,
                    timestamp=datetime.now().isoformat(),
                    data={"agent": "Aegis-1", "message": "Analyzing satellite imagery..."}
                ))
                
                await asyncio.sleep(3)
                
                await self.broadcast(GestureEvent(
                    type=GestureType.AGENT_SPEAK_END,
                    timestamp=datetime.now().isoformat(),
                    data={"agent": "Aegis-1"}
                ))
            
            # Every 6 seconds, simulate tool execution
            if tick % 60 == 20:
                tools = [
                    {"tool": "NASA_FIRMS", "status": "Fetching fire data..."},
                    {"tool": "OpenMeteo", "status": "Getting weather forecast..."},
                    {"tool": "GoogleMaps", "status": "Calculating relief routes..."},
                    {"tool": "Featherless", "status": "Analyzing imagery..."},
                ]
                tool = random.choice(tools)
                
                await self.broadcast(GestureEvent(
                    type=GestureType.TOOL_EXECUTE,
                    timestamp=datetime.now().isoformat(),
                    data=tool
                ))
            
            # Random alerts
            if tick % 120 == 60:
                alerts = [
                    {"level": "critical", "message": "New flood zone detected in sector 7"},
                    {"level": "warning", "message": "Relief convoy delayed - rerouting"},
                    {"level": "info", "message": "Satellite pass in 12 minutes"},
                ]
                alert = random.choice(alerts)
                
                await self.broadcast(GestureEvent(
                    type=GestureType.ALERT,
                    timestamp=datetime.now().isoformat(),
                    data=alert
                ))
            
            await asyncio.sleep(0.1)
    
    async def run(self):
        """Run the WebSocket server"""
        self._running = True
        
        async with serve(self.handler, self.host, self.port):
            logger.info(f"🎮 Gesture Controller running on ws://{self.host}:{self.port}")
            logger.info("   Streaming gesture & agent events to Aegis-1 HUD")
            
            # Run simulation in background
            simulation_task = asyncio.create_task(self.simulate_events())
            
            try:
                await asyncio.Future()  # Run forever
            finally:
                self._running = False
                simulation_task.cancel()


if __name__ == "__main__":
    server = GestureServer(host=GESTURE_HOST, port=GESTURE_PORT)
    
    print("=" * 60)
    print("🎮 AEGIS-1 GESTURE CONTROLLER")
    print("=" * 60)
    print(f"WebSocket: ws://{GESTURE_HOST}:{GESTURE_PORT}")
    print("")
    print("Events Streamed:")
    print("  • MOVE      - Camera pan/zoom")
    print("  • SELECT    - Marker placement (pinch)")
    print("  • ZOOM      - Altitude change")
    print("  • VOICE_*   - Voice input state")
    print("  • AGENT_*   - Agent speaking state")
    print("  • TOOL_*    - MCP tool execution")
    print("  • ALERT     - System alerts")
    print("=" * 60)
    
    asyncio.run(server.run())

