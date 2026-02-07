"""
Aegis Swarm - Intelligent Agent Orchestration
==============================================

The orchestration layer that ties everything together:
- Dynamic agent spawning
- Model-optimized task routing
- Parallel execution
- Cost-aware scheduling
"""

import asyncio
import logging
from typing import Any, AsyncIterator, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from .model_router import ModelRouter, TaskRequirements, ModelCapability
from .model_router import triage_task, vision_analysis_task, complex_reasoning_task, crisis_critical_task
from .mcp_mesh import MCPMesh, MCPServerType

logger = logging.getLogger(__name__)


class AgentRole(Enum):
    """Specialized agent roles"""
    TRIAGE = "triage"           # Fast routing, minimal model
    VISION = "vision"           # Image analysis, multimodal
    ANALYST = "analyst"         # Complex reasoning, tool use
    COORDINATOR = "coordinator" # Meta-agent, orchestration
    SPECIALIST = "specialist"   # Domain-specific expert


@dataclass
class AgentSpec:
    """Specification for an agent"""
    name: str
    role: AgentRole
    system_prompt: str
    task_requirements: TaskRequirements
    mcp_server_types: List[MCPServerType] = field(default_factory=list)
    can_handoff_to: List[str] = field(default_factory=list)
    max_turns: int = 10


# === Agent Specifications ===

WATCHMAN_SPEC = AgentSpec(
    name="watchman",
    role=AgentRole.TRIAGE,
    system_prompt="""You are THE WATCHMAN, the triage agent for Aegis-1 Disaster Response.

Your job is FAST assessment and routing:
1. Parse incoming alerts (disaster type, location, severity)
2. Check for image attachments → route to Vision Specialist
3. Text-only alerts → route to Climate Analyst
4. Extract key parameters for downstream agents

Be FAST. Be DECISIVE. Lives depend on quick routing.""",
    task_requirements=triage_task(),
    mcp_server_types=[],  # No tools needed, just routing
    can_handoff_to=["vision_specialist", "climate_analyst"],
    max_turns=2,
)

VISION_SPECIALIST_SPEC = AgentSpec(
    name="vision_specialist",
    role=AgentRole.VISION,
    system_prompt="""You are the VISION SPECIALIST for Aegis-1.

You analyze disaster imagery using advanced vision models:
- Satellite imagery analysis
- Damage assessment
- Flood extent mapping
- Fire perimeter detection
- Infrastructure assessment

Output structured analysis with confidence scores.
After analysis, handoff to Climate Analyst with findings.""",
    task_requirements=vision_analysis_task(),
    mcp_server_types=[MCPServerType.VISION, MCPServerType.SATELLITE],
    can_handoff_to=["climate_analyst"],
    max_turns=5,
)

CLIMATE_ANALYST_SPEC = AgentSpec(
    name="climate_analyst", 
    role=AgentRole.ANALYST,
    system_prompt="""You are the CLIMATE & LOGISTICS ANALYST for Aegis-1.

You have access to multiple MCP tool servers:
- relief-ops: Supply calculations, zone prioritization, logistics
- open-meteo: Weather data, forecasts, flood risk
- nasa-firms: Fire detection, burn area
- google-maps: Routing, geocoding

Your workflow:
1. Gather weather data for the affected region
2. Calculate supply needs based on disaster parameters
3. Prioritize affected zones
4. Generate comprehensive Crisis Action Report

Use tools in PARALLEL when possible for speed.""",
    task_requirements=complex_reasoning_task(),
    mcp_server_types=[
        MCPServerType.RELIEF_OPS,
        MCPServerType.WEATHER,
        MCPServerType.SATELLITE,
        MCPServerType.MAPS,
    ],
    can_handoff_to=[],  # Terminal agent
    max_turns=10,
)

CRISIS_COORDINATOR_SPEC = AgentSpec(
    name="crisis_coordinator",
    role=AgentRole.COORDINATOR,
    system_prompt="""You are the CRISIS COORDINATOR, the meta-agent for Aegis-1.

You orchestrate the entire response:
- Monitor all agent activities
- Escalate critical situations
- Coordinate parallel operations
- Synthesize final reports

Only activate for CRITICAL severity disasters.""",
    task_requirements=crisis_critical_task(),
    mcp_server_types=[MCPServerType.RELIEF_OPS],
    can_handoff_to=["watchman"],
    max_turns=15,
)


@dataclass
class SwarmConfig:
    """Configuration for the agent swarm"""
    daily_budget_usd: float = 10.0
    enable_parallel_tools: bool = True
    enable_cost_optimization: bool = True
    max_concurrent_agents: int = 3
    default_starting_agent: str = "watchman"


@dataclass
class SwarmEvent:
    """Event emitted during swarm execution"""
    timestamp: datetime
    event_type: str  # agent_start, model_selected, tool_call, handoff, complete, error
    agent: str
    data: Dict[str, Any]


class AegisSwarm:
    """
    The complete Aegis-1 swarm orchestrator.
    
    This is the competition-winning architecture:
    - Dynamic model selection per-agent based on task
    - MCP mesh for federated tool access
    - Cost-aware execution
    - Parallel tool execution
    - Real-time streaming
    """
    
    def __init__(self, config: Optional[SwarmConfig] = None):
        self.config = config or SwarmConfig()
        self.model_router = ModelRouter(budget_usd=self.config.daily_budget_usd)
        self.mcp_mesh = MCPMesh()
        
        self.agents: Dict[str, AgentSpec] = {
            "watchman": WATCHMAN_SPEC,
            "vision_specialist": VISION_SPECIALIST_SPEC,
            "climate_analyst": CLIMATE_ANALYST_SPEC,
            "crisis_coordinator": CRISIS_COORDINATOR_SPEC,
        }
        
        self._initialized = False
    
    async def initialize(self):
        """Initialize the swarm (MCP mesh, etc.)"""
        await self.mcp_mesh.register_default_mesh()
        self._initialized = True
        logger.info("Aegis Swarm initialized")
    
    async def process(
        self,
        alert: str,
        image_url: Optional[str] = None,
        starting_agent: Optional[str] = None,
        stream: bool = True
    ) -> AsyncIterator[SwarmEvent]:
        """
        Process an alert through the swarm.
        
        This is where the magic happens:
        1. Select optimal model for starting agent
        2. Execute agent with MCP tools
        3. Handle handoffs dynamically
        4. Track costs in real-time
        """
        if not self._initialized:
            await self.initialize()
        
        current_agent_name = starting_agent or self.config.default_starting_agent
        context = {"alert": alert, "image_url": image_url}
        
        visited_agents = set()
        
        while current_agent_name and current_agent_name not in visited_agents:
            visited_agents.add(current_agent_name)
            agent_spec = self.agents.get(current_agent_name)
            
            if not agent_spec:
                yield SwarmEvent(
                    timestamp=datetime.now(),
                    event_type="error",
                    agent=current_agent_name,
                    data={"error": f"Unknown agent: {current_agent_name}"}
                )
                break
            
            # === 1. Select optimal model for this agent ===
            yield SwarmEvent(
                timestamp=datetime.now(),
                event_type="agent_start",
                agent=current_agent_name,
                data={"role": agent_spec.role.value}
            )
            
            try:
                model_key, model_profile = await self.model_router.select_model(
                    agent_spec.task_requirements
                )
                
                yield SwarmEvent(
                    timestamp=datetime.now(),
                    event_type="model_selected",
                    agent=current_agent_name,
                    data={
                        "model": model_profile.display_name,
                        "provider": model_profile.provider,
                        "reason": self._explain_model_selection(agent_spec, model_profile)
                    }
                )
            except ValueError as e:
                yield SwarmEvent(
                    timestamp=datetime.now(),
                    event_type="error",
                    agent=current_agent_name,
                    data={"error": str(e)}
                )
                break
            
            # === 2. Get available tools for this agent ===
            tools = self._get_agent_tools(agent_spec)
            
            if tools:
                yield SwarmEvent(
                    timestamp=datetime.now(),
                    event_type="tools_available",
                    agent=current_agent_name,
                    data={"tools": [t["function"]["name"] for t in tools]}
                )
            
            # === 3. Execute agent (simulated for demo) ===
            # In production, this would call the actual LLM
            handoff_to = None
            
            async for event in self._simulate_agent_execution(
                agent_spec, model_profile, context, tools
            ):
                yield event
                
                if event.event_type == "handoff":
                    handoff_to = event.data.get("target")
            
            # === 4. Record costs ===
            # Simulated token counts
            await self.model_router.record_usage(
                model_key,
                input_tokens=500,
                output_tokens=200,
                success=True
            )
            
            yield SwarmEvent(
                timestamp=datetime.now(),
                event_type="agent_complete",
                agent=current_agent_name,
                data={
                    "model_used": model_profile.display_name,
                    "budget_remaining": self.model_router.get_budget_status()["remaining"]
                }
            )
            
            # === 5. Handle handoff ===
            current_agent_name = handoff_to
        
        # Final summary
        yield SwarmEvent(
            timestamp=datetime.now(),
            event_type="swarm_complete",
            agent="coordinator",
            data={
                "agents_used": list(visited_agents),
                "total_cost": self.model_router.spent_today,
                "mesh_status": self.mcp_mesh.get_mesh_status()
            }
        )
    
    def _get_agent_tools(self, agent_spec: AgentSpec) -> List[Dict]:
        """Get MCP tools available to an agent based on its server types"""
        all_tools = []
        
        for server_type in agent_spec.mcp_server_types:
            tools = self.mcp_mesh.discover_tools(capability_filter=server_type)
            for tool in tools:
                all_tools.append({
                    "type": "function",
                    "function": {
                        "name": f"{tool.server_id}__{tool.name}",
                        "description": tool.description,
                        "parameters": {
                            "type": "object",
                            "properties": {k: {"type": v} for k, v in tool.parameters.items()},
                            "required": list(tool.parameters.keys())
                        }
                    }
                })
        
        return all_tools
    
    def _explain_model_selection(self, agent: AgentSpec, model) -> str:
        """Explain why a model was selected"""
        reasons = []
        
        if agent.role == AgentRole.TRIAGE:
            reasons.append("Fast triage requires low latency")
        elif agent.role == AgentRole.VISION:
            reasons.append("Image analysis requires vision capability")
        elif agent.role == AgentRole.ANALYST:
            reasons.append("Complex reasoning with tool use required")
        
        if ModelCapability.COST in model.capabilities:
            reasons.append("Budget-optimized selection")
        
        return "; ".join(reasons)
    
    async def _simulate_agent_execution(
        self,
        agent: AgentSpec,
        model,
        context: Dict,
        tools: List[Dict]
    ) -> AsyncIterator[SwarmEvent]:
        """Simulate agent execution (replace with real LLM calls in production)"""
        
        await asyncio.sleep(0.3)  # Simulate latency
        
        # Simulate tool calls for analyst
        if agent.role == AgentRole.ANALYST and tools:
            for tool in tools[:3]:  # Call first 3 tools
                tool_name = tool["function"]["name"]
                
                yield SwarmEvent(
                    timestamp=datetime.now(),
                    event_type="tool_call",
                    agent=agent.name,
                    data={"tool": tool_name, "status": "executing"}
                )
                
                await asyncio.sleep(0.5)  # Simulate tool execution
                
                yield SwarmEvent(
                    timestamp=datetime.now(),
                    event_type="tool_result",
                    agent=agent.name,
                    data={"tool": tool_name, "status": "completed"}
                )
        
        # Simulate response
        yield SwarmEvent(
            timestamp=datetime.now(),
            event_type="response",
            agent=agent.name,
            data={"content": f"[{model.display_name}] Analysis complete for {context.get('alert', 'alert')[:50]}..."}
        )
        
        # Simulate handoff decision
        if agent.can_handoff_to:
            has_image = bool(context.get("image_url"))
            
            if agent.role == AgentRole.TRIAGE:
                target = "vision_specialist" if has_image else "climate_analyst"
                yield SwarmEvent(
                    timestamp=datetime.now(),
                    event_type="handoff",
                    agent=agent.name,
                    data={"target": target, "reason": "Routing based on input type"}
                )
            elif agent.role == AgentRole.VISION:
                yield SwarmEvent(
                    timestamp=datetime.now(),
                    event_type="handoff",
                    agent=agent.name,
                    data={"target": "climate_analyst", "reason": "Vision analysis complete, proceeding to logistics"}
                )
    
    def get_status(self) -> Dict[str, Any]:
        """Get complete swarm status"""
        return {
            "budget": self.model_router.get_budget_status(),
            "models": self.model_router.get_model_stats(),
            "mesh": self.mcp_mesh.get_mesh_status(),
            "agents": [
                {
                    "name": spec.name,
                    "role": spec.role.value,
                    "can_handoff_to": spec.can_handoff_to,
                    "tools": len(self._get_agent_tools(spec)),
                }
                for spec in self.agents.values()
            ]
        }


# === CLI Demo ===

async def demo():
    """Run a demonstration of the swarm"""
    print("\n" + "=" * 70)
    print("🛡️  AEGIS-1 v2.0 - Competition-Grade Multi-Agent Architecture")
    print("=" * 70)
    
    swarm = AegisSwarm(SwarmConfig(
        daily_budget_usd=5.0,
        enable_cost_optimization=True,
    ))
    
    await swarm.initialize()
    
    print("\n📊 SWARM STATUS:")
    status = swarm.get_status()
    print(f"   Budget: ${status['budget']['remaining']:.2f} remaining")
    print(f"   MCP Servers: {status['mesh']['healthy_servers']}/{status['mesh']['total_servers']} healthy")
    print(f"   Total Tools: {status['mesh']['total_tools']}")
    
    print("\n🚨 PROCESSING ALERT...")
    print("-" * 70)
    
    async for event in swarm.process(
        alert="CRITICAL: Flood detected in Jakarta, Indonesia. 500,000 people affected. Severity CRITICAL.",
        stream=True
    ):
        if event.event_type == "agent_start":
            print(f"\n▶ [{event.agent.upper()}] Starting...")
        elif event.event_type == "model_selected":
            print(f"   🧠 Model: {event.data['model']} ({event.data['provider']})")
            print(f"   💡 Reason: {event.data['reason']}")
        elif event.event_type == "tool_call":
            print(f"   🔧 Calling: {event.data['tool']}")
        elif event.event_type == "tool_result":
            print(f"   ✓ {event.data['tool']} completed")
        elif event.event_type == "handoff":
            print(f"   ➤ HANDOFF to {event.data['target'].upper()}: {event.data['reason']}")
        elif event.event_type == "response":
            print(f"   📝 {event.data['content'][:80]}...")
        elif event.event_type == "agent_complete":
            print(f"   💰 Budget remaining: ${event.data['budget_remaining']:.2f}")
        elif event.event_type == "swarm_complete":
            print(f"\n{'=' * 70}")
            print(f"✅ SWARM COMPLETE")
            print(f"   Agents used: {', '.join(event.data['agents_used'])}")
            print(f"   Total cost: ${event.data['total_cost']:.4f}")


if __name__ == "__main__":
    asyncio.run(demo())

