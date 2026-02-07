"""
Agent implementation for Dedalus Labs
"""

import asyncio
import logging
import uuid
from typing import Any, AsyncIterator, Callable, Dict, List, Optional

from .types import (
    AgentConfig, 
    AgentResponse, 
    Message, 
    MessageRole,
    StreamEvent,
    StreamEventType,
    ToolCall,
    ToolResult
)
from .llm_client import get_llm_client
from .mcp_client import MCPClientPool

logger = logging.getLogger(__name__)


class Agent:
    """
    AI Agent with tool use and handoff capabilities.
    
    Agents can:
    - Use LLM models from different providers
    - Connect to MCP servers for tool access
    - Hand off to other agents in a swarm
    - Stream their reasoning process
    """
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.name = config.name
        self.model = config.model
        self.system_prompt = config.system_prompt
        self.mcp_pool = MCPClientPool()
        self._handoff_registry: Dict[str, "Agent"] = {}
    
    def register_handoff(self, agent: "Agent"):
        """Register an agent for potential handoffs"""
        self._handoff_registry[agent.name] = agent
    
    async def initialize_mcp(self, server_urls: List[str]):
        """Initialize connections to MCP servers"""
        for url in server_urls:
            await self.mcp_pool.add_server(url)
        
        # Also add servers from config
        for url in self.config.mcp_servers:
            await self.mcp_pool.add_server(url)
    
    async def run(
        self,
        messages: List[Message],
        stream: bool = False,
        max_turns: int = 10
    ) -> AgentResponse:
        """
        Run the agent on a conversation.
        
        Args:
            messages: Conversation history
            stream: Whether to stream the response
            max_turns: Maximum tool-use turns
            
        Returns:
            AgentResponse with the agent's output
        """
        llm_client, model_name = get_llm_client(self.model)
        
        # Prepare messages with system prompt
        full_messages = [Message.system(self._build_system_prompt())] + messages
        
        # Get available tools
        tools = self._get_available_tools()
        
        all_tool_calls = []
        all_tool_results = []
        final_content = ""
        handoff_to = None
        
        for turn in range(max_turns):
            try:
                response = await llm_client.chat(
                    messages=full_messages,
                    tools=tools if tools else None,
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens,
                    model=model_name
                )
                
                content = response.get("content", "")
                tool_calls = response.get("tool_calls", [])
                
                if not tool_calls:
                    # No more tool calls, we're done
                    final_content = content
                    break
                
                # Process tool calls
                for tool_call in tool_calls:
                    all_tool_calls.append(tool_call)
                    
                    # Check for handoff
                    if tool_call.name == "handoff":
                        target_agent = tool_call.arguments.get("agent_name")
                        if target_agent in self._handoff_registry:
                            handoff_to = target_agent
                            final_content = content
                            break
                    
                    # Execute tool
                    result = await self._execute_tool(tool_call)
                    all_tool_results.append(result)
                    
                    # Add tool result to messages
                    full_messages.append(Message(
                        role=MessageRole.ASSISTANT,
                        content=content,
                        tool_calls=[tool_call]
                    ))
                    full_messages.append(Message(
                        role=MessageRole.TOOL,
                        content=str(result.content),
                        tool_call_id=tool_call.id
                    ))
                
                if handoff_to:
                    break
                    
            except Exception as e:
                logger.exception(f"Agent run error: {e}")
                final_content = f"Error during execution: {str(e)}"
                break
        
        return AgentResponse(
            agent=self.name,
            content=final_content,
            tool_calls=all_tool_calls,
            tool_results=all_tool_results,
            handoff_to=handoff_to,
            messages=full_messages
        )
    
    async def run_stream(
        self,
        messages: List[Message],
        max_turns: int = 10
    ) -> AsyncIterator[StreamEvent]:
        """
        Run the agent with streaming output.
        
        Yields StreamEvent objects for real-time updates.
        """
        yield StreamEvent(type=StreamEventType.START, agent=self.name)
        
        try:
            # For now, run non-streaming and emit events
            response = await self.run(messages, stream=False, max_turns=max_turns)
            
            # Emit tool calls
            for tool_call in response.tool_calls:
                yield StreamEvent(
                    type=StreamEventType.TOOL_CALL,
                    agent=self.name,
                    data={"name": tool_call.name, "arguments": tool_call.arguments}
                )
            
            # Emit tool results
            for result in response.tool_results:
                yield StreamEvent(
                    type=StreamEventType.TOOL_RESULT,
                    agent=self.name,
                    data={"tool_call_id": result.tool_call_id, "content": result.content}
                )
            
            # Emit final content
            if response.content:
                yield StreamEvent(
                    type=StreamEventType.TEXT_DELTA,
                    agent=self.name,
                    data=response.content
                )
            
            # Emit handoff if present
            if response.handoff_to:
                yield StreamEvent(
                    type=StreamEventType.HANDOFF,
                    agent=self.name,
                    data={"target": response.handoff_to}
                )
            
            yield StreamEvent(
                type=StreamEventType.COMPLETE,
                agent=self.name,
                data=response.model_dump()
            )
            
        except Exception as e:
            yield StreamEvent(
                type=StreamEventType.ERROR,
                agent=self.name,
                data=str(e)
            )
    
    def _build_system_prompt(self) -> str:
        """Build the full system prompt including handoff instructions"""
        prompt = self.system_prompt
        
        if self._handoff_registry:
            prompt += "\n\n## Available Agents for Handoff\n"
            prompt += "You can hand off to these specialized agents:\n"
            for name, agent in self._handoff_registry.items():
                prompt += f"- **{name}**: {agent.config.metadata.get('description', 'Specialized agent')}\n"
            prompt += "\nUse the 'handoff' tool to transfer the conversation when appropriate."
        
        return prompt
    
    def _get_available_tools(self) -> List[Dict[str, Any]]:
        """Get all available tools including MCP tools and handoff"""
        tools = self.mcp_pool.get_all_tools()
        
        # Add handoff tool if we have registered agents
        if self._handoff_registry:
            tools.append({
                "type": "function",
                "function": {
                    "name": "handoff",
                    "description": "Hand off the conversation to another specialized agent",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "agent_name": {
                                "type": "string",
                                "description": "Name of the agent to hand off to",
                                "enum": list(self._handoff_registry.keys())
                            },
                            "context": {
                                "type": "string",
                                "description": "Brief context for the handoff"
                            }
                        },
                        "required": ["agent_name"]
                    }
                }
            })
        
        return tools
    
    async def _execute_tool(self, tool_call: ToolCall) -> ToolResult:
        """Execute a tool call"""
        try:
            result = await self.mcp_pool.call_tool(
                tool_call.name,
                tool_call.arguments
            )
            return ToolResult(
                tool_call_id=tool_call.id,
                content=result,
                is_error=False
            )
        except Exception as e:
            logger.exception(f"Tool execution failed: {tool_call.name}")
            return ToolResult(
                tool_call_id=tool_call.id,
                content=str(e),
                is_error=True
            )

