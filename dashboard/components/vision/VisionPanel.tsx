"use client";

import { Eye, Cpu, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { VisionAnalysis } from "@/types/aegis";

interface VisionPanelProps {
  analysis: VisionAnalysis | null;
}

function ConfidenceMeter({ score }: { score: number }) {
  const percentage = score * 100;
  const color =
    percentage >= 80
      ? "text-emerald-400"
      : percentage >= 60
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            percentage >= 80
              ? "bg-emerald-500"
              : percentage >= 60
              ? "bg-amber-500"
              : "bg-rose-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`font-mono text-sm font-bold ${color}`}>
        {percentage.toFixed(1)}%
      </span>
    </div>
  );
}

function DamageIndicator({ level }: { level: string }) {
  const config = {
    minimal: { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "MINIMAL" },
    moderate: { color: "text-amber-400", bg: "bg-amber-500/20", label: "MODERATE" },
    severe: { color: "text-orange-400", bg: "bg-orange-500/20", label: "SEVERE" },
    catastrophic: { color: "text-rose-400", bg: "bg-rose-500/20", label: "CATASTROPHIC" },
  }[level] || { color: "text-slate-400", bg: "bg-slate-500/20", label: "UNKNOWN" };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg}`}>
      <AlertTriangle className={`w-3 h-3 ${config.color}`} />
      <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
    </div>
  );
}

export default function VisionPanel({ analysis }: VisionPanelProps) {
  if (!analysis) {
    return (
      <div className="vision-panel glass-strong rounded-xl p-4 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-sm">VISION PROCESSING</span>
        </div>

        <div className="h-[calc(100%-2rem)] flex flex-col items-center justify-center text-center text-slate-500">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
            <Eye className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-sm">No Vision Analysis Active</p>
          <p className="text-xs mt-1 max-w-[200px]">
            Attach satellite imagery or provide image URL to enable visual analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vision-panel glass-strong rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 ops-pulse" />
          <span className="font-semibold text-sm">VISION ANALYSIS</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {new Date(analysis.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Model Info */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 mb-4">
        <Cpu className="w-4 h-4 text-violet-400" />
        <div className="flex-1">
          <div className="text-xs font-medium text-violet-300">
            {analysis.modelId}
          </div>
          <div className="text-[10px] text-slate-500">Featherless Vision Model</div>
        </div>
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      </div>

      {/* Damage Level */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-2">DAMAGE ASSESSMENT</div>
        <DamageIndicator level={analysis.damageLevel} />
      </div>

      {/* Confidence Score */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-2">CONFIDENCE SCORE</div>
        <ConfidenceMeter score={analysis.confidenceScore} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-slate-900/50">
          <div className="text-lg font-bold font-mono text-rose-400">
            {analysis.infrastructureDamage}%
          </div>
          <div className="text-[10px] text-slate-500">Infrastructure Damage</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/50">
          <div className="text-lg font-bold font-mono text-emerald-400">
            {analysis.accessibilityScore}%
          </div>
          <div className="text-[10px] text-slate-500">Accessibility Score</div>
        </div>
      </div>

      {/* Findings */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <Target className="w-3 h-3" />
          KEY FINDINGS
        </div>
        <div className="space-y-1">
          {analysis.findings.map((finding, i) => (
            <div
              key={i}
              className="text-xs text-slate-300 flex items-start gap-2 p-2 rounded bg-slate-900/30"
            >
              <span className="text-emerald-400">•</span>
              {finding}
            </div>
          ))}
        </div>
      </div>

      {/* Priority Zones */}
      {analysis.rescuePriorityZones.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            RESCUE PRIORITY ZONES
          </div>
          <div className="flex flex-wrap gap-1">
            {analysis.rescuePriorityZones.map((zone, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30"
              >
                {zone}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

