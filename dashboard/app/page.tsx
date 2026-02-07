"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/layout/Header";
import CommandCenter from "@/components/command/CommandCenter";
import CrisisHUD from "@/components/hud/CrisisHUD";
import VisionPanel from "@/components/vision/VisionPanel";
import DAuthModal from "@/components/auth/DAuthModal";
import { useAegisAgent } from "@/hooks/useAegisAgent";
import type { DAuthIntent, Zone } from "@/types/aegis";

// Dynamic import for Globe to avoid SSR issues with CesiumJS
const GlobeView = dynamic(() => import("@/components/globe/GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Initializing Globe...</span>
      </div>
    </div>
  ),
});

export default function MissionControl() {
  const {
    messages,
    zones,
    stats,
    agents,
    currentTool,
    visionAnalysis,
    isConnected,
    isProcessing,
    sendMessage,
  } = useAegisAgent();

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [dauthIntent, setDauthIntent] = useState<DAuthIntent | null>(null);
  const [isDauthOpen, setIsDauthOpen] = useState(false);

  // Demo DAuth intent
  const showDauthDemo = () => {
    setDauthIntent({
      id: `intent-${Date.now()}`,
      action: "fetch_satellite_imagery",
      provider: "NASA FIRMS",
      permissions: [
        "Access real-time fire data",
        "Read satellite imagery",
        "Query historical records",
      ],
      timestamp: new Date().toISOString(),
      status: "pending",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    setIsDauthOpen(true);
  };

  const handleZoneSelect = (zone: Zone) => {
    setSelectedZone(zone);
    // Auto-send a message about the selected zone
    sendMessage(`Analyze zone: ${zone.name} at coordinates ${zone.coordinates.lat}, ${zone.coordinates.lon}`);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <Header isConnected={isConnected} />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Command Center */}
        <aside className="w-96 flex-shrink-0 p-3 border-r border-slate-800/50 overflow-hidden">
          <CommandCenter
            messages={messages}
            agents={agents}
            currentTool={currentTool}
            isProcessing={isProcessing}
            onSendMessage={sendMessage}
          />
        </aside>

        {/* Center - Globe View */}
        <div className="flex-1 relative">
          <GlobeView zones={zones} onZoneSelect={handleZoneSelect} />

          {/* Floating Zone Info */}
          {selectedZone && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-strong rounded-xl p-4 min-w-[300px]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{selectedZone.name}</span>
                <button
                  onClick={() => setSelectedZone(null)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Type</div>
                  <div className="font-medium capitalize">{selectedZone.type}</div>
                </div>
                <div>
                  <div className="text-slate-500">Severity</div>
                  <div
                    className={`font-medium capitalize ${
                      selectedZone.severity === "critical"
                        ? "text-rose-400"
                        : selectedZone.severity === "high"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {selectedZone.severity}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Population</div>
                  <div className="font-medium">
                    {selectedZone.population.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Status</div>
                  <div className="font-medium capitalize">{selectedZone.status}</div>
                </div>
              </div>
            </div>
          )}

          {/* DAuth Demo Button */}
          <button
            onClick={showDauthDemo}
            className="absolute top-4 left-4 glass rounded-lg px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/5 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            Test DAuth Flow
          </button>
        </div>

        {/* Right Sidebar */}
        <aside className="w-80 flex-shrink-0 p-3 border-l border-slate-800/50 flex flex-col gap-3 overflow-y-auto">
          {/* Crisis HUD */}
          <CrisisHUD stats={stats} />

          {/* Vision Panel */}
          <VisionPanel analysis={visionAnalysis} />
        </aside>
      </main>

      {/* DAuth Modal */}
      <DAuthModal
        intent={dauthIntent}
        isOpen={isDauthOpen}
        onClose={() => setIsDauthOpen(false)}
        onApprove={(id) => console.log("Approved:", id)}
        onDeny={(id) => console.log("Denied:", id)}
      />
    </div>
  );
}

