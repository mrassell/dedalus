"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2 } from "lucide-react";

interface VoiceCommandProps {
  isListening: boolean;
  isSpeaking: boolean;
  onStartListening: () => void;
  onStopListening: (transcription?: string) => void;
  className?: string;
}

export default function VoiceCommand({
  isListening,
  isSpeaking,
  onStartListening,
  onStopListening,
  className = "",
}: VoiceCommandProps) {
  const [transcript, setTranscript] = useState("");
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0));
  const recognitionRef = useRef<any>(null);

  // Simulate audio levels when listening
  useEffect(() => {
    if (isListening || isSpeaking) {
      const interval = setInterval(() => {
        setAudioLevels((prev) =>
          prev.map(() => (isSpeaking ? 0.3 + Math.random() * 0.7 : Math.random() * 0.5))
        );
      }, 50);
      return () => clearInterval(interval);
    } else {
      setAudioLevels(new Array(20).fill(0));
    }
  }, [isListening, isSpeaking]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
      };
    }
  }, []);

  const handleToggle = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      onStopListening(transcript);
      setTranscript("");
    } else {
      setTranscript("");
      recognitionRef.current?.start();
      onStartListening();
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Audio visualizer */}
      <div className="flex items-end gap-0.5 h-8">
        {audioLevels.map((level, i) => (
          <motion.div
            key={i}
            className={`w-1 rounded-full ${
              isSpeaking
                ? "bg-emerald-400"
                : isListening
                ? "bg-blue-400"
                : "bg-slate-700"
            }`}
            animate={{
              height: Math.max(4, level * 32),
            }}
            transition={{ duration: 0.05 }}
          />
        ))}
      </div>

      {/* Mic button */}
      <motion.button
        onClick={handleToggle}
        disabled={isSpeaking}
        className={`
          relative w-12 h-12 rounded-full flex items-center justify-center
          transition-colors
          ${
            isListening
              ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400"
              : isSpeaking
              ? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400"
              : "bg-slate-800 border-2 border-slate-600 text-slate-400 hover:border-slate-500"
          }
        `}
        whileTap={{ scale: 0.95 }}
      >
        {/* Pulse effect when active */}
        {(isListening || isSpeaking) && (
          <motion.div
            className={`absolute inset-0 rounded-full ${
              isListening ? "bg-blue-500" : "bg-emerald-500"
            }`}
            animate={{
              scale: [1, 1.5],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        )}

        {isSpeaking ? (
          <Volume2 className="w-5 h-5 relative z-10" />
        ) : isListening ? (
          <Mic className="w-5 h-5 relative z-10" />
        ) : (
          <MicOff className="w-5 h-5 relative z-10" />
        )}
      </motion.button>

      {/* Status & Transcript */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs"
            >
              <div className="text-blue-400 font-mono mb-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                LISTENING...
              </div>
              {transcript && (
                <div className="text-slate-300 truncate">"{transcript}"</div>
              )}
            </motion.div>
          )}

          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs"
            >
              <div className="text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                AEGIS SPEAKING...
              </div>
            </motion.div>
          )}

          {!isListening && !isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-slate-500 font-mono"
            >
              Click mic or say "Hey Aegis"
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

