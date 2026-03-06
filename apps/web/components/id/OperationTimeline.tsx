"use client";

import { motion } from "framer-motion";
import { Clock, Thermometer, Weight, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface OperationPhoto {
  id: string;
  photo_url: string;
  caption?: string;
}

interface TimelineOperation {
  id: string;
  name: string;
  step_number: number;
  duration_seconds?: number | null;
  temperature_c?: number | null;
  weight_in_g?: number | null;
  weight_out_g?: number | null;
  status?: "pending" | "in_progress" | "completed" | "skipped";
  photos?: OperationPhoto[];
}

interface OperationTimelineProps {
  operations: TimelineOperation[];
}

const STATUS_COLORS: Record<string, { dot: string; line: string; text: string }> = {
  completed: {
    dot: "bg-green-500 border-green-500",
    line: "bg-green-500",
    text: "text-green-600 dark:text-green-400",
  },
  in_progress: {
    dot: "bg-blue-500 border-blue-500",
    line: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
  },
  pending: {
    dot: "bg-gray-300 dark:bg-gray-600 border-gray-300 dark:border-gray-600",
    line: "bg-gray-200 dark:bg-gray-700",
    text: "text-gray-400 dark:text-gray-500",
  },
  skipped: {
    dot: "bg-gray-200 dark:bg-gray-700 border-gray-200 dark:border-gray-700",
    line: "bg-gray-200 dark:bg-gray-700",
    text: "text-gray-300 dark:text-gray-600",
  },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`;
  return `${grams} g`;
}

export function OperationTimeline({ operations }: OperationTimelineProps) {
  return (
    <div className="relative pl-8 md:pl-10 space-y-0">
      {operations.map((op, index) => {
        const status = op.status || "pending";
        const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
        const isLast = index === operations.length - 1;
        const hasData =
          op.duration_seconds || op.temperature_c || op.weight_in_g || op.weight_out_g;

        return (
          <motion.div
            key={op.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05,
              ease: "easeOut",
            }}
            className="relative pb-6 last:pb-0"
          >
            {/* Timeline dot */}
            <div
              className={cn(
                "absolute -left-8 md:-left-10 top-1",
                "w-4 h-4 md:w-5 md:h-5 rounded-full",
                "border-2",
                colors.dot,
                status === "in_progress" && "animate-pulse"
              )}
            />

            {/* Timeline line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute -left-[22px] md:-left-[28px] top-5 md:top-6 bottom-0",
                  "w-[2px]",
                  colors.line
                )}
              />
            )}

            {/* Operation content card */}
            <div
              className={cn(
                "bg-white/70 dark:bg-black/50",
                "backdrop-blur-xl",
                "border border-white/20 dark:border-white/10",
                "rounded-2xl",
                "p-4",
                "shadow-sm shadow-black/5",
                status === "skipped" && "opacity-50"
              )}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-lg",
                    "flex items-center justify-center",
                    "text-[10px] font-bold",
                    status === "completed"
                      ? "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300"
                      : status === "in_progress"
                        ? "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                        : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                  )}
                >
                  {op.step_number}
                </span>
                <h4
                  className={cn(
                    "text-sm font-semibold flex-1",
                    status === "skipped"
                      ? "text-gray-400 dark:text-gray-500 line-through"
                      : "text-gray-900 dark:text-white"
                  )}
                >
                  {op.name}
                </h4>
                <span className={cn("text-[10px] font-semibold uppercase tracking-wider", colors.text)}>
                  {status === "completed" && "Listo"}
                  {status === "in_progress" && "En curso"}
                  {status === "pending" && "Pendiente"}
                  {status === "skipped" && "Omitido"}
                </span>
              </div>

              {/* Data chips */}
              {hasData && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {op.duration_seconds != null && op.duration_seconds > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        "px-2.5 py-1 rounded-lg",
                        "text-xs font-medium",
                        "bg-purple-50 dark:bg-purple-500/10",
                        "text-purple-600 dark:text-purple-300",
                        "border border-purple-100 dark:border-purple-500/20"
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {formatDuration(op.duration_seconds)}
                    </span>
                  )}
                  {op.temperature_c != null && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        "px-2.5 py-1 rounded-lg",
                        "text-xs font-medium",
                        "bg-red-50 dark:bg-red-500/10",
                        "text-red-600 dark:text-red-300",
                        "border border-red-100 dark:border-red-500/20"
                      )}
                    >
                      <Thermometer className="w-3 h-3" />
                      {op.temperature_c}°C
                    </span>
                  )}
                  {op.weight_in_g != null && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        "px-2.5 py-1 rounded-lg",
                        "text-xs font-medium",
                        "bg-blue-50 dark:bg-blue-500/10",
                        "text-blue-600 dark:text-blue-300",
                        "border border-blue-100 dark:border-blue-500/20"
                      )}
                    >
                      <Weight className="w-3 h-3" />
                      Ent: {formatWeight(op.weight_in_g)}
                    </span>
                  )}
                  {op.weight_out_g != null && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        "px-2.5 py-1 rounded-lg",
                        "text-xs font-medium",
                        "bg-emerald-50 dark:bg-emerald-500/10",
                        "text-emerald-600 dark:text-emerald-300",
                        "border border-emerald-100 dark:border-emerald-500/20"
                      )}
                    >
                      <Weight className="w-3 h-3" />
                      Sal: {formatWeight(op.weight_out_g)}
                    </span>
                  )}
                </div>
              )}

              {/* Photo thumbnails */}
              {op.photos && op.photos.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <Camera className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                    {op.photos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt={photo.caption || `Foto de ${op.name}`}
                        className={cn(
                          "w-10 h-10 rounded-lg object-cover flex-shrink-0",
                          "border border-white/20 dark:border-white/10",
                          "shadow-sm"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
