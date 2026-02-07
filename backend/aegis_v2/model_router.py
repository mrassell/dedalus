"""
Dynamic Model Router - The Secret Sauce
========================================

Routes tasks to optimal models based on real-time factors.
This is what makes the architecture competition-worthy.
"""

import asyncio
import logging
from enum import Enum
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)


class ModelCapability(Enum):
    """What each model excels at"""
    REASONING = "reasoning"           # Complex multi-step logic
    VISION = "vision"                 # Image/video analysis
    SPEED = "speed"                   # Fast responses
    CODE = "code"                     # Code generation
    COST = "cost"                     # Budget-friendly
    MULTILINGUAL = "multilingual"     # Non-English support
    LONG_CONTEXT = "long_context"     # 100K+ tokens
    TOOL_USE = "tool_use"            # Function calling


@dataclass
class ModelProfile:
    """Profile for a model with its capabilities and costs"""
    id: str
    provider: str
    display_name: str
    capabilities: List[ModelCapability]
    cost_per_1k_input: float      # USD per 1K input tokens
    cost_per_1k_output: float     # USD per 1K output tokens
    avg_latency_ms: int           # Average response time
    max_context: int              # Max context window
    supports_streaming: bool = True
    supports_tools: bool = True
    is_available: bool = True
    rate_limit_rpm: int = 60      # Requests per minute
    
    # Real-time tracking
    current_rpm: int = 0
    total_cost_today: float = 0.0
    last_error: Optional[str] = None
    

# Model Registry - The "menu" of available models
MODEL_REGISTRY: Dict[str, ModelProfile] = {
    # === TIER 1: Premium Reasoning ===
    "claude-3-5-sonnet": ModelProfile(
        id="claude-3-5-sonnet-20241022",
        provider="anthropic",
        display_name="Claude 3.5 Sonnet",
        capabilities=[ModelCapability.REASONING, ModelCapability.TOOL_USE, ModelCapability.CODE, ModelCapability.LONG_CONTEXT],
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
        avg_latency_ms=1200,
        max_context=200000,
    ),
    "gpt-4o": ModelProfile(
        id="gpt-4o-2024-11-20",
        provider="openai",
        display_name="GPT-4o",
        capabilities=[ModelCapability.REASONING, ModelCapability.VISION, ModelCapability.TOOL_USE],
        cost_per_1k_input=0.0025,
        cost_per_1k_output=0.01,
        avg_latency_ms=1000,
        max_context=128000,
    ),
    
    # === TIER 2: Multimodal Vision ===
    "gemini-2.0-flash": ModelProfile(
        id="gemini-2.0-flash",
        provider="google",
        display_name="Gemini 2.0 Flash",
        capabilities=[ModelCapability.VISION, ModelCapability.SPEED, ModelCapability.REASONING],
        cost_per_1k_input=0.0001,
        cost_per_1k_output=0.0004,
        avg_latency_ms=600,
        max_context=1000000,  # 1M context!
    ),
    "gemini-2.0-flash-thinking": ModelProfile(
        id="gemini-2.0-flash-thinking-exp",
        provider="google",
        display_name="Gemini 2.0 Flash Thinking",
        capabilities=[ModelCapability.REASONING, ModelCapability.VISION],
        cost_per_1k_input=0.0001,
        cost_per_1k_output=0.0004,
        avg_latency_ms=2000,
        max_context=1000000,
    ),
    
    # === TIER 3: Speed Demons ===
    "claude-3-haiku": ModelProfile(
        id="claude-3-haiku-20240307",
        provider="anthropic",
        display_name="Claude 3 Haiku",
        capabilities=[ModelCapability.SPEED, ModelCapability.TOOL_USE],
        cost_per_1k_input=0.00025,
        cost_per_1k_output=0.00125,
        avg_latency_ms=300,
        max_context=200000,
    ),
    "gpt-4o-mini": ModelProfile(
        id="gpt-4o-mini",
        provider="openai",
        display_name="GPT-4o Mini",
        capabilities=[ModelCapability.SPEED, ModelCapability.TOOL_USE],
        cost_per_1k_input=0.00015,
        cost_per_1k_output=0.0006,
        avg_latency_ms=400,
        max_context=128000,
    ),
    
    # === TIER 4: Open Source via Featherless ===
    "llama-3.1-70b": ModelProfile(
        id="meta-llama/Llama-3.1-70B-Instruct",
        provider="featherless",
        display_name="Llama 3.1 70B",
        capabilities=[ModelCapability.COST, ModelCapability.REASONING],
        cost_per_1k_input=0.0002,
        cost_per_1k_output=0.0002,
        avg_latency_ms=800,
        max_context=128000,
    ),
    "llama-3.2-vision": ModelProfile(
        id="meta-llama/Llama-3.2-90B-Vision-Instruct",
        provider="featherless",
        display_name="Llama 3.2 90B Vision",
        capabilities=[ModelCapability.VISION, ModelCapability.COST],
        cost_per_1k_input=0.0003,
        cost_per_1k_output=0.0003,
        avg_latency_ms=1200,
        max_context=128000,
    ),
    "deepseek-coder": ModelProfile(
        id="deepseek-ai/DeepSeek-Coder-V2-Instruct",
        provider="featherless",
        display_name="DeepSeek Coder V2",
        capabilities=[ModelCapability.CODE, ModelCapability.COST],
        cost_per_1k_input=0.00014,
        cost_per_1k_output=0.00028,
        avg_latency_ms=600,
        max_context=128000,
    ),
    "qwen-2.5-72b": ModelProfile(
        id="Qwen/Qwen2.5-72B-Instruct",
        provider="featherless",
        display_name="Qwen 2.5 72B",
        capabilities=[ModelCapability.MULTILINGUAL, ModelCapability.REASONING, ModelCapability.COST],
        cost_per_1k_input=0.0002,
        cost_per_1k_output=0.0002,
        avg_latency_ms=700,
        max_context=128000,
    ),
}


@dataclass
class TaskRequirements:
    """What a task needs from a model"""
    required_capabilities: List[ModelCapability]
    preferred_capabilities: List[ModelCapability] = field(default_factory=list)
    max_latency_ms: Optional[int] = None
    max_cost_per_call: Optional[float] = None
    min_context_tokens: int = 4000
    requires_streaming: bool = False
    requires_tools: bool = False
    has_image: bool = False
    priority: str = "normal"  # low, normal, high, critical


class ModelRouter:
    """
    Dynamic Model Router - Routes tasks to optimal models
    
    This is the competition-winning piece:
    - Scores models based on task requirements
    - Considers real-time availability and cost
    - Implements failover strategies
    - Tracks usage for budget management
    """
    
    def __init__(self, budget_usd: float = 10.0):
        self.models = MODEL_REGISTRY.copy()
        self.daily_budget = budget_usd
        self.spent_today = 0.0
        self.budget_reset_time = datetime.now().replace(hour=0, minute=0, second=0)
        self._lock = asyncio.Lock()
    
    async def select_model(
        self, 
        requirements: TaskRequirements,
        exclude_models: Optional[List[str]] = None
    ) -> Tuple[str, ModelProfile]:
        """
        Select the optimal model for a task.
        
        Returns tuple of (model_key, model_profile)
        """
        async with self._lock:
            # Reset daily budget if needed
            if datetime.now() > self.budget_reset_time + timedelta(days=1):
                self.spent_today = 0.0
                self.budget_reset_time = datetime.now().replace(hour=0, minute=0, second=0)
            
            exclude = set(exclude_models or [])
            candidates = []
            
            for key, model in self.models.items():
                if key in exclude:
                    continue
                if not model.is_available:
                    continue
                    
                score = self._score_model(model, requirements)
                if score > 0:
                    candidates.append((key, model, score))
            
            if not candidates:
                raise ValueError("No suitable model found for requirements")
            
            # Sort by score (descending)
            candidates.sort(key=lambda x: x[2], reverse=True)
            
            best_key, best_model, score = candidates[0]
            logger.info(f"Selected model: {best_model.display_name} (score: {score:.2f})")
            
            return best_key, best_model
    
    def _score_model(self, model: ModelProfile, req: TaskRequirements) -> float:
        """Score a model based on how well it matches requirements"""
        score = 100.0
        
        # === Must-have capabilities ===
        for cap in req.required_capabilities:
            if cap not in model.capabilities:
                return 0  # Instant disqualification
        
        # === Image requirement ===
        if req.has_image and ModelCapability.VISION not in model.capabilities:
            return 0
        
        # === Tool use requirement ===
        if req.requires_tools and not model.supports_tools:
            return 0
        
        # === Streaming requirement ===
        if req.requires_streaming and not model.supports_streaming:
            return 0
        
        # === Context size ===
        if model.max_context < req.min_context_tokens:
            return 0
        
        # === Latency constraint ===
        if req.max_latency_ms and model.avg_latency_ms > req.max_latency_ms:
            score -= 30  # Heavy penalty
        
        # === Cost constraint ===
        avg_call_cost = (model.cost_per_1k_input * 2 + model.cost_per_1k_output * 1) / 1000 * 2000
        if req.max_cost_per_call and avg_call_cost > req.max_cost_per_call:
            score -= 40  # Heavy penalty
        
        # === Budget awareness ===
        remaining_budget = self.daily_budget - self.spent_today
        if remaining_budget < 1.0:  # Low budget mode
            # Heavily favor cheap models
            cost_factor = avg_call_cost * 100
            score -= cost_factor
        
        # === Bonus for preferred capabilities ===
        for cap in req.preferred_capabilities:
            if cap in model.capabilities:
                score += 10
        
        # === Priority adjustments ===
        if req.priority == "critical":
            # Favor premium models for critical tasks
            if "claude-3-5" in model.id or "gpt-4o" in model.id:
                score += 20
        elif req.priority == "low":
            # Favor cheap models for low priority
            score -= avg_call_cost * 50
        
        # === Rate limit check ===
        if model.current_rpm >= model.rate_limit_rpm * 0.9:
            score -= 50  # Close to rate limit
        
        # === Recent errors ===
        if model.last_error:
            score -= 20
        
        return max(0, score)
    
    async def record_usage(
        self, 
        model_key: str, 
        input_tokens: int, 
        output_tokens: int,
        success: bool = True,
        error: Optional[str] = None
    ):
        """Record usage for tracking and billing"""
        async with self._lock:
            model = self.models.get(model_key)
            if not model:
                return
            
            # Calculate cost
            cost = (
                (input_tokens / 1000) * model.cost_per_1k_input +
                (output_tokens / 1000) * model.cost_per_1k_output
            )
            
            self.spent_today += cost
            model.total_cost_today += cost
            model.current_rpm += 1
            
            if not success:
                model.last_error = error
            else:
                model.last_error = None
            
            logger.debug(f"Usage recorded: {model.display_name} - ${cost:.4f} (total today: ${self.spent_today:.2f})")
    
    def get_budget_status(self) -> Dict:
        """Get current budget status"""
        return {
            "daily_budget": self.daily_budget,
            "spent_today": self.spent_today,
            "remaining": self.daily_budget - self.spent_today,
            "utilization_pct": (self.spent_today / self.daily_budget) * 100,
        }
    
    def get_model_stats(self) -> List[Dict]:
        """Get stats for all models"""
        return [
            {
                "id": key,
                "name": model.display_name,
                "provider": model.provider,
                "cost_today": model.total_cost_today,
                "current_rpm": model.current_rpm,
                "is_available": model.is_available,
                "last_error": model.last_error,
            }
            for key, model in self.models.items()
        ]


# === Task Requirement Presets ===

def triage_task() -> TaskRequirements:
    """Quick triage/routing - needs speed"""
    return TaskRequirements(
        required_capabilities=[ModelCapability.TOOL_USE],
        preferred_capabilities=[ModelCapability.SPEED],
        max_latency_ms=500,
        max_cost_per_call=0.001,
        requires_tools=True,
        priority="high",
    )


def vision_analysis_task() -> TaskRequirements:
    """Image analysis - needs vision capability"""
    return TaskRequirements(
        required_capabilities=[ModelCapability.VISION],
        preferred_capabilities=[ModelCapability.REASONING],
        has_image=True,
        priority="high",
    )


def complex_reasoning_task() -> TaskRequirements:
    """Complex multi-step reasoning"""
    return TaskRequirements(
        required_capabilities=[ModelCapability.REASONING],
        preferred_capabilities=[ModelCapability.TOOL_USE, ModelCapability.LONG_CONTEXT],
        min_context_tokens=50000,
        requires_tools=True,
        priority="normal",
    )


def budget_task() -> TaskRequirements:
    """Budget-conscious task"""
    return TaskRequirements(
        required_capabilities=[],
        preferred_capabilities=[ModelCapability.COST],
        max_cost_per_call=0.0005,
        priority="low",
    )


def crisis_critical_task() -> TaskRequirements:
    """Crisis-critical task - best model, no compromises"""
    return TaskRequirements(
        required_capabilities=[ModelCapability.REASONING, ModelCapability.TOOL_USE],
        preferred_capabilities=[],
        requires_tools=True,
        requires_streaming=True,
        priority="critical",
    )

