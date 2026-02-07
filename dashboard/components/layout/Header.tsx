"use client";

import { Shield, Wifi, WifiOff, Bell, Settings, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  isConnected: boolean;
}

export default function Header({ isConnected }: HeaderProps) {
  return (
    <header className="h-14 border-b border-slate-800/50 glass-strong flex items-center justify-between px-4 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide flex items-center gap-2">
            AEGIS-1
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-normal">
              v2.0
            </span>
          </h1>
          <p className="text-[10px] text-slate-500">Mission Control Center</p>
        </div>
      </div>

      {/* Center - Status */}
      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400">CONNECTED</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-rose-400" />
              <span className="text-xs text-rose-400">DISCONNECTED</span>
            </>
          )}
        </div>

        <div className="h-4 w-px bg-slate-700" />

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-400">3 Agents Active</span>
        </div>

        <div className="h-4 w-px bg-slate-700" />

        <div className="text-xs text-slate-500 font-mono">
          {new Date().toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
        </Button>
        <Button variant="ghost" size="icon">
          <Moon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="w-4 h-4" />
        </Button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-xs font-bold ml-2">
          OP
        </div>
      </div>
    </header>
  );
}

