"""
Aegis-1 Multi-Agent Orchestrator
=================================

Hierarchical swarm system for Climate Research and Disaster Relief.
Implements three specialized agents:

1. The Watchman (Triage Agent) - Routes requests to appropriate specialists
2. Vision Specialist - Analyzes images of disaster zones
3. Climate & Logistics Analyst - Fetches weather data and calculates relief needs

Usage:
    python aegis_orchestrator.py "Satellite alert: Flood detected in Jakarta"
    python aegis_orchestrator.py --image "path/to/image.jpg" "Analyze this disaster zone"
"""

import asyncio
import argparse
import json
import logging
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional
from pathlib import Path

from pydantic import BaseModel, Field

# Import Dedalus Labs
from dedalus_labs import (
    AsyncDedalus,
    DedalusRunner,
    AgentConfig,
    Message,
    StreamEvent,
    StreamEventType
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("aegis")


# =============================================================================
# Pydantic Models for Structured Outputs
# =============================================================================

class DisasterAlert(BaseModel):
    """Structured disaster alert information"""
    disaster_type: str = Field(..., description="Type of disaster detected")
    location: str = Field(..., description="Geographic location")
    severity: str = Field(..., description="Severity level: low, moderate, high, critical, catastrophic")
    population_affected: int = Field(default=0, description="Estimated affected population")
    coordinates: Optional[List[float]] = Field(default=None, description="[latitude, longitude]")
    source: str = Field(default="satellite", description="Alert source")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    
    
class ImageAnalysisResult(BaseModel):
    """Result from vision analysis of disaster imagery"""
    damage_level: str = Field(..., description="Overall damage assessment")
    infrastructure_damage: int = Field(..., ge=0, le=100, description="Infrastructure damage percentage")
    water_level_risk: Optional[str] = Field(default=None, description="Water level assessment for floods")
    fire_spread_risk: Optional[str] = Field(default=None, description="Fire spread risk for wildfires")
    visible_hazards: List[str] = Field(default_factory=list, description="Identified hazards")
    rescue_priority_zones: List[str] = Field(default_factory=list, description="Areas requiring immediate rescue")
    accessibility_assessment: str = Field(default="unknown", description="Road/access assessment")
    confidence_score: float = Field(..., ge=0, le=1, description="Analysis confidence")


class ZoneAssessment(BaseModel):
    """Assessment of an affected zone"""
    name: str
    coordinates: List[float]
    population: int
    infrastructure_damage: int
    accessibility: int
    vulnerable_population: int
    has_medical_facility: bool
    water_access: bool


class CrisisActionReport(BaseModel):
    """Complete crisis action report"""
    report_id: str
    generated_at: str
    disaster_summary: Dict[str, Any]
    weather_conditions: Optional[Dict[str, Any]] = None
    supply_requirements: Dict[str, Any]
    zone_priorities: List[Dict[str, Any]]
    logistics_plan: Dict[str, Any]
    immediate_actions: List[str]
    markdown_report: str


# =============================================================================
# Agent Configurations
# =============================================================================

WATCHMAN_CONFIG = AgentConfig(
    name="watchman",
    model="anthropic/claude-3-5-sonnet",
    system_prompt="""You are THE WATCHMAN, the triage agent for the Aegis-1 Disaster Response System.

Your role is to analyze incoming alerts and route them to the appropriate specialist:

## Routing Logic:

1. **If the input contains an IMAGE URL or mentions analyzing imagery/photos/satellite images:**
   → Hand off to "vision_specialist" with context about what to analyze

2. **If the input is a TEXT-BASED alert or request for data/analysis:**
   → Hand off to "climate_analyst" with extracted disaster parameters

## Your Tasks:
- Parse the incoming alert to extract: disaster type, location, severity indicators
- Determine if visual analysis is needed
- Provide clear context when handing off to specialists

## Response Format:
Before handing off, briefly state:
1. What type of alert this is
2. Which specialist you're routing to and why
3. Key parameters extracted from the alert

Always maintain urgency - lives depend on rapid response.""",
    temperature=0.3,
    max_tokens=1024,
    metadata={"description": "Triage agent that routes requests to specialists"}
)


VISION_SPECIALIST_CONFIG = AgentConfig(
    name="vision_specialist", 
    model="google/gemini-2.0-flash",
    system_prompt="""You are the VISION SPECIALIST for the Aegis-1 Disaster Response System.

Your role is to analyze satellite imagery, drone footage, and ground photos of disaster zones.

## Analysis Capabilities:
- Detect infrastructure damage levels (buildings, roads, bridges)
- Identify rising water levels and flood extent
- Assess fire spread patterns and risks
- Locate stranded individuals or vehicles
- Evaluate road accessibility for relief convoys
- Identify safe zones for evacuation

## Your Output Should Include:
1. **Damage Assessment**: Overall damage level (minimal/moderate/severe/catastrophic)
2. **Infrastructure Status**: Percentage of visible infrastructure damaged
3. **Hazard Identification**: List all visible hazards
4. **Priority Zones**: Areas requiring immediate attention
5. **Accessibility**: Can relief vehicles reach the area?
6. **Confidence Score**: How confident are you in this analysis (0-1)

After analysis, hand off to "climate_analyst" for resource calculation if disaster parameters are clear.

Be specific and actionable - your analysis guides rescue operations.""",
    temperature=0.2,
    max_tokens=2048,
    metadata={"description": "Multimodal agent for analyzing disaster imagery"}
)


CLIMATE_ANALYST_CONFIG = AgentConfig(
    name="climate_analyst",
    model="anthropic/claude-3-5-sonnet",
    system_prompt="""You are the CLIMATE & LOGISTICS ANALYST for the Aegis-1 Disaster Response System.

Your role is to gather weather data, calculate relief needs, and generate Crisis Action Reports.

## Available Tools (via MCP):
1. **calculate_supply_needs**: Calculate food, water, medical supplies based on disaster parameters
2. **prioritize_zones**: Analyze and rank affected zones by urgency
3. **logistics_router**: Calculate travel times and routes for relief convoys
4. **generate_crisis_report**: Create comprehensive markdown reports

## Weather Data (via open-meteo-mcp):
- Current conditions
- Forecasts
- Precipitation data
- Temperature and wind

## Your Workflow:
1. Fetch current weather for the disaster location
2. Calculate supply needs based on disaster type, population, and severity
3. If zones are provided, prioritize them
4. Generate a comprehensive Crisis Action Report

## Output:
Always end with a complete markdown Crisis Action Report that includes:
- Situation overview
- Weather conditions
- Resource requirements
- Logistics estimates
- Immediate action items

Your analysis saves lives. Be thorough and precise.""",
    temperature=0.4,
    max_tokens=4096,
    mcp_servers=[
        "http://127.0.0.1:8000/mcp",  # Local relief-ops server
        "windsornguyen/open-meteo-mcp"  # Weather data
    ],
    metadata={"description": "Analyst for weather data and logistics calculations"}
)


# =============================================================================
# Aegis Orchestrator
# =============================================================================

class AegisOrchestrator:
    """
    Main orchestrator for the Aegis-1 multi-agent system.
    """
    
    def __init__(self):
        self.runner: Optional[DedalusRunner] = None
        self._initialized = False
    
    async def initialize(self, mcp_servers: Optional[List[str]] = None):
        """Initialize the orchestrator with agents and MCP connections"""
        async with AsyncDedalus() as dedalus:
            self.runner = dedalus.create_runner()
            
            # Add all agents
            self.runner.add_agent(WATCHMAN_CONFIG)
            self.runner.add_agent(VISION_SPECIALIST_CONFIG)
            self.runner.add_agent(CLIMATE_ANALYST_CONFIG)
            
            # Initialize MCP servers
            servers = mcp_servers or [
                "http://127.0.0.1:8000/mcp",
                "windsornguyen/open-meteo-mcp"
            ]
            await self.runner.initialize(servers)
            
            self._initialized = True
            logger.info("Aegis-1 orchestrator initialized with 3 agents")
    
    async def process_alert(
        self,
        alert_text: str,
        image_url: Optional[str] = None,
        stream: bool = True
    ) -> CrisisActionReport:
        """
        Process a disaster alert through the agent swarm.
        
        Args:
            alert_text: Text description of the alert
            image_url: Optional URL to disaster imagery
            stream: Whether to stream agent reasoning
            
        Returns:
            CrisisActionReport with full analysis
        """
        if not self._initialized:
            await self.initialize()
        
        # Prepare input
        if image_url:
            # Include image for multimodal processing
            input_text = f"{alert_text}\n\n[IMAGE ATTACHED: {image_url}]"
        else:
            input_text = alert_text
        
        logger.info(f"Processing alert: {alert_text[:100]}...")
        
        if stream:
            return await self._process_with_stream(input_text)
        else:
            response = await self.runner.run(
                input_text=input_text,
                starting_agent="watchman",
                mcp_servers=["http://127.0.0.1:8000/mcp"],
                stream=False,
                max_turns=10
            )
            
            return self._build_report(response)
    
    async def _process_with_stream(self, input_text: str) -> CrisisActionReport:
        """Process with streaming output"""
        final_response = None
        
        print("\n" + "=" * 60)
        print("🚨 AEGIS-1 CRISIS RESPONSE SYSTEM")
        print("=" * 60 + "\n")
        
        async for event in self.runner.stream_async(
            input_text=input_text,
            starting_agent="watchman",
            mcp_servers=["http://127.0.0.1:8000/mcp"],
            max_turns=10
        ):
            self._print_event(event)
            
            if event.type == StreamEventType.COMPLETE:
                final_response = event.data
        
        print("\n" + "=" * 60)
        print("✅ PROCESSING COMPLETE")
        print("=" * 60 + "\n")
        
        return self._build_report(final_response) if final_response else None
    
    def _print_event(self, event: StreamEvent):
        """Print a stream event with formatting"""
        agent_colors = {
            "watchman": "\033[94m",      # Blue
            "vision_specialist": "\033[95m",  # Magenta
            "climate_analyst": "\033[92m"     # Green
        }
        reset = "\033[0m"
        color = agent_colors.get(event.agent, "\033[0m")
        
        if event.type == StreamEventType.START:
            print(f"{color}▶ [{event.agent.upper()}] Starting...{reset}")
        
        elif event.type == StreamEventType.THINKING:
            print(f"{color}  💭 Reasoning: {event.data}{reset}")
        
        elif event.type == StreamEventType.TEXT_DELTA:
            # Print content in chunks
            content = event.data if isinstance(event.data, str) else str(event.data)
            print(f"{color}  {content}{reset}")
        
        elif event.type == StreamEventType.TOOL_CALL:
            tool_name = event.data.get("name", "unknown")
            print(f"{color}  🔧 Calling tool: {tool_name}{reset}")
        
        elif event.type == StreamEventType.TOOL_RESULT:
            print(f"{color}  ✓ Tool completed{reset}")
        
        elif event.type == StreamEventType.HANDOFF:
            target = event.data.get("target", "unknown")
            print(f"\n{color}  ➤ HANDOFF to {target.upper()}{reset}\n")
        
        elif event.type == StreamEventType.ERROR:
            print(f"\033[91m  ❌ Error: {event.data}\033[0m")
    
    def _build_report(self, response_data: Dict) -> CrisisActionReport:
        """Build a CrisisActionReport from response data"""
        content = response_data.get("content", "") if response_data else ""
        
        return CrisisActionReport(
            report_id=f"AEGIS-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            generated_at=datetime.now().isoformat(),
            disaster_summary={
                "raw_response": content[:500] if content else "No response generated"
            },
            weather_conditions=None,
            supply_requirements={},
            zone_priorities=[],
            logistics_plan={},
            immediate_actions=[
                "Review generated report",
                "Coordinate with local authorities",
                "Deploy initial response teams"
            ],
            markdown_report=content
        )


# =============================================================================
# CLI Interface
# =============================================================================

async def main():
    """Main entry point for CLI usage"""
    parser = argparse.ArgumentParser(
        description="Aegis-1 Multi-Agent Disaster Response System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python aegis_orchestrator.py "Flood detected in Jakarta, population 500000 affected"
  python aegis_orchestrator.py --image "https://example.com/satellite.jpg" "Analyze damage"
  python aegis_orchestrator.py --no-stream "Earthquake magnitude 7.2 in Tokyo"
        """
    )
    
    parser.add_argument(
        "alert",
        type=str,
        help="Disaster alert text to process"
    )
    
    parser.add_argument(
        "--image", "-i",
        type=str,
        default=None,
        help="URL or path to disaster imagery"
    )
    
    parser.add_argument(
        "--no-stream",
        action="store_true",
        help="Disable streaming output"
    )
    
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Save report to file"
    )
    
    args = parser.parse_args()
    
    # Initialize and run
    orchestrator = AegisOrchestrator()
    
    try:
        report = await orchestrator.process_alert(
            alert_text=args.alert,
            image_url=args.image,
            stream=not args.no_stream
        )
        
        if report:
            # Print the markdown report
            print("\n" + "=" * 60)
            print("📋 CRISIS ACTION REPORT")
            print("=" * 60 + "\n")
            print(report.markdown_report)
            
            # Save to file if requested
            if args.output:
                output_path = Path(args.output)
                output_path.write_text(report.markdown_report)
                print(f"\n✅ Report saved to: {output_path}")
                
    except KeyboardInterrupt:
        print("\n\n⚠️ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.exception("Error processing alert")
        print(f"\n❌ Error: {e}")
        sys.exit(1)


# Demo function for testing without API keys
async def demo_mode():
    """Run a demonstration without actual API calls"""
    print("\n" + "=" * 60)
    print("🚨 AEGIS-1 CRISIS RESPONSE SYSTEM - DEMO MODE")
    print("=" * 60 + "\n")
    
    # Simulate the agent flow
    print("\033[94m▶ [WATCHMAN] Starting triage...\033[0m")
    await asyncio.sleep(0.5)
    print("\033[94m  Analyzing alert: Flood detected in Jakarta\033[0m")
    print("\033[94m  • Disaster Type: FLOOD\033[0m")
    print("\033[94m  • Location: Jakarta, Indonesia\033[0m")
    print("\033[94m  • No imagery attached - routing to Climate Analyst\033[0m")
    await asyncio.sleep(0.5)
    print("\033[94m  ➤ HANDOFF to CLIMATE_ANALYST\033[0m\n")
    
    await asyncio.sleep(0.3)
    print("\033[92m▶ [CLIMATE_ANALYST] Starting analysis...\033[0m")
    print("\033[92m  🔧 Calling tool: calculate_supply_needs\033[0m")
    await asyncio.sleep(0.5)
    print("\033[92m  ✓ Tool completed\033[0m")
    print("\033[92m  🔧 Calling tool: generate_crisis_report\033[0m")
    await asyncio.sleep(0.5)
    print("\033[92m  ✓ Tool completed\033[0m")
    
    # Print demo report
    demo_report = """
# 🚨 CRISIS ACTION REPORT
## Aegis-1 Disaster Response System

**Report Generated:** {timestamp}  
**Classification:** OPERATIONAL  
**Report ID:** AEGIS-DEMO-001

---

## 📍 SITUATION OVERVIEW

| Parameter | Value |
|-----------|-------|
| **Disaster Type** | FLOOD |
| **Location** | Jakarta, Indonesia |
| **Severity Level** | HIGH |
| **Population Affected** | 500,000 |
| **Households Affected** | ~111,111 |

---

## 💧 CRITICAL RESOURCE REQUIREMENTS

### Water Supplies
- **Total Required:** 84,000,000 liters
- **20L Jerrycans:** 4,200,000
- **Water Trucks (10,000L):** 8,401
- **Priority:** CRITICAL

### Food Supplies  
- **Meal Packs (500kcal):** 35,280,000
- **Family Food Kits (7-day):** 222,222
- **Priority:** CRITICAL

### Medical Supplies
- **Basic Medical Kits:** 40,000
- **Trauma Kits:** 4,000
- **Cholera Kits:** 1,000
- **Priority:** HIGH

---

## ⚡ IMMEDIATE ACTIONS REQUIRED

1. **Deploy Water Supplies** - Priority distribution to areas without water access
2. **Establish Medical Stations** - Set up 50 field hospitals
3. **Shelter Distribution** - Begin emergency shelter deployment
4. **Search & Rescue** - Coordinate with local emergency services
5. **Communications** - Establish emergency broadcast channels

---

*This report was automatically generated by the Aegis-1 Crisis Response System.*
""".format(timestamp=datetime.now().strftime("%Y-%m-%d %H:%M UTC"))

    print("\n" + "=" * 60)
    print("📋 CRISIS ACTION REPORT (DEMO)")
    print("=" * 60)
    print(demo_report)


if __name__ == "__main__":
    # Check if we should run demo mode
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        asyncio.run(demo_mode())
    else:
        asyncio.run(main())

