"""
DedalusRunner - High-level orchestrator for multi-agent systems
"""

import asyncio
import logging
from typing import Any, AsyncIterator, Dict, List, Optional, Union

from .agent import Agent
from .types import (
    AgentConfig,
    AgentResponse,
    Message,
    RunConfig,
    StreamEvent,
    StreamEventType
)
from .mcp_client import MCPClientPool

logger = logging.getLogger(__name__)


class DedalusRunner:
    """
    High-level runner for orchestrating multi-agent systems.
    
    Manages agent lifecycles, MCP connections, and conversation flow
    including handoffs between agents.
    
    Usage:
        runner = DedalusRunner()
        runner.add_agent(watchman_config)
        runner.add_agent(analyst_config)
        
        response = await runner.run(
            "Analyze this disaster report",
            starting_agent="watchman",
            mcp_servers=["http://localhost:8000/mcp"]
        )
    """
    
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.mcp_pool = MCPClientPool()
        self._initialized = False
    
    def add_agent(self, config: AgentConfig) -> Agent:
        """
        Add an agent to the runner.
        
        Args:
            config: Agent configuration
            
        Returns:
            The created Agent instance
        """
        agent = Agent(config)
        self.agents[config.name] = agent
        
        # Register handoffs between agents
        for other_name, other_agent in self.agents.items():
            if other_name != config.name:
                agent.register_handoff(other_agent)
                other_agent.register_handoff(agent)
        
        return agent
    
    async def initialize(self, mcp_servers: Optional[List[str]] = None):
        """Initialize MCP connections for all agents"""
        servers = mcp_servers or []
        
        # Initialize shared MCP pool
        for url in servers:
            await self.mcp_pool.add_server(url)
        
        # Initialize each agent's MCP connections
        for agent in self.agents.values():
            await agent.initialize_mcp(servers)
        
        self._initialized = True
    
    async def run(
        self,
        input_text: str,
        starting_agent: str,
        mcp_servers: Optional[List[str]] = None,
        stream: bool = False,
        max_turns: int = 10,
        max_handoffs: int = 5,
        **kwargs
    ) -> Union[AgentResponse, AsyncIterator[StreamEvent]]:
        """
        Run the multi-agent system on an input.
        
        Args:
            input_text: User input text
            starting_agent: Name of the agent to start with
            mcp_servers: List of MCP server URLs to connect to
            stream: Whether to stream the response
            max_turns: Maximum turns per agent
            max_handoffs: Maximum number of agent handoffs
            
        Returns:
            AgentResponse or stream of StreamEvents
        """
        # Initialize MCP if needed
        if mcp_servers or not self._initialized:
            await self.initialize(mcp_servers)
        
        if starting_agent not in self.agents:
            raise ValueError(f"Unknown agent: {starting_agent}")
        
        if stream:
            return self._run_stream(
                input_text, 
                starting_agent, 
                max_turns, 
                max_handoffs
            )
        
        return await self._run_sync(
            input_text,
            starting_agent,
            max_turns,
            max_handoffs
        )
    
    async def _run_sync(
        self,
        input_text: str,
        starting_agent: str,
        max_turns: int,
        max_handoffs: int
    ) -> AgentResponse:
        """Synchronous (non-streaming) run"""
        current_agent_name = starting_agent
        messages = [Message.user(input_text)]
        handoff_count = 0
        
        while handoff_count < max_handoffs:
            agent = self.agents[current_agent_name]
            response = await agent.run(messages, max_turns=max_turns)
            
            if response.handoff_to:
                # Transfer to new agent with context
                handoff_count += 1
                current_agent_name = response.handoff_to
                
                # Add agent's response to conversation
                if response.content:
                    messages.append(Message.assistant(response.content))
                
                logger.info(f"Handoff from {agent.name} to {response.handoff_to}")
            else:
                # No handoff, we're done
                return response
        
        # Max handoffs reached
        logger.warning(f"Max handoffs ({max_handoffs}) reached")
        return response
    
    async def _run_stream(
        self,
        input_text: str,
        starting_agent: str,
        max_turns: int,
        max_handoffs: int
    ) -> AsyncIterator[StreamEvent]:
        """Streaming run"""
        current_agent_name = starting_agent
        messages = [Message.user(input_text)]
        handoff_count = 0
        
        while handoff_count < max_handoffs:
            agent = self.agents[current_agent_name]
            
            handoff_target = None
            async for event in agent.run_stream(messages, max_turns=max_turns):
                yield event
                
                if event.type == StreamEventType.HANDOFF:
                    handoff_target = event.data.get("target")
                elif event.type == StreamEventType.COMPLETE:
                    response_data = event.data
            
            if handoff_target:
                handoff_count += 1
                current_agent_name = handoff_target
                
                # Update messages
                if response_data and response_data.get("content"):
                    messages.append(Message.assistant(response_data["content"]))
            else:
                break
    
    def stream_async(
        self,
        input_text: str,
        starting_agent: str,
        **kwargs
    ) -> AsyncIterator[StreamEvent]:
        """
        Convenience method for streaming runs.
        
        Usage:
            async for event in runner.stream_async("input", "agent"):
                print(event)
        """
        return self.run(input_text, starting_agent, stream=True, **kwargs)


class AsyncDedalus:
    """
    Async context manager for Dedalus runner.
    
    Usage:
        async with AsyncDedalus() as dedalus:
            runner = dedalus.create_runner()
            runner.add_agent(config)
            response = await runner.run(...)
    """
    
    def __init__(self):
        self._runner: Optional[DedalusRunner] = None
    
    async def __aenter__(self) -> "AsyncDedalus":
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Cleanup if needed
        pass
    
    def create_runner(self) -> DedalusRunner:
        """Create a new DedalusRunner instance"""
        self._runner = DedalusRunner()
        return self._runner


class Dedalus:
    """
    Synchronous wrapper for Dedalus (uses asyncio.run internally).
    
    Usage:
        with Dedalus() as dedalus:
            runner = dedalus.create_runner()
            # ...
    """
    
    def __init__(self):
        self._async = AsyncDedalus()
    
    def __enter__(self) -> "Dedalus":
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
    
    def create_runner(self) -> DedalusRunner:
        """Create a new DedalusRunner instance"""
        return DedalusRunner()

