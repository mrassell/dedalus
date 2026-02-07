"use client";

import { Flame, Droplets, Truck, Users, Package, Bot } from "lucide-react";
import type { CrisisStats } from "@/types/aegis";
import { formatNumber } from "@/lib/utils";

interface CrisisHUDProps {
  stats: CrisisStats;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  variant: "crisis" | "ops" | "warning";
  progress?: number;
}

function StatCard({ icon, label, value, subValue, variant, progress }: StatCardProps) {
  const variantClasses = {
    crisis: "stat-gradient-crisis",
    ops: "stat-gradient-ops",
    warning: "stat-gradient-warning",
  };

  const iconColors = {
    crisis: "text-rose-400",
    ops: "text-emerald-400",
    warning: "text-amber-400",
  };

  const progressColors = {
    crisis: "bg-rose-500",
    ops: "bg-emerald-500",
    warning: "bg-amber-500",
  };

  return (
    <div className={`glass rounded-lg p-4 ${variantClasses[variant]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg bg-slate-900/50 ${iconColors[variant]}`}>
          {icon}
        </div>
        {subValue && (
          <span className="text-[10px] text-slate-500 font-mono">{subValue}</span>
        )}
      </div>

      <div className="mt-2">
        <div className="text-2xl font-bold font-mono tracking-tight">
          {typeof value === "number" ? formatNumber(value) : value}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      </div>

      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColors[variant]} transition-all duration-500`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            {progress.toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
}

export default function CrisisHUD({ stats }: CrisisHUDProps) {
  return (
    <div className="glass-strong rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500 crisis-pulse" />
          <span className="font-semibold text-sm">CRISIS IMPACT HUD</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          LIVE • {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={<Flame className="w-4 h-4" />}
          label="Active Wildfires"
          value={stats.activeWildfires}
          subValue="+2 today"
          variant="crisis"
        />

        <StatCard
          icon={<Droplets className="w-4 h-4" />}
          label="Flood Gauge Level"
          value={`${stats.floodGaugeLevel}%`}
          variant="warning"
          progress={stats.floodGaugeLevel}
        />

        <StatCard
          icon={<Truck className="w-4 h-4" />}
          label="Relief Progress"
          value={`${stats.reliefProgress}%`}
          variant="ops"
          progress={stats.reliefProgress}
        />

        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Population Affected"
          value={stats.populationAffected}
          subValue="across 4 zones"
          variant="crisis"
        />

        <StatCard
          icon={<Package className="w-4 h-4" />}
          label="Resources Deployed"
          value={stats.resourcesDeployed}
          subValue="units"
          variant="ops"
        />

        <StatCard
          icon={<Bot className="w-4 h-4" />}
          label="Agents Active"
          value={stats.agentsActive}
          subValue="operational"
          variant="ops"
        />
      </div>

      {/* Alert Banner */}
      <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
          <Flame className="w-4 h-4 text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-rose-400">CRITICAL ALERT</div>
          <div className="text-xs text-slate-400 truncate">
            Jakarta flood severity upgraded to CRITICAL - Immediate response required
          </div>
        </div>
        <button className="px-3 py-1.5 rounded text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-colors flex-shrink-0">
          View
        </button>
      </div>
    </div>
  );
}

