"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface HoloPanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "default" | "critical" | "info";
  glowing?: boolean;
}

export default function HoloPanel({
  title,
  icon,
  children,
  className = "",
  variant = "default",
  glowing = false,
}: HoloPanelProps) {
  const variantStyles = {
    default: {
      border: "border-emerald-500/30",
      glow: "shadow-emerald-500/20",
      accent: "text-emerald-400",
      bg: "from-emerald-500/5 to-transparent",
    },
    critical: {
      border: "border-rose-500/30",
      glow: "shadow-rose-500/20",
      accent: "text-rose-400",
      bg: "from-rose-500/5 to-transparent",
    },
    info: {
      border: "border-blue-500/30",
      glow: "shadow-blue-500/20",
      accent: "text-blue-400",
      bg: "from-blue-500/5 to-transparent",
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`
        relative overflow-hidden rounded-lg
        border ${styles.border}
        bg-gradient-to-br ${styles.bg}
        backdrop-blur-xl
        ${glowing ? `shadow-lg ${styles.glow}` : ""}
        ${className}
      `}
    >
      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Corner accents */}
      <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${styles.border}`} />
      <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${styles.border}`} />
      <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${styles.border}`} />
      <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${styles.border}`} />

      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2 border-b ${styles.border} bg-slate-900/50`}>
        {icon && <span className={styles.accent}>{icon}</span>}
        <span className={`font-mono text-xs font-semibold tracking-wider ${styles.accent}`}>
          {title}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-slate-500 font-mono">LIVE</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

// Hexagonal HUD element
export function HexBadge({
  value,
  label,
  variant = "default",
}: {
  value: string | number;
  label: string;
  variant?: "default" | "critical" | "warning";
}) {
  const colors = {
    default: "text-emerald-400 border-emerald-500/30",
    critical: "text-rose-400 border-rose-500/30",
    warning: "text-amber-400 border-amber-500/30",
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          relative w-16 h-14 flex items-center justify-center
          border ${colors[variant]}
          bg-slate-900/50
        `}
        style={{
          clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
        }}
      >
        <span className={`font-mono text-lg font-bold ${colors[variant].split(" ")[0]}`}>
          {value}
        </span>
      </div>
      <span className="text-[10px] text-slate-500 mt-1 font-mono">{label}</span>
    </div>
  );
}

