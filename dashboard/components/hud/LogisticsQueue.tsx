"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Cloud, Flame, Map, Database, CheckCircle2, Loader2 } from "lucide-react";
import HoloPanel from "./HoloPanel";

interface ToolExecution {
  id: string;
  tool: string;
  server: string;
  status: "pending" | "executing" | "completed" | "failed";
  startTime: string;
  duration?: number;
  result?: string;
}

interface LogisticsQueueProps {
  className?: string;
  currentTool?: { tool: string; status: string } | null;
}

const TOOL_ICONS: Record<string, typeof Truck> = {
  "relief-ops": Truck,
  "open-meteo": Cloud,
  "nasa-firms": Flame,
  "google-maps": Map,
  "featherless": Database,
};

const MOCK_RESULTS = [
  "Supply needs calculated: 42M liters water, 25K med kits",
  "Weather: Heavy rain expected next 48hrs",
  "12 active fires detected in sector",
  "Route optimized: ETA 4.2 hours",
  "Image analysis complete: 89% confidence",
];

export default function LogisticsQueue({ className = "", currentTool }: LogisticsQueueProps) {
  const [queue, setQueue] = useState<ToolExecution[]>([]);

  // Add current tool to queue when it changes
  useEffect(() => {
    if (currentTool) {
      const execution: ToolExecution = {
        id: `exec-${Date.now()}`,
        tool: currentTool.tool.split("__")[1] || currentTool.tool,
        server: currentTool.tool.split("__")[0] || "mcp",
        status: "executing",
        startTime: new Date().toISOString(),
      };

      setQueue((prev) => [execution, ...prev.slice(0, 7)]);

      // Complete after delay
      setTimeout(() => {
        setQueue((prev) =>
          prev.map((ex) =>
            ex.id === execution.id
              ? {
                  ...ex,
                  status: "completed",
                  duration: Math.random() * 2000 + 500,
                  result: MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)],
                }
              : ex
          )
        );
      }, 2000 + Math.random() * 1000);
    }
  }, [currentTool]);

  // Simulate additional tool executions
  useEffect(() => {
    const interval = setInterval(() => {
      const servers = Object.keys(TOOL_ICONS);
      const server = servers[Math.floor(Math.random() * servers.length)];
      const tools: Record<string, string[]> = {
        "relief-ops": ["calculate_supply_needs", "prioritize_zones", "logistics_router"],
        "open-meteo": ["get_weather", "get_forecast", "get_flood_risk"],
        "nasa-firms": ["get_active_fires", "get_fire_history"],
        "google-maps": ["calculate_route", "get_traffic"],
        featherless: ["analyze_image", "detect_flood"],
      };

      const toolList = tools[server] || ["execute"];
      const tool = toolList[Math.floor(Math.random() * toolList.length)];

      const execution: ToolExecution = {
        id: `exec-${Date.now()}`,
        tool,
        server,
        status: "executing",
        startTime: new Date().toISOString(),
      };

      setQueue((prev) => [execution, ...prev.slice(0, 7)]);

      // Complete
      setTimeout(() => {
        setQueue((prev) =>
          prev.map((ex) =>
            ex.id === execution.id
              ? {
                  ...ex,
                  status: "completed",
                  duration: Math.random() * 2000 + 500,
                  result: MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)],
                }
              : ex
          )
        );
      }, 2000 + Math.random() * 1000);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "executing":
        return <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
      case "failed":
        return <span className="text-rose-400">✗</span>;
      default:
        return <span className="text-slate-500">○</span>;
    }
  };

  return (
    <HoloPanel
      title="LOGISTICS QUEUE"
      icon={<Truck className="w-4 h-4" />}
      className={className}
      glowing
    >
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {queue.map((execution, index) => {
            const Icon = TOOL_ICONS[execution.server] || Database;

            return (
              <motion.div
                key={execution.id}
                initial={{ opacity: 0, x: 20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ duration: 0.3 }}
                className={`
                  p-2 rounded-lg border
                  ${
                    execution.status === "executing"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : execution.status === "completed"
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-slate-700/50 bg-slate-900/30"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      w-6 h-6 rounded flex items-center justify-center
                      ${
                        execution.status === "executing"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-slate-800/50 text-slate-400"
                      }
                    `}
                  >
                    <Icon className="w-3 h-3" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-300 truncate">
                        {execution.tool}
                      </span>
                      {getStatusIcon(execution.status)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{execution.server}</span>
                      {execution.duration && (
                        <span className="text-emerald-400">
                          {(execution.duration / 1000).toFixed(2)}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Result */}
                {execution.result && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 pt-2 border-t border-slate-700/30"
                  >
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      → {execution.result}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {queue.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Waiting for MCP tool calls...
          </div>
        )}
      </div>
    </HoloPanel>
  );
}

