"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { config } from "@/lib/config";

export interface GestureEvent {
  type: 
    | "INIT"
    | "MOVE"
    | "SELECT"
    | "ZOOM"
    | "ROTATE"
    | "VOICE_START"
    | "VOICE_END"
    | "AGENT_SPEAK_START"
    | "AGENT_SPEAK_END"
    | "TOOL_EXECUTE"
    | "ALERT";
  timestamp: string;
  data: Record<string, unknown>;
}

export interface CameraState {
  lat: number;
  lon: number;
  altitude: number;
  targetName?: string;
}

export interface Marker {
  lat: number;
  lon: number;
  type?: string;
  timestamp: string;
}

export interface GestureState {
  isConnected: boolean;
  camera: CameraState;
  markers: Marker[];
  isListening: boolean;
  isSpeaking: boolean;
  currentTool: { tool: string; status: string } | null;
  alerts: Array<{ level: string; message: string; timestamp: string }>;
  lastEvent: GestureEvent | null;
}

interface UseGestureOptions {
  wsUrl?: string;
  onEvent?: (event: GestureEvent) => void;
  onCameraMove?: (camera: CameraState) => void;
  onMarkerDrop?: (marker: Marker) => void;
}

export function useGesture(options: UseGestureOptions = {}) {
  const {
    wsUrl = config.gestureWsUrl,
    onEvent,
    onCameraMove,
    onMarkerDrop,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const [state, setState] = useState<GestureState>({
    isConnected: false,
    camera: { lat: 0, lon: 0, altitude: 15000000 },
    markers: [],
    isListening: false,
    isSpeaking: false,
    currentTool: null,
    alerts: [],
    lastEvent: null,
  });

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("🎮 Connected to Gesture Controller");
        setState((prev) => ({ ...prev, isConnected: true }));
      };

      ws.onclose = () => {
        console.log("🎮 Disconnected from Gesture Controller");
        setState((prev) => ({ ...prev, isConnected: false }));

        // Attempt reconnect after configured delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, config.wsReconnectDelay);
      };

      ws.onerror = (error) => {
        console.error("🎮 WebSocket error:", error);
      };

      ws.onmessage = (event) => {
        try {
          const gestureEvent: GestureEvent = JSON.parse(event.data);
          handleEvent(gestureEvent);
          onEvent?.(gestureEvent);
        } catch (e) {
          console.error("Failed to parse gesture event:", e);
        }
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("Failed to connect:", e);
    }
  }, [wsUrl, onEvent]);

  const handleEvent = useCallback(
    (event: GestureEvent) => {
      setState((prev) => {
        const newState = { ...prev, lastEvent: event };

        switch (event.type) {
          case "INIT":
            if (event.data.camera) {
              newState.camera = event.data.camera as CameraState;
            }
            if (event.data.markers) {
              newState.markers = event.data.markers as Marker[];
            }
            break;

          case "MOVE":
            newState.camera = {
              lat: event.data.lat as number,
              lon: event.data.lon as number,
              altitude: event.data.altitude as number,
              targetName: event.data.target_name as string | undefined,
            };
            onCameraMove?.(newState.camera);
            break;

          case "SELECT":
            const newMarker: Marker = {
              lat: event.data.lat as number,
              lon: event.data.lon as number,
              type: event.data.marker_type as string,
              timestamp: event.timestamp,
            };
            newState.markers = [...prev.markers, newMarker];
            onMarkerDrop?.(newMarker);
            break;

          case "VOICE_START":
            newState.isListening = true;
            break;

          case "VOICE_END":
            newState.isListening = false;
            break;

          case "AGENT_SPEAK_START":
            newState.isSpeaking = true;
            break;

          case "AGENT_SPEAK_END":
            newState.isSpeaking = false;
            break;

          case "TOOL_EXECUTE":
            newState.currentTool = {
              tool: event.data.tool as string,
              status: event.data.status as string,
            };
            // Clear after 3 seconds
            setTimeout(() => {
              setState((s) => ({ ...s, currentTool: null }));
            }, 3000);
            break;

          case "ALERT":
            newState.alerts = [
              {
                level: event.data.level as string,
                message: event.data.message as string,
                timestamp: event.timestamp,
              },
              ...prev.alerts.slice(0, 4), // Keep last 5 alerts
            ];
            break;
        }

        return newState;
      });
    },
    [onCameraMove, onMarkerDrop]
  );

  const sendCommand = useCallback((command: string, data: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command, ...data }));
    }
  }, []);

  const startListening = useCallback(() => {
    sendCommand("START_LISTENING");
  }, [sendCommand]);

  const stopListening = useCallback((transcription?: string) => {
    sendCommand("STOP_LISTENING", { transcription });
  }, [sendCommand]);

  const dropMarker = useCallback((lat: number, lon: number) => {
    sendCommand("DROP_MARKER", { lat, lon });
  }, [sendCommand]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    ...state,
    sendCommand,
    startListening,
    stopListening,
    dropMarker,
  };
}

