"""
Cost Optimizer - Smart Budget Management
=========================================

Real-time cost optimization across models and tools.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class BudgetPolicy(Enum):
    """Budget management policies"""
    STRICT = "strict"           # Hard stop at budget
    SOFT = "soft"               # Warn but allow overage
    ADAPTIVE = "adaptive"       # Auto-downgrade models
    UNLIMITED = "unlimited"     # No limits


@dataclass
class Budget:
    """Budget configuration"""
    daily_limit_usd: float = 10.0
    hourly_limit_usd: float = 2.0
    per_request_limit_usd: float = 0.10
    policy: BudgetPolicy = BudgetPolicy.ADAPTIVE
    
    # Alert thresholds
    warn_at_percent: float = 70.0
    critical_at_percent: float = 90.0


@dataclass
class CostRecord:
    """Record of a cost event"""
    timestamp: datetime
    model: str
    operation: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    metadata: Dict = field(default_factory=dict)


class CostOptimizer:
    """
    Smart cost optimizer for multi-agent systems.
    
    Features:
    - Real-time budget tracking
    - Automatic model downgrading
    - Cost forecasting
    - Alerting
    """
    
    def __init__(self, budget: Optional[Budget] = None):
        self.budget = budget or Budget()
        self.records: List[CostRecord] = []
        self._daily_reset = datetime.now().replace(hour=0, minute=0, second=0)
        self._hourly_reset = datetime.now().replace(minute=0, second=0)
    
    @property
    def spent_today(self) -> float:
        """Total spent today"""
        cutoff = datetime.now().replace(hour=0, minute=0, second=0)
        return sum(r.cost_usd for r in self.records if r.timestamp >= cutoff)
    
    @property
    def spent_this_hour(self) -> float:
        """Total spent this hour"""
        cutoff = datetime.now().replace(minute=0, second=0)
        return sum(r.cost_usd for r in self.records if r.timestamp >= cutoff)
    
    @property
    def daily_utilization(self) -> float:
        """Percentage of daily budget used"""
        return (self.spent_today / self.budget.daily_limit_usd) * 100
    
    @property
    def budget_status(self) -> str:
        """Current budget status"""
        util = self.daily_utilization
        if util >= self.budget.critical_at_percent:
            return "CRITICAL"
        elif util >= self.budget.warn_at_percent:
            return "WARNING"
        return "OK"
    
    def record_cost(
        self,
        model: str,
        operation: str,
        input_tokens: int,
        output_tokens: int,
        cost_usd: float,
        **metadata
    ):
        """Record a cost event"""
        record = CostRecord(
            timestamp=datetime.now(),
            model=model,
            operation=operation,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost_usd,
            metadata=metadata
        )
        self.records.append(record)
        
        # Check alerts
        if self.daily_utilization >= self.budget.critical_at_percent:
            logger.warning(f"🚨 BUDGET CRITICAL: {self.daily_utilization:.1f}% used")
        elif self.daily_utilization >= self.budget.warn_at_percent:
            logger.warning(f"⚠️ Budget warning: {self.daily_utilization:.1f}% used")
    
    def can_afford(self, estimated_cost: float) -> bool:
        """Check if we can afford an operation"""
        if self.budget.policy == BudgetPolicy.UNLIMITED:
            return True
        
        # Check per-request limit
        if estimated_cost > self.budget.per_request_limit_usd:
            if self.budget.policy == BudgetPolicy.STRICT:
                return False
        
        # Check daily limit
        if self.spent_today + estimated_cost > self.budget.daily_limit_usd:
            if self.budget.policy in [BudgetPolicy.STRICT, BudgetPolicy.ADAPTIVE]:
                return False
        
        # Check hourly limit
        if self.spent_this_hour + estimated_cost > self.budget.hourly_limit_usd:
            if self.budget.policy == BudgetPolicy.STRICT:
                return False
        
        return True
    
    def suggest_downgrade(self, current_model: str) -> Optional[str]:
        """Suggest a cheaper model if budget is tight"""
        if self.budget.policy != BudgetPolicy.ADAPTIVE:
            return None
        
        if self.daily_utilization < self.budget.warn_at_percent:
            return None
        
        # Model downgrade paths
        downgrades = {
            "claude-3-5-sonnet": "claude-3-haiku",
            "gpt-4o": "gpt-4o-mini",
            "gemini-2.0-flash-thinking": "gemini-2.0-flash",
            "llama-3.1-70b": "qwen-2.5-72b",
        }
        
        return downgrades.get(current_model)
    
    def forecast_daily_spend(self) -> float:
        """Forecast total daily spend based on current rate"""
        now = datetime.now()
        hours_elapsed = now.hour + now.minute / 60
        
        if hours_elapsed < 1:
            return self.spent_today
        
        hourly_rate = self.spent_today / hours_elapsed
        return hourly_rate * 24
    
    def get_summary(self) -> Dict:
        """Get cost summary"""
        return {
            "budget": {
                "daily_limit": self.budget.daily_limit_usd,
                "hourly_limit": self.budget.hourly_limit_usd,
                "policy": self.budget.policy.value,
            },
            "usage": {
                "spent_today": round(self.spent_today, 4),
                "spent_this_hour": round(self.spent_this_hour, 4),
                "daily_utilization_pct": round(self.daily_utilization, 1),
                "forecasted_daily": round(self.forecast_daily_spend(), 4),
            },
            "status": self.budget_status,
            "records_today": len([r for r in self.records if r.timestamp >= self._daily_reset]),
        }
    
    def get_model_breakdown(self) -> Dict[str, float]:
        """Get cost breakdown by model"""
        cutoff = datetime.now().replace(hour=0, minute=0, second=0)
        breakdown = {}
        
        for record in self.records:
            if record.timestamp >= cutoff:
                breakdown[record.model] = breakdown.get(record.model, 0) + record.cost_usd
        
        return breakdown

