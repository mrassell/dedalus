// Aegis-1 Type Definitions

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Zone {
  id: string;
  name: string;
  coordinates: Coordinates;
  type: "fire" | "flood" | "earthquake" | "hurricane" | "tsunami";
  severity: "low" | "moderate" | "high" | "critical" | "catastrophic";
  population: number;
  status: "active" | "contained" | "resolved";
  timestamp: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
  agent?: string;
  toolCall?: ToolExecution;
  isStreaming?: boolean;
}

export interface ToolExecution {
  id: string;
  name: string;
  status: "pending" | "executing" | "completed" | "failed";
  provider: string; // e.g., "Google Maps", "NASA FIRMS", "Featherless"
  arguments?: Record<string, unknown>;
  result?: unknown;
  duration?: number;
}

export interface VisionAnalysis {
  id: string;
  modelId: string;
  imageUrl: string;
  timestamp: string;
  damageLevel: "minimal" | "moderate" | "severe" | "catastrophic";
  confidenceScore: number;
  findings: string[];
  infrastructureDamage: number;
  accessibilityScore: number;
  rescuePriorityZones: string[];
}

export interface CrisisStats {
  activeWildfires: number;
  floodGaugeLevel: number; // percentage
  reliefProgress: number; // percentage
  populationAffected: number;
  resourcesDeployed: number;
  agentsActive: number;
}

export interface DAuthIntent {
  id: string;
  action: string;
  provider: string;
  permissions: string[];
  timestamp: string;
  status: "pending" | "approved" | "denied";
  expiresAt?: string;
}

export interface AgentState {
  name: string;
  status: "idle" | "thinking" | "executing" | "streaming";
  currentTask?: string;
  model: string;
}

// WebSocket Event Types
export type WSEventType = 
  | "agent_start"
  | "agent_thinking"
  | "text_delta"
  | "tool_call"
  | "tool_result"
  | "handoff"
  | "zone_update"
  | "vision_result"
  | "complete"
  | "error";

export interface WSEvent {
  type: WSEventType;
  agent: string;
  data: unknown;
  timestamp: string;
}

