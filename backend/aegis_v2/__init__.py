"""
Aegis-1 v2.0 - Competition-Grade Multi-Agent Architecture
==========================================================

Features that make this win "Best MCP Tooling":

1. DYNAMIC MODEL ROUTER
   - Selects optimal model per-task based on:
     * Task complexity (simple query vs multi-step reasoning)
     * Cost constraints (budget-aware routing)
     * Latency requirements (real-time vs batch)
     * Model availability (failover to alternatives)

2. MCP SERVER MESH
   - Multiple specialized MCP servers that discover each other
   - Federated tool registry
   - Cross-server tool chaining

3. AGENT SPECIALIZATION MATRIX
   - Vision tasks → Gemini 2.0 Flash (multimodal)
   - Complex reasoning → Claude 3.5 Sonnet
   - Fast triage → Claude 3 Haiku (speed)
   - Code generation → DeepSeek Coder
   - Cost-sensitive → Llama 3.1 70B via Featherless

4. REAL-TIME OPTIMIZATION
   - Model cost/token tracking
   - Auto-downgrade when budget exceeded
   - Parallel tool execution
   - Streaming aggregation from multiple sources

5. DISASTER RELIEF USE CASE
   - NASA FIRMS (fire data) → MCP
   - OpenMeteo (weather) → MCP  
   - Google Maps (routing) → MCP
   - Featherless (vision) → MCP
   - Custom relief-ops → MCP
"""

from .model_router import ModelRouter, ModelCapability
from .mcp_mesh import MCPMesh, MCPServerNode
from .swarm import AegisSwarm, SwarmConfig
from .cost_optimizer import CostOptimizer, Budget

__version__ = "2.0.0"

