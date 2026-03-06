"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Square, RotateCcw, Edit3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OperationTimerProps {
  elapsedSeconds: number;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onReset: () => void;
  onManualEntry?: (seconds: number) => void;
}

function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function OperationTimer({
  elapsedSeconds,
  isRunning,
  onStart,
  onStop,
  onPause,
  onReset,
  onManualEntry,
}: OperationTimerProps) {
  const [showManual, setShowManual] = useState(false);
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualSeconds, setManualSeconds] = useState("");

  const isPaused = !isRunning && elapsedSeconds > 0;

  const handleManualSubmit = () => {
    const mins = parseInt(manualMinutes) || 0;
    const secs = parseInt(manualSeconds) || 0;
    const total = mins * 60 + secs;
    if (total > 0 && onManualEntry) {
      onManualEntry(total);
      setShowManual(false);
      setManualMinutes("");
      setManualSeconds("");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Time display */}
      <div className="relative">
        <motion.div
          className={cn(
            "font-mono text-6xl md:text-7xl font-bold tracking-wider",
            "text-gray-900 dark:text-white",
            "tabular-nums"
          )}
          animate={
            isRunning
              ? { opacity: [1, 0.85, 1] }
              : {}
          }
          transition={
            isRunning
              ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
              : {}
          }
        >
          {formatTime(elapsedSeconds)}
        </motion.div>

        {/* Running pulse ring */}
        {isRunning && (
          <motion.div
            className="absolute -inset-4 rounded-3xl border-2 border-green-500/20"
            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* Status label */}
      <span
        className={cn(
          "text-xs font-semibold uppercase tracking-wider",
          isRunning && "text-green-500",
          isPaused && "text-amber-500",
          !isRunning && !isPaused && "text-gray-400 dark:text-gray-500"
        )}
      >
        {isRunning ? "En curso" : isPaused ? "Pausado" : "Listo"}
      </span>

      {/* Control buttons */}
      <div className="w-full max-w-sm space-y-3">
        {/* Main action button */}
        {!isRunning && !isPaused && (
          <motion.button
            type="button"
            onClick={onStart}
            className={cn(
              "w-full h-20 md:h-16 rounded-2xl",
              "bg-green-500 text-white",
              "font-bold text-xl",
              "shadow-xl shadow-green-500/30",
              "hover:bg-green-600 hover:shadow-2xl hover:shadow-green-500/40",
              "active:scale-[0.97] transition-all duration-150",
              "flex items-center justify-center gap-3",
              "focus:outline-none focus:ring-4 focus:ring-green-500/30"
            )}
            whileTap={{ scale: 0.95 }}
          >
            <Play className="w-7 h-7" fill="currentColor" />
            INICIAR
          </motion.button>
        )}

        {/* Running: Pause + Stop */}
        {isRunning && (
          <div className="flex gap-3">
            <motion.button
              type="button"
              onClick={onPause}
              className={cn(
                "flex-1 h-20 md:h-16 rounded-2xl",
                "bg-amber-500 text-white",
                "font-bold text-lg",
                "shadow-xl shadow-amber-500/30",
                "hover:bg-amber-600",
                "active:scale-[0.97] transition-all duration-150",
                "flex items-center justify-center gap-2",
                "focus:outline-none focus:ring-4 focus:ring-amber-500/30"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <Pause className="w-6 h-6" fill="currentColor" />
              PAUSA
            </motion.button>
            <motion.button
              type="button"
              onClick={onStop}
              className={cn(
                "flex-1 h-20 md:h-16 rounded-2xl",
                "bg-red-500 text-white",
                "font-bold text-lg",
                "shadow-xl shadow-red-500/30",
                "hover:bg-red-600",
                "active:scale-[0.97] transition-all duration-150",
                "flex items-center justify-center gap-2",
                "focus:outline-none focus:ring-4 focus:ring-red-500/30"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <Square className="w-5 h-5" fill="currentColor" />
              PARAR
            </motion.button>
          </div>
        )}

        {/* Paused: Resume + Stop + Reset */}
        {isPaused && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <motion.button
                type="button"
                onClick={onStart}
                className={cn(
                  "flex-1 h-20 md:h-16 rounded-2xl",
                  "bg-green-500 text-white",
                  "font-bold text-lg",
                  "shadow-xl shadow-green-500/30",
                  "hover:bg-green-600",
                  "active:scale-[0.97] transition-all duration-150",
                  "flex items-center justify-center gap-2",
                  "focus:outline-none focus:ring-4 focus:ring-green-500/30"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="w-6 h-6" fill="currentColor" />
                REANUDAR
              </motion.button>
              <motion.button
                type="button"
                onClick={onStop}
                className={cn(
                  "flex-1 h-20 md:h-16 rounded-2xl",
                  "bg-red-500 text-white",
                  "font-bold text-lg",
                  "shadow-xl shadow-red-500/30",
                  "hover:bg-red-600",
                  "active:scale-[0.97] transition-all duration-150",
                  "flex items-center justify-center gap-2",
                  "focus:outline-none focus:ring-4 focus:ring-red-500/30"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Square className="w-5 h-5" fill="currentColor" />
                PARAR
              </motion.button>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              className="w-full h-11 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reiniciar
            </Button>
          </div>
        )}
      </div>

      {/* Manual entry toggle */}
      {onManualEntry && (
        <div className="w-full max-w-sm">
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className={cn(
              "flex items-center gap-1.5 mx-auto",
              "text-xs font-medium text-gray-400 dark:text-gray-500",
              "hover:text-gray-600 dark:hover:text-gray-300",
              "py-1 px-3 rounded-lg",
              "hover:bg-gray-100 dark:hover:bg-white/5",
              "transition-all duration-150"
            )}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Ingresar tiempo manualmente
          </button>

          <AnimatePresence>
            {showManual && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="flex items-end gap-2 mt-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-medium text-gray-400 block mb-1">
                      Min
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      placeholder="00"
                      className="h-12 rounded-xl text-center text-lg font-mono bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10"
                      min={0}
                    />
                  </div>
                  <span className="text-2xl font-bold text-gray-300 pb-2">:</span>
                  <div className="flex-1">
                    <label className="text-[10px] font-medium text-gray-400 block mb-1">
                      Seg
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={manualSeconds}
                      onChange={(e) => setManualSeconds(e.target.value)}
                      placeholder="00"
                      className="h-12 rounded-xl text-center text-lg font-mono bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10"
                      min={0}
                      max={59}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleManualSubmit}
                    className="h-12 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  >
                    OK
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
