"use client";

import { useState } from "react";
import { Shield, Key, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DAuthIntent } from "@/types/aegis";

interface DAuthModalProps {
  intent: DAuthIntent | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (intentId: string) => void;
  onDeny: (intentId: string) => void;
}

export default function DAuthModal({
  intent,
  isOpen,
  onClose,
  onApprove,
  onDeny,
}: DAuthModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!intent) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    onApprove(intent.id);
    setIsProcessing(false);
    onClose();
  };

  const handleDeny = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 300));
    onDeny(intent.id);
    setIsProcessing(false);
    onClose();
  };

  const getProviderIcon = () => {
    if (intent.provider.includes("Google")) return "🗺️";
    if (intent.provider.includes("NASA")) return "🛰️";
    if (intent.provider.includes("Featherless")) return "🤖";
    return "🔧";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-strong border-slate-700/50 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-emerald-500/20">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-lg">DAuth Intent Request</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Dedalus Authentication Standard
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Intent Details */}
        <div className="space-y-4 py-4">
          {/* Provider */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
            <span className="text-2xl">{getProviderIcon()}</span>
            <div>
              <div className="font-medium text-sm">{intent.provider}</div>
              <div className="text-xs text-slate-500">External Service Provider</div>
            </div>
          </div>

          {/* Action */}
          <div className="p-3 rounded-lg bg-slate-900/50">
            <div className="text-xs text-slate-500 mb-1">REQUESTED ACTION</div>
            <div className="font-mono text-sm text-emerald-400">{intent.action}</div>
          </div>

          {/* Permissions */}
          <div className="p-3 rounded-lg bg-slate-900/50">
            <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <Key className="w-3 h-3" />
              PERMISSIONS REQUESTED
            </div>
            <div className="space-y-1.5">
              {intent.permissions.map((perm, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-slate-300"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {perm}
                </div>
              ))}
            </div>
          </div>

          {/* Expiry */}
          {intent.expiresAt && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400">
                Expires: {new Date(intent.expiresAt).toLocaleString()}
              </span>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/50">
            <AlertTriangle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <span className="text-[10px] text-slate-500">
              By approving, you authorize Aegis-1 to access this service on your behalf.
              This action will be logged and can be revoked at any time.
            </span>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleDeny}
            disabled={isProcessing}
            className="flex-1"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Deny
          </Button>
          <Button
            variant="ops"
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

