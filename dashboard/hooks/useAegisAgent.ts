"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  AgentMessage,
  Zone,
  ToolExecution,
  VisionAnalysis,
  CrisisStats,
  AgentState,
  WSEvent,
} from "@/types/aegis";

// Mock data for demonstration
const MOCK_ZONES: Zone[] = [
  {
    id: "zone-1",
    name: "Jakarta Flooding",
    coordinates: { lat: -6.2088, lon: 106.8456 },
    type: "flood",
    severity: "critical",
    population: 500000,
    status: "active",
    timestamp: new Date().toISOString(),
  },
  {
    id: "zone-2",
    name: "California Wildfire",
    coordinates: { lat: 34.0522, lon: -118.2437 },
    type: "fire",
    severity: "high",
    population: 75000,
    status: "active",
    timestamp: new Date().toISOString(),
  },
  {
    id: "zone-3",
    name: "Tokyo Earthquake Zone",
    coordinates: { lat: 35.6762, lon: 139.6503 },
    type: "earthquake",
    severity: "moderate",
    population: 200000,
    status: "contained",
    timestamp: new Date().toISOString(),
  },
  {
    id: "zone-4",
    name: "Miami Hurricane Path",
    coordinates: { lat: 25.7617, lon: -80.1918 },
    type: "hurricane",
    severity: "high",
    population: 150000,
    status: "active",
    timestamp: new Date().toISOString(),
  },
];

const INITIAL_STATS: CrisisStats = {
  activeWildfires: 12,
  floodGaugeLevel: 78,
  reliefProgress: 34,
  populationAffected: 925000,
  resourcesDeployed: 1247,
  agentsActive: 3,
};

interface UseAegisAgentReturn {
  messages: AgentMessage[];
  zones: Zone[];
  stats: CrisisStats;
  agents: AgentState[];
  currentTool: ToolExecution | null;
  visionAnalysis: VisionAnalysis | null;
  isConnected: boolean;
  isProcessing: boolean;
  sendMessage: (content: string) => void;
  clearMessages: () => void;
}

export function useAegisAgent(): UseAegisAgentReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [zones, setZones] = useState<Zone[]>(MOCK_ZONES);
  const [stats, setStats] = useState<CrisisStats>(INITIAL_STATS);
  const [currentTool, setCurrentTool] = useState<ToolExecution | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<VisionAnalysis | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>([
    { name: "Watchman", status: "idle", model: "claude-3-5-sonnet" },
    { name: "Vision Specialist", status: "idle", model: "gemini-2.0-flash" },
    { name: "Climate Analyst", status: "idle", model: "claude-3-5-sonnet" },
  ]);

  const messageIdRef = useRef(0);

  const generateId = () => {
    messageIdRef.current += 1;
    return `msg-${messageIdRef.current}-${Date.now()}`;
  };

  // Simulate agent response with streaming
  const simulateAgentResponse = useCallback(async (userMessage: string) => {
    setIsProcessing(true);

    // Update Watchman to thinking
    setAgents((prev) =>
      prev.map((a) =>
        a.name === "Watchman" ? { ...a, status: "thinking", currentTask: "Analyzing alert..." } : a
      )
    );

    await delay(500);

    // Watchman initial response
    const watchmanMsg: AgentMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      agent: "Watchman",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, watchmanMsg]);

    // Stream Watchman response
    const watchmanResponse = `🔍 **ALERT RECEIVED**\n\nAnalyzing: "${userMessage.substring(0, 50)}..."\n\n**Triage Assessment:**\n- Disaster Type: Detected\n- Location: Parsing coordinates\n- Severity: Evaluating...\n\n➤ Routing to Climate Analyst for resource calculation.`;

    await streamText(watchmanMsg.id, watchmanResponse);

    // Tool execution for DAuth
    const toolExec: ToolExecution = {
      id: `tool-${Date.now()}`,
      name: "NASA FIRMS API",
      status: "executing",
      provider: "NASA FIRMS",
    };
    setCurrentTool(toolExec);
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "tool",
        content: `🔧 Authenticating with NASA FIRMS...`,
        timestamp: new Date().toISOString(),
        toolCall: toolExec,
      },
    ]);

    await delay(1500);
    setCurrentTool({ ...toolExec, status: "completed", duration: 1.2 });

    // Update to Climate Analyst
    setAgents((prev) =>
      prev.map((a) => {
        if (a.name === "Watchman") return { ...a, status: "idle", currentTask: undefined };
        if (a.name === "Climate Analyst")
          return { ...a, status: "thinking", currentTask: "Calculating resources..." };
        return a;
      })
    );

    await delay(800);

    // Climate Analyst tool calls
    const supplyTool: ToolExecution = {
      id: `tool-${Date.now()}`,
      name: "calculate_supply_needs",
      status: "executing",
      provider: "Relief Ops MCP",
    };
    setCurrentTool(supplyTool);

    await delay(1200);
    setCurrentTool({ ...supplyTool, status: "completed", duration: 1.1 });

    // Climate Analyst response
    const analystMsg: AgentMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      agent: "Climate Analyst",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, analystMsg]);

    const analystResponse = `📊 **CRISIS ANALYSIS COMPLETE**\n\n**Resource Requirements:**\n- Water: 42M liters\n- Medical Kits: 25,000\n- Shelters: 8,500 units\n\n**Logistics:**\n- Cargo Flights: 45\n- Truck Convoys: 120\n- Est. Cost: $12.4M\n\n**Priority Zones Updated** ✓\n\n_Full Crisis Action Report generated._`;

    await streamText(analystMsg.id, analystResponse);

    // Update stats
    setStats((prev) => ({
      ...prev,
      reliefProgress: prev.reliefProgress + 5,
      resourcesDeployed: prev.resourcesDeployed + 150,
    }));

    // Reset agents
    setAgents((prev) =>
      prev.map((a) => ({ ...a, status: "idle", currentTask: undefined }))
    );

    setIsProcessing(false);
    setCurrentTool(null);
  }, []);

  const streamText = async (msgId: string, fullText: string) => {
    const words = fullText.split(" ");
    let current = "";

    for (let i = 0; i < words.length; i++) {
      current += (i === 0 ? "" : " ") + words[i];
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: current } : m))
      );
      await delay(30 + Math.random() * 20);
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isStreaming: false } : m))
    );
  };

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || isProcessing) return;

      const userMsg: AgentMessage = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      simulateAgentResponse(content);
    },
    [isProcessing, simulateAgentResponse]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Simulate periodic zone updates
  useEffect(() => {
    const interval = setInterval(() => {
      setZones((prev) =>
        prev.map((zone) => ({
          ...zone,
          // Randomly update severity occasionally
          severity:
            Math.random() > 0.95
              ? (["low", "moderate", "high", "critical"] as const)[
                  Math.floor(Math.random() * 4)
                ]
              : zone.severity,
        }))
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return {
    messages,
    zones,
    stats,
    agents,
    currentTool,
    visionAnalysis,
    isConnected,
    isProcessing,
    sendMessage,
    clearMessages,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

