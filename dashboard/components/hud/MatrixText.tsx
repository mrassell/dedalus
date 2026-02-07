"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MatrixTextProps {
  lines: string[];
  className?: string;
  speed?: number;
  maxLines?: number;
}

export default function MatrixText({
  lines,
  className = "",
  speed = 50,
  maxLines = 12,
}: MatrixTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedLines, setDisplayedLines] = useState<
    Array<{ id: number; text: string; complete: boolean }>
  >([]);
  const lineIdRef = useRef(0);

  // Add new lines with typing effect
  useEffect(() => {
    const latestLine = lines[lines.length - 1];
    if (!latestLine) return;

    const lineId = lineIdRef.current++;

    // Add new line
    setDisplayedLines((prev) => {
      const newLines = [...prev, { id: lineId, text: "", complete: false }];
      // Keep only last maxLines
      return newLines.slice(-maxLines);
    });

    // Type out the line
    let charIndex = 0;
    const typeInterval = setInterval(() => {
      if (charIndex < latestLine.length) {
        setDisplayedLines((prev) =>
          prev.map((line) =>
            line.id === lineId
              ? { ...line, text: latestLine.slice(0, charIndex + 1) }
              : line
          )
        );
        charIndex++;
      } else {
        setDisplayedLines((prev) =>
          prev.map((line) =>
            line.id === lineId ? { ...line, complete: true } : line
          )
        );
        clearInterval(typeInterval);
      }
    }, speed);

    return () => clearInterval(typeInterval);
  }, [lines.length, speed, maxLines]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLines]);

  return (
    <div
      ref={containerRef}
      className={`font-mono text-xs overflow-hidden ${className}`}
      style={{ maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)" }}
    >
      <AnimatePresence initial={false}>
        {displayedLines.map((line) => (
          <motion.div
            key={line.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="py-0.5"
          >
            <span className="text-emerald-500 mr-2">{">"}</span>
            <span className={line.complete ? "text-emerald-400" : "text-emerald-300"}>
              {line.text}
            </span>
            {!line.complete && (
              <span className="inline-block w-2 h-4 bg-emerald-400 ml-0.5 animate-pulse" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Matrix rain effect background
export function MatrixRain({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width;
    canvas.height = height;

    const columns = Math.floor(width / 14);
    const drops: number[] = new Array(columns).fill(1);

    const chars = "AEGIS01アイウエオカキクケコサシスセソタチツテト0123456789";

    const draw = () => {
      ctx.fillStyle = "rgba(2, 6, 23, 0.05)";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#10b981";
      ctx.font = "12px JetBrains Mono, monospace";

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 14;
        const y = drops[i] * 14;

        ctx.fillStyle = `rgba(16, 185, 129, ${0.3 + Math.random() * 0.3})`;
        ctx.fillText(char, x, y);

        if (y > height && Math.random() > 0.98) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 opacity-20 pointer-events-none ${className}`}
    />
  );
}

