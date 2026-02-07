"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Shield, Radio, Satellite, Truck, AlertTriangle } from "lucide-react";

import { useGesture } from "@/hooks/useGesture";
import { useAegisAgent } from "@/hooks/useAegisAgent";
import ArcReactor from "@/components/hud/ArcReactor";
import SatelliteIntake from "@/components/hud/SatelliteIntake";
import LogisticsQueue from "@/components/hud/LogisticsQueue";
import DAuthBar from "@/components/hud/DAuthBar";
import VoiceCommand from "@/components/hud/VoiceCommand";
import CommandCenter from "@/components/command/CommandCenter";
import HoloPanel, { HexBadge } from "@/components/hud/HoloPanel";

// Dynamic import for Globe (no SSR)
const HoloGlobe = dynamic(() => import("@/components/globe/HoloGlobe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-emerald-400 font-mono text-sm animate-pulse">
        INITIALIZING HOLOGRAPHIC DISPLAY...
      </div>
    </div>
  ),
});

export default function JarvisPage() {
  const gesture = useGesture();
  const aegis = useAegisAgent();
  const [showChat, setShowChat] = useState(false);
  const [bootSequence, setBootSequence] = useState(true);

  // Boot sequence animation
  useEffect(() => {
    const timer = setTimeout(() => setBootSequence(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Boot sequence overlay
  if (bootSequence) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <ArcReactor isSpeaking={false} isListening={false} size={150} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <h1 className="text-2xl font-mono text-emerald-400 mb-2">AEGIS-1</h1>
            <p className="text-sm text-slate-500 font-mono">Mission Control System</p>
          </motion.div>

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 1, duration: 2 }}
            className="h-1 bg-emerald-500 mt-8 rounded-full"
            style={{ maxWidth: 300 }}
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-xs text-slate-600 mt-4 font-mono"
          >
            INITIALIZING SYSTEMS...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 overflow-hidden flex flex-col">
      {/* Top Status Bar */}
      <header className="h-12 border-b border-emerald-500/20 glass flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-mono text-sm font-bold text-emerald-400">AEGIS-1</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                gesture.isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`}
            />
            <span className="text-xs font-mono text-slate-400">
              {gesture.isConnected ? "GESTURE LINK ACTIVE" : "GESTURE LINK OFFLINE"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Live stats */}
          <div className="flex items-center gap-4">
            <HexBadge value={aegis.zones.length} label="ZONES" />
            <HexBadge
              value={aegis.zones.filter((z) => z.status === "active").length}
              label="ACTIVE"
              variant="critical"
            />
            <HexBadge value={aegis.stats.agentsActive} label="AGENTS" />
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Time */}
          <div className="text-xs font-mono text-slate-500">
            {new Date().toLocaleTimeString("en-US", { hour12: false })} UTC
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Satellite Intake */}
        <motion.aside
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          className="w-80 flex-shrink-0 p-3 flex flex-col gap-3 border-r border-emerald-500/10"
        >
          <SatelliteIntake className="flex-1" />
        </motion.aside>

        {/* Center - Globe */}
        <div className="flex-1 relative">
          <HoloGlobe
            camera={gesture.camera}
            markers={gesture.markers}
            className="w-full h-full"
          />

          {/* Center overlay - Arc Reactor + Voice */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
          >
            <ArcReactor
              isSpeaking={gesture.isSpeaking}
              isListening={gesture.isListening}
              size={100}
            />
            <VoiceCommand
              isListening={gesture.isListening}
              isSpeaking={gesture.isSpeaking}
              onStartListening={gesture.startListening}
              onStopListening={gesture.stopListening}
              className="glass rounded-full px-4 py-2"
            />
          </motion.div>

          {/* Alerts overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2">
            <AnimatePresence>
              {gesture.alerts.slice(0, 3).map((alert, i) => (
                <motion.div
                  key={alert.timestamp}
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className={`
                    px-4 py-2 rounded-lg border backdrop-blur-xl flex items-center gap-2
                    ${
                      alert.level === "critical"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        : alert.level === "warning"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    }
                  `}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-mono">{alert.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Current tool execution */}
          <AnimatePresence>
            {gesture.currentTool && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-4 right-4 glass rounded-lg px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="text-xs font-mono text-amber-400">
                    {gesture.currentTool.tool}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{gesture.currentTool.status}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat toggle */}
          <motion.button
            onClick={() => setShowChat(!showChat)}
            className="absolute top-4 left-4 glass rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-300">
              {showChat ? "HIDE COMMS" : "SHOW COMMS"}
            </span>
          </motion.button>

          {/* Floating Chat Panel */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ opacity: 0, x: -100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, scale: 0.9 }}
                className="absolute top-16 left-4 w-96 h-[60vh]"
              >
                <CommandCenter
                  messages={aegis.messages}
                  agents={aegis.agents}
                  currentTool={aegis.currentTool}
                  isProcessing={aegis.isProcessing}
                  onSendMessage={aegis.sendMessage}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Logistics */}
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          className="w-80 flex-shrink-0 p-3 flex flex-col gap-3 border-l border-emerald-500/10"
        >
          <LogisticsQueue className="flex-1" currentTool={gesture.currentTool} />

          {/* Quick Stats */}
          <HoloPanel
            title="CRISIS METRICS"
            icon={<Satellite className="w-4 h-4" />}
            className="flex-shrink-0"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-slate-900/50">
                <div className="text-lg font-mono font-bold text-rose-400">
                  {aegis.stats.activeWildfires}
                </div>
                <div className="text-[10px] text-slate-500">ACTIVE FIRES</div>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <div className="text-lg font-mono font-bold text-blue-400">
                  {aegis.stats.floodGaugeLevel}%
                </div>
                <div className="text-[10px] text-slate-500">FLOOD LEVEL</div>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <div className="text-lg font-mono font-bold text-emerald-400">
                  {aegis.stats.reliefProgress}%
                </div>
                <div className="text-[10px] text-slate-500">RELIEF PROG</div>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <div className="text-lg font-mono font-bold text-amber-400">
                  {(aegis.stats.populationAffected / 1000).toFixed(0)}K
                </div>
                <div className="text-[10px] text-slate-500">POP AFFECTED</div>
              </div>
            </div>
          </HoloPanel>
        </motion.aside>
      </main>

      {/* Bottom - DAuth Bar */}
      <DAuthBar />
    </div>
  );
}

