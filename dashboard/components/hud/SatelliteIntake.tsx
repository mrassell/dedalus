"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Satellite, Eye, Cpu, Target } from "lucide-react";
import HoloPanel from "./HoloPanel";
import MatrixText, { MatrixRain } from "./MatrixText";

interface VisionResult {
  id: string;
  timestamp: string;
  modelId: string;
  imageType: string;
  findings: string[];
  confidence: number;
  damageLevel: string;
}

interface SatelliteIntakeProps {
  className?: string;
}

// Mock vision analysis feed
const MOCK_ANALYSES: Omit<VisionResult, "id" | "timestamp">[] = [
  {
    modelId: "Llama-3.2-90B-Vision",
    imageType: "VIIRS Satellite",
    findings: [
      "FLOOD_DETECTED: Sector 7 - Water level +2.3m",
      "INFRASTRUCTURE: 34% road coverage compromised",
      "POPULATION: ~12,000 in affected zone",
    ],
    confidence: 0.94,
    damageLevel: "SEVERE",
  },
  {
    modelId: "Gemini-2.0-Flash",
    imageType: "Drone Aerial",
    findings: [
      "FIRE_PERIMETER: 2.4km radius expanding NW",
      "STRUCTURES: 47 buildings in immediate path",
      "EVACUATION: Route B-7 still accessible",
    ],
    confidence: 0.89,
    damageLevel: "CRITICAL",
  },
  {
    modelId: "GPT-4o-Vision",
    imageType: "Ground Camera",
    findings: [
      "RESCUE_NEEDED: 3 individuals spotted on rooftop",
      "WATER_DEPTH: Estimated 1.8m at street level",
      "ACCESS: Boat required for extraction",
    ],
    confidence: 0.97,
    damageLevel: "HIGH",
  },
];

export default function SatelliteIntake({ className = "" }: SatelliteIntakeProps) {
  const [analyses, setAnalyses] = useState<VisionResult[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<VisionResult | null>(null);
  const [logLines, setLogLines] = useState<string[]>([
    "SYSTEM INITIALIZED",
    "CONNECTING TO FEATHERLESS API...",
    "VISION MODELS ONLINE",
  ]);

  // Simulate incoming vision analyses
  useEffect(() => {
    const interval = setInterval(() => {
      const mock = MOCK_ANALYSES[Math.floor(Math.random() * MOCK_ANALYSES.length)];
      const analysis: VisionResult = {
        ...mock,
        id: `va-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      setAnalyses((prev) => [analysis, ...prev.slice(0, 4)]);
      setCurrentAnalysis(analysis);

      // Add to log
      setLogLines((prev) => [
        ...prev,
        `[${analysis.modelId}] Processing ${analysis.imageType}...`,
        ...analysis.findings.map((f) => `  ${f}`),
        `CONFIDENCE: ${(analysis.confidence * 100).toFixed(1)}%`,
        "---",
      ]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const getDamageColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "text-rose-400 bg-rose-500/20";
      case "SEVERE":
        return "text-orange-400 bg-orange-500/20";
      case "HIGH":
        return "text-amber-400 bg-amber-500/20";
      default:
        return "text-emerald-400 bg-emerald-500/20";
    }
  };

  return (
    <HoloPanel
      title="SATELLITE INTAKE"
      icon={<Satellite className="w-4 h-4" />}
      className={className}
      glowing
    >
      <div className="relative h-full min-h-[300px]">
        {/* Matrix background */}
        <MatrixRain className="rounded-lg" />

        <div className="relative z-10 space-y-4">
          {/* Current Analysis */}
          <AnimatePresence mode="wait">
            {currentAnalysis && (
              <motion.div
                key={currentAnalysis.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-3 rounded-lg border border-emerald-500/20 bg-slate-900/70"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3 h-3 text-violet-400" />
                    <span className="text-xs font-mono text-violet-400">
                      {currentAnalysis.modelId}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${getDamageColor(
                      currentAnalysis.damageLevel
                    )}`}
                  >
                    {currentAnalysis.damageLevel}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500">
                    {currentAnalysis.imageType}
                  </span>
                </div>

                {/* Confidence bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-500">CONFIDENCE</span>
                    <span className="text-emerald-400 font-mono">
                      {(currentAnalysis.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentAnalysis.confidence * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </div>

                {/* Findings */}
                <div className="space-y-1">
                  {currentAnalysis.findings.map((finding, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-2 text-[10px]"
                    >
                      <Target className="w-2 h-2 text-emerald-400 mt-1 flex-shrink-0" />
                      <span className="text-slate-300 font-mono">{finding}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Log feed */}
          <div className="h-32">
            <MatrixText
              lines={logLines}
              speed={30}
              maxLines={8}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </HoloPanel>
  );
}

