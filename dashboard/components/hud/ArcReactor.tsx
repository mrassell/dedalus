"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ArcReactorProps {
  isSpeaking: boolean;
  isListening: boolean;
  size?: number;
  className?: string;
}

export default function ArcReactor({
  isSpeaking,
  isListening,
  size = 120,
  className = "",
}: ArcReactorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [audioLevel, setAudioLevel] = useState(0);

  // Simulate audio levels when speaking
  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setAudioLevel(0.3 + Math.random() * 0.7);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isSpeaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const centerX = size / 2;
    const centerY = size / 2;
    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Base glow
      const glowIntensity = isSpeaking ? 0.8 + audioLevel * 0.2 : isListening ? 0.6 : 0.3;
      const primaryColor = isListening
        ? `rgba(59, 130, 246, ${glowIntensity})` // Blue when listening
        : isSpeaking
        ? `rgba(16, 185, 129, ${glowIntensity})` // Green when speaking
        : `rgba(16, 185, 129, ${glowIntensity * 0.5})`; // Dim green idle

      const secondaryColor = isListening
        ? "rgba(59, 130, 246, 0.3)"
        : "rgba(16, 185, 129, 0.3)";

      // Outer glow
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        size / 2
      );
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(0.5, secondaryColor);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Rotating rings
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const radius = (size / 4) * (0.5 + i * 0.3);
        const rotationSpeed = (i + 1) * 0.02;
        const rotation = time * rotationSpeed * (i % 2 === 0 ? 1 : -1);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);

        // Ring segments
        const segments = 8 + i * 4;
        const segmentAngle = (Math.PI * 2) / segments;
        const gapAngle = segmentAngle * 0.3;

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2 + (isSpeaking ? audioLevel * 2 : 0);

        for (let j = 0; j < segments; j++) {
          const startAngle = j * segmentAngle;
          const endAngle = startAngle + segmentAngle - gapAngle;

          ctx.beginPath();
          ctx.arc(0, 0, radius, startAngle, endAngle);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Center core
      const coreRadius = size / 8;
      const corePulse = isSpeaking ? 1 + audioLevel * 0.3 : 1 + Math.sin(time * 0.05) * 0.1;

      const coreGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        coreRadius * corePulse
      );
      coreGradient.addColorStop(0, isListening ? "#60a5fa" : "#34d399");
      coreGradient.addColorStop(0.5, primaryColor);
      coreGradient.addColorStop(1, "transparent");

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * corePulse, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright core
      ctx.fillStyle = isListening ? "#93c5fd" : "#6ee7b7";
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 0.3 * corePulse, 0, Math.PI * 2);
      ctx.fill();

      // Audio wave visualization when speaking
      if (isSpeaking) {
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.5;

        const waveCount = 3;
        for (let w = 0; w < waveCount; w++) {
          const waveRadius = coreRadius * (1.5 + w * 0.5) + audioLevel * 10;
          const waveOpacity = 1 - w * 0.3;

          ctx.globalAlpha = waveOpacity;
          ctx.beginPath();
          ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Triangular markers
      const markerCount = 3;
      const markerRadius = size / 2.5;

      ctx.fillStyle = primaryColor;
      for (let i = 0; i < markerCount; i++) {
        const angle = (Math.PI * 2 * i) / markerCount - Math.PI / 2 + time * 0.01;
        const x = centerX + Math.cos(angle) * markerRadius;
        const y = centerY + Math.sin(angle) * markerRadius;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);

        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 4);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      time++;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, isSpeaking, isListening, audioLevel]);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute inset-0"
      />

      {/* Status text */}
      <AnimatePresence mode="wait">
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span className="text-xs font-mono text-blue-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              LISTENING...
            </span>
          </motion.div>
        )}
        {isSpeaking && !isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              AEGIS SPEAKING
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

