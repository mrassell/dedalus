"use client";

import { useEffect, useRef, useState } from "react";
import type { Zone } from "@/types/aegis";

interface GlobeViewProps {
  zones: Zone[];
  onZoneSelect?: (zone: Zone) => void;
}

// Dynamic marker component for zones
function ZoneMarker({ zone, onClick }: { zone: Zone; onClick?: () => void }) {
  const getMarkerColor = () => {
    switch (zone.type) {
      case "fire":
        return "#f43f5e"; // Rose
      case "flood":
        return "#3b82f6"; // Blue
      case "earthquake":
        return "#f59e0b"; // Amber
      case "hurricane":
        return "#8b5cf6"; // Violet
      case "tsunami":
        return "#06b6d4"; // Cyan
      default:
        return "#10b981"; // Emerald
    }
  };

  const getSeverityScale = () => {
    switch (zone.severity) {
      case "catastrophic":
        return 1.5;
      case "critical":
        return 1.3;
      case "high":
        return 1.1;
      case "moderate":
        return 0.9;
      default:
        return 0.7;
    }
  };

  const color = getMarkerColor();
  const scale = getSeverityScale();
  const isActive = zone.status === "active";

  return (
    <div
      className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
      style={{
        left: `${((zone.coordinates.lon + 180) / 360) * 100}%`,
        top: `${((90 - zone.coordinates.lat) / 180) * 100}%`,
      }}
      onClick={onClick}
    >
      {/* Pulse ring for active zones */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: color,
            opacity: 0.3,
            width: `${24 * scale}px`,
            height: `${24 * scale}px`,
            marginLeft: `-${12 * scale}px`,
            marginTop: `-${12 * scale}px`,
          }}
        />
      )}

      {/* Main marker */}
      <div
        className="relative rounded-full flex items-center justify-center transition-transform hover:scale-125"
        style={{
          backgroundColor: color,
          width: `${16 * scale}px`,
          height: `${16 * scale}px`,
          boxShadow: `0 0 ${12 * scale}px ${color}`,
        }}
      >
        <span className="text-xs">
          {zone.type === "fire" && "🔥"}
          {zone.type === "flood" && "🌊"}
          {zone.type === "earthquake" && "🏚️"}
          {zone.type === "hurricane" && "🌀"}
          {zone.type === "tsunami" && "🌊"}
        </span>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="glass rounded px-2 py-1 text-xs whitespace-nowrap">
          <div className="font-semibold text-white">{zone.name}</div>
          <div className="text-slate-400 text-[10px]">
            {zone.severity.toUpperCase()} • {zone.population.toLocaleString()} affected
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GlobeView({ zones, onZoneSelect }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-rotate the globe
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 0.1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-emerald-500 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Initializing Globe...
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* Starfield Background */}
      <div className="absolute inset-0">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px h-px bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.8 + 0.2,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Globe Container */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Globe */}
        <div
          className="relative rounded-full overflow-hidden"
          style={{
            width: "min(80vw, 80vh)",
            height: "min(80vw, 80vh)",
            background: `
              radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              linear-gradient(135deg, #0f172a 0%, #020617 100%)
            `,
            boxShadow: `
              inset -20px -20px 60px rgba(0, 0, 0, 0.5),
              inset 10px 10px 40px rgba(16, 185, 129, 0.1),
              0 0 100px rgba(16, 185, 129, 0.15),
              0 0 200px rgba(16, 185, 129, 0.05)
            `,
            transform: `rotateY(${rotation}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Grid Lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100">
            {/* Latitude lines */}
            {[20, 40, 60, 80].map((y) => (
              <ellipse
                key={`lat-${y}`}
                cx="50"
                cy={y}
                rx={50 * Math.sin((Math.PI * y) / 100)}
                ry="2"
                fill="none"
                stroke="#10b981"
                strokeWidth="0.3"
              />
            ))}
            {/* Longitude lines */}
            {[0, 30, 60, 90, 120, 150].map((angle) => (
              <ellipse
                key={`lon-${angle}`}
                cx="50"
                cy="50"
                rx="2"
                ry="50"
                fill="none"
                stroke="#10b981"
                strokeWidth="0.3"
                transform={`rotate(${angle} 50 50)`}
              />
            ))}
          </svg>

          {/* Continents (simplified) */}
          <div className="absolute inset-0 opacity-30">
            <svg viewBox="0 0 360 180" className="w-full h-full">
              {/* North America */}
              <path
                d="M60,30 Q90,25 110,45 Q115,60 100,70 Q85,75 70,65 Q55,55 60,30"
                fill="#10b981"
                fillOpacity="0.4"
              />
              {/* Europe */}
              <path
                d="M170,35 Q190,30 200,40 Q205,50 195,55 Q180,55 170,45 Z"
                fill="#10b981"
                fillOpacity="0.4"
              />
              {/* Asia */}
              <path
                d="M200,35 Q250,25 280,45 Q290,65 270,80 Q240,85 210,70 Q195,55 200,35"
                fill="#10b981"
                fillOpacity="0.4"
              />
              {/* Africa */}
              <path
                d="M170,70 Q185,65 190,80 Q195,110 175,120 Q160,115 165,90 Q165,75 170,70"
                fill="#10b981"
                fillOpacity="0.4"
              />
              {/* South America */}
              <path
                d="M90,90 Q105,85 110,100 Q115,130 95,140 Q80,135 85,110 Q85,95 90,90"
                fill="#10b981"
                fillOpacity="0.4"
              />
              {/* Australia */}
              <path
                d="M260,110 Q280,105 285,115 Q285,125 270,130 Q255,125 260,110"
                fill="#10b981"
                fillOpacity="0.4"
              />
            </svg>
          </div>

          {/* Zone Markers */}
          <div className="absolute inset-0">
            {zones.map((zone) => (
              <ZoneMarker
                key={zone.id}
                zone={zone}
                onClick={() => onZoneSelect?.(zone)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Overlay HUD Elements */}
      <div className="absolute top-4 left-4 glass rounded-lg p-3">
        <div className="text-xs text-slate-400 mb-1">GLOBAL OVERVIEW</div>
        <div className="text-lg font-mono text-emerald-400">
          {zones.filter((z) => z.status === "active").length} ACTIVE ZONES
        </div>
      </div>

      <div className="absolute top-4 right-4 glass rounded-lg p-3">
        <div className="text-xs text-slate-400 mb-1">COVERAGE</div>
        <div className="text-lg font-mono text-emerald-400">87.3%</div>
      </div>

      {/* Zone Legend */}
      <div className="absolute bottom-4 left-4 glass rounded-lg p-3">
        <div className="text-xs text-slate-400 mb-2">ZONE TYPES</div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Wildfire</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Flood</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Earthquake</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <span>Hurricane</span>
          </div>
        </div>
      </div>

      {/* Coordinates Display */}
      <div className="absolute bottom-4 right-4 glass rounded-lg p-3">
        <div className="text-xs text-slate-400 mb-1">FOCUS</div>
        <div className="font-mono text-xs text-slate-300">
          {zones[0] && `${zones[0].coordinates.lat.toFixed(4)}°, ${zones[0].coordinates.lon.toFixed(4)}°`}
        </div>
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

