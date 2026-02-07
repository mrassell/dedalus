"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Key, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface DAuthIntent {
  id: string;
  provider: string;
  action: string;
  status: "pending" | "signed" | "denied" | "expired";
  timestamp: string;
}

interface DAuthBarProps {
  className?: string;
}

export default function DAuthBar({ className = "" }: DAuthBarProps) {
  const [intents, setIntents] = useState<DAuthIntent[]>([]);
  const [activeIntent, setActiveIntent] = useState<DAuthIntent | null>(null);

  // Simulate DAuth intent flow
  useEffect(() => {
    const providers = [
      { provider: "NASA FIRMS", action: "fetch_satellite_data" },
      { provider: "Google Maps", action: "calculate_route" },
      { provider: "OpenMeteo", action: "get_forecast" },
      { provider: "Featherless", action: "analyze_image" },
    ];

    const interval = setInterval(() => {
      const { provider, action } = providers[Math.floor(Math.random() * providers.length)];

      const intent: DAuthIntent = {
        id: `intent-${Date.now()}`,
        provider,
        action,
        status: "pending",
        timestamp: new Date().toISOString(),
      };

      setActiveIntent(intent);

      // Auto-sign after 1 second
      setTimeout(() => {
        setActiveIntent((prev) => (prev?.id === intent.id ? { ...prev, status: "signed" } : prev));
        setIntents((prev) => [{ ...intent, status: "signed" }, ...prev.slice(0, 4)]);

        // Clear active after another second
        setTimeout(() => {
          setActiveIntent(null);
        }, 1500);
      }, 1000);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed":
        return "bg-emerald-500";
      case "pending":
        return "bg-amber-500";
      case "denied":
        return "bg-rose-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <div
      className={`
        relative h-12 border-t border-emerald-500/20
        bg-gradient-to-r from-slate-900/80 via-emerald-900/10 to-slate-900/80
        backdrop-blur-xl
        ${className}
      `}
    >
      {/* Animated border glow */}
      <motion.div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${
            activeIntent?.status === "signed" ? "#10b981" : "#3b82f6"
          }, transparent)`,
        }}
        animate={{
          opacity: activeIntent ? [0.5, 1, 0.5] : 0.3,
        }}
        transition={{ duration: 1, repeat: Infinity }}
      />

      <div className="h-full flex items-center justify-between px-4">
        {/* Left: Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield
              className={`w-4 h-4 ${
                activeIntent?.status === "signed"
                  ? "text-emerald-400"
                  : activeIntent
                  ? "text-amber-400"
                  : "text-slate-500"
              }`}
            />
            <span className="text-xs font-mono text-slate-400">DAUTH STATUS</span>
          </div>

          {/* Status bar */}
          <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${
                activeIntent?.status === "signed"
                  ? "bg-emerald-500"
                  : activeIntent
                  ? "bg-amber-500"
                  : "bg-slate-600"
              }`}
              animate={{
                width: activeIntent?.status === "signed" ? "100%" : activeIntent ? "60%" : "20%",
              }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <span
            className={`text-[10px] font-mono ${
              activeIntent?.status === "signed"
                ? "text-emerald-400"
                : activeIntent
                ? "text-amber-400"
                : "text-slate-500"
            }`}
          >
            {activeIntent?.status === "signed"
              ? "AUTHENTICATED"
              : activeIntent
              ? "SIGNING..."
              : "IDLE"}
          </span>
        </div>

        {/* Center: Active intent */}
        <AnimatePresence mode="wait">
          {activeIntent && (
            <motion.div
              key={activeIntent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3"
            >
              <Key
                className={`w-3 h-3 ${
                  activeIntent.status === "signed" ? "text-emerald-400" : "text-amber-400"
                }`}
              />
              <span className="text-xs font-mono text-slate-300">{activeIntent.provider}</span>
              <span className="text-[10px] text-slate-500">{activeIntent.action}</span>
              {activeIntent.status === "signed" ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Clock className="w-3 h-3 text-amber-400" />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: Recent intents */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">RECENT:</span>
          <div className="flex items-center gap-1">
            {intents.slice(0, 5).map((intent) => (
              <motion.div
                key={intent.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`w-2 h-2 rounded-full ${getStatusColor(intent.status)}`}
                title={`${intent.provider}: ${intent.action}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-slate-500 font-mono ml-2">
            {intents.filter((i) => i.status === "signed").length} SIGNED
          </span>
        </div>
      </div>
    </div>
  );
}

