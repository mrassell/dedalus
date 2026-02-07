"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Zap, Bot, User, Wrench, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentMessage, ToolExecution, AgentState } from "@/types/aegis";

interface CommandCenterProps {
  messages: AgentMessage[];
  agents: AgentState[];
  currentTool: ToolExecution | null;
  isProcessing: boolean;
  onSendMessage: (content: string) => void;
}

function AgentBadge({ agent }: { agent: AgentState }) {
  const getStatusColor = () => {
    switch (agent.status) {
      case "thinking":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "executing":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "streaming":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-slate-700/50 text-slate-400 border-slate-600/30";
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${getStatusColor()}`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          agent.status !== "idle" ? "animate-pulse" : ""
        }`}
        style={{
          backgroundColor:
            agent.status === "thinking"
              ? "#f59e0b"
              : agent.status === "executing"
              ? "#3b82f6"
              : agent.status === "streaming"
              ? "#10b981"
              : "#64748b",
        }}
      />
      <span className="font-medium">{agent.name}</span>
      {agent.currentTask && (
        <span className="text-[10px] opacity-70 truncate max-w-[100px]">
          {agent.currentTask}
        </span>
      )}
    </div>
  );
}

function ToolBadge({ tool }: { tool: ToolExecution }) {
  return (
    <div className="tool-badge flex items-center gap-2 px-3 py-2 rounded-lg text-xs">
      <Wrench className="w-3 h-3 text-blue-400" />
      <div className="flex flex-col">
        <span className="font-mono font-medium text-blue-300">{tool.name}</span>
        <span className="text-[10px] text-slate-400">via {tool.provider}</span>
      </div>
      {tool.status === "executing" && (
        <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin ml-auto" />
      )}
      {tool.status === "completed" && (
        <span className="text-emerald-400 ml-auto">✓</span>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  if (isTool && message.toolCall) {
    return (
      <div className="flex justify-center my-2">
        <ToolBadge tool={message.toolCall} />
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} mb-4`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isUser
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-slate-700/50 text-slate-300"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div
        className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}
      >
        {message.agent && (
          <span className="text-[10px] text-slate-500 mb-1 font-medium">
            {message.agent}
          </span>
        )}
        <div
          className={`rounded-lg px-4 py-2.5 ${
            isUser
              ? "bg-emerald-500/20 text-emerald-50 border border-emerald-500/30"
              : "glass"
          }`}
        >
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-emerald-400 ml-1 animate-pulse" />
            )}
          </div>
        </div>
        <span className="text-[10px] text-slate-600 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

export default function CommandCenter({
  messages,
  agents,
  currentTool,
  isProcessing,
  onSendMessage,
}: CommandCenterProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-full flex flex-col glass-strong rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 ops-pulse" />
            <span className="font-semibold text-sm">AEGIS-1 COMMAND</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Zap className="w-3 h-3" />
            <span>ONLINE</span>
          </div>
        </div>

        {/* Agent Status */}
        <div className="flex flex-wrap gap-2">
          {agents.map((agent) => (
            <AgentBadge key={agent.name} agent={agent} />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
            <Bot className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Aegis-1 Command Center Active</p>
            <p className="text-xs mt-1">Enter a disaster alert to begin analysis</p>
            
            {/* Quick Actions */}
            <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={() => onSendMessage("Satellite alert: Flood detected in Jakarta, 500,000 affected")}
                className="flex items-center gap-2 px-3 py-2 glass rounded-lg text-left hover:bg-white/5 transition-colors text-xs"
              >
                <ChevronRight className="w-3 h-3 text-blue-400" />
                <span>🌊 Jakarta Flood Alert</span>
              </button>
              <button
                onClick={() => onSendMessage("Emergency: Wildfire spreading in California, 50,000 evacuating")}
                className="flex items-center gap-2 px-3 py-2 glass rounded-lg text-left hover:bg-white/5 transition-colors text-xs"
              >
                <ChevronRight className="w-3 h-3 text-rose-400" />
                <span>🔥 California Wildfire</span>
              </button>
              <button
                onClick={() => onSendMessage("Alert: Earthquake magnitude 7.2 in Tokyo, 1M affected")}
                className="flex items-center gap-2 px-3 py-2 glass rounded-lg text-left hover:bg-white/5 transition-colors text-xs"
              >
                <ChevronRight className="w-3 h-3 text-amber-400" />
                <span>🏚️ Tokyo Earthquake</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {/* Current Tool Execution */}
        {currentTool && currentTool.status === "executing" && (
          <div className="flex justify-center mt-2">
            <ToolBadge tool={currentTool} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-white/5">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter disaster alert or command..."
            disabled={isProcessing}
            className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50 placeholder:text-slate-600"
            rows={2}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            variant="ops"
            size="icon"
            className="h-auto"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

