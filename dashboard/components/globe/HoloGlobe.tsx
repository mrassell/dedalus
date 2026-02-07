"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CameraState, Marker } from "@/hooks/useGesture";

interface HoloGlobeProps {
  camera: CameraState;
  markers: Marker[];
  onMarkerClick?: (marker: Marker) => void;
  className?: string;
}

interface GlobeMarker extends Marker {
  screenX?: number;
  screenY?: number;
}

export default function HoloGlobe({
  camera,
  markers,
  onMarkerClick,
  className = "",
}: HoloGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredMarker, setHoveredMarker] = useState<GlobeMarker | null>(null);
  const [processedMarkers, setProcessedMarkers] = useState<GlobeMarker[]>([]);

  // Update dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Convert lat/lon to screen coordinates
  const latLonToScreen = useCallback(
    (lat: number, lon: number, radius: number) => {
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      // Adjust for camera position
      const adjustedLon = lon - camera.lon;
      const adjustedLat = lat;

      // Simple projection
      const x = centerX + (adjustedLon / 180) * radius;
      const y = centerY - (adjustedLat / 90) * (radius / 2);

      // Check if on visible hemisphere
      const lonDiff = Math.abs(adjustedLon);
      const visible = lonDiff < 90;

      return { x, y, visible };
    },
    [camera.lon, dimensions]
  );

  // Draw the holographic globe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;

    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Globe base glow
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius * 1.5
      );
      glowGradient.addColorStop(0, "rgba(16, 185, 129, 0.1)");
      glowGradient.addColorStop(0.5, "rgba(16, 185, 129, 0.05)");
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Globe outline
      ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glow circle
      ctx.strokeStyle = "rgba(16, 185, 129, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.95, 0, Math.PI * 2);
      ctx.stroke();

      // Grid lines - Latitude
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.lineWidth = 0.5;
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = centerY - (lat / 90) * (radius * 0.9);
        const xRadius = Math.cos((lat * Math.PI) / 180) * radius;

        ctx.beginPath();
        ctx.ellipse(centerX, y, xRadius, xRadius * 0.1, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Grid lines - Longitude (rotating based on camera)
      for (let lon = -180; lon < 180; lon += 30) {
        const adjustedLon = lon - camera.lon;
        if (Math.abs(adjustedLon) > 90) continue;

        const x = centerX + (adjustedLon / 90) * radius;
        const curveIntensity = 1 - Math.abs(adjustedLon) / 90;

        ctx.beginPath();
        ctx.moveTo(x, centerY - radius * 0.9);
        ctx.quadraticCurveTo(
          x + curveIntensity * 20 * Math.sign(adjustedLon),
          centerY,
          x,
          centerY + radius * 0.9
        );
        ctx.stroke();
      }

      // Simplified continents (just outlines suggesting land masses)
      ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
      ctx.lineWidth = 1;

      // Draw some abstract continent shapes
      const drawContinent = (points: number[][]) => {
        ctx.beginPath();
        points.forEach((point, i) => {
          const { x, y, visible } = latLonToScreen(point[0], point[1], radius);
          if (!visible) return;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };

      // Abstract land masses
      drawContinent([
        [40, -100],
        [50, -80],
        [45, -70],
        [30, -80],
        [25, -100],
        [40, -100],
      ]);
      drawContinent([
        [50, 0],
        [55, 30],
        [40, 40],
        [35, 10],
        [50, 0],
      ]);
      drawContinent([
        [10, 20],
        [30, 40],
        [-20, 30],
        [-30, 20],
        [10, 20],
      ]);

      // Process markers
      const processed: GlobeMarker[] = markers.map((marker) => {
        const { x, y, visible } = latLonToScreen(marker.lat, marker.lon, radius);
        return { ...marker, screenX: visible ? x : undefined, screenY: visible ? y : undefined };
      });
      setProcessedMarkers(processed);

      // Draw markers
      processed.forEach((marker) => {
        if (marker.screenX === undefined || marker.screenY === undefined) return;

        const markerColor =
          marker.type === "relief"
            ? "#10b981"
            : marker.type === "rescue"
            ? "#f43f5e"
            : marker.type === "medical"
            ? "#3b82f6"
            : "#f59e0b";

        // Pulse effect
        const pulseRadius = 8 + Math.sin(time * 0.1) * 3;

        // Outer pulse
        ctx.beginPath();
        ctx.arc(marker.screenX, marker.screenY, pulseRadius + 10, 0, Math.PI * 2);
        ctx.fillStyle = `${markerColor}22`;
        ctx.fill();

        // Main marker
        ctx.beginPath();
        ctx.arc(marker.screenX, marker.screenY, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = markerColor;
        ctx.fill();

        // Inner glow
        ctx.beginPath();
        ctx.arc(marker.screenX, marker.screenY, pulseRadius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      });

      // Draw camera target indicator
      const targetPos = latLonToScreen(camera.lat, camera.lon, radius);
      if (targetPos.visible) {
        // Crosshair
        ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
        ctx.lineWidth = 1;

        // Rotating outer ring
        ctx.save();
        ctx.translate(targetPos.x, targetPos.y);
        ctx.rotate(time * 0.02);

        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
          ctx.lineTo(Math.cos(angle) * 25, Math.sin(angle) * 25);
        }
        ctx.stroke();

        ctx.restore();

        // Center dot
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(targetPos.x, targetPos.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Scan line effect
      const scanY = (time % 200) * (dimensions.height / 200);
      ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
      ctx.fillRect(0, scanY - 2, dimensions.width, 4);

      time++;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, camera, markers, latLonToScreen]);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px h-px bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.2,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Main canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Marker tooltips */}
      <AnimatePresence>
        {processedMarkers.map(
          (marker) =>
            marker.screenX !== undefined &&
            marker.screenY !== undefined && (
              <motion.div
                key={marker.timestamp}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute pointer-events-auto cursor-pointer"
                style={{
                  left: marker.screenX,
                  top: marker.screenY,
                  transform: "translate(-50%, -50%)",
                }}
                onClick={() => onMarkerClick?.(marker)}
                onMouseEnter={() => setHoveredMarker(marker)}
                onMouseLeave={() => setHoveredMarker(null)}
              >
                <div className="w-6 h-6" />
              </motion.div>
            )
        )}
      </AnimatePresence>

      {/* Hovered marker info */}
      <AnimatePresence>
        {hoveredMarker && hoveredMarker.screenX && hoveredMarker.screenY && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute glass rounded-lg px-3 py-2 pointer-events-none"
            style={{
              left: hoveredMarker.screenX + 20,
              top: hoveredMarker.screenY - 20,
            }}
          >
            <div className="text-xs font-mono text-emerald-400">
              {hoveredMarker.type?.toUpperCase() || "MARKER"}
            </div>
            <div className="text-[10px] text-slate-400">
              {hoveredMarker.lat.toFixed(4)}°, {hoveredMarker.lon.toFixed(4)}°
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera target name */}
      {camera.targetName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 glass rounded-lg px-4 py-2"
        >
          <span className="text-xs font-mono text-emerald-400">TARGET: </span>
          <span className="text-sm font-mono text-white">{camera.targetName}</span>
        </motion.div>
      )}

      {/* Coordinates display */}
      <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2">
        <div className="text-[10px] text-slate-500 font-mono">CAMERA POSITION</div>
        <div className="text-xs text-emerald-400 font-mono">
          {camera.lat.toFixed(4)}°, {camera.lon.toFixed(4)}°
        </div>
      </div>

      {/* Markers count */}
      <div className="absolute bottom-4 right-4 glass rounded-lg px-3 py-2">
        <div className="text-[10px] text-slate-500 font-mono">MARKERS</div>
        <div className="text-xs text-emerald-400 font-mono">{markers.length} ACTIVE</div>
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

