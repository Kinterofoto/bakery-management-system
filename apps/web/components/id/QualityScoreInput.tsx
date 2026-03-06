"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface QualityScoreInputProps {
  label: string;
  score: number | null;
  notes?: string;
  onScoreChange: (score: number) => void;
  onNotesChange?: (notes: string) => void;
}

const SCORE_LABELS: Record<number, string> = {
  1: "Malo",
  2: "Regular",
  3: "Aceptable",
  4: "Bueno",
  5: "Excelente",
};

const SCORE_COLORS: Record<number, string> = {
  1: "bg-red-500 border-red-500 shadow-red-500/20",
  2: "bg-orange-500 border-orange-500 shadow-orange-500/20",
  3: "bg-amber-500 border-amber-500 shadow-amber-500/20",
  4: "bg-lime-500 border-lime-500 shadow-lime-500/20",
  5: "bg-green-500 border-green-500 shadow-green-500/20",
};

export function QualityScoreInput({
  label,
  score,
  notes = "",
  onScoreChange,
  onNotesChange,
}: QualityScoreInputProps) {
  const [showNotes, setShowNotes] = useState(!!notes);

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          {label}
        </h4>
        {score !== null && (
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {SCORE_LABELS[score]}
          </span>
        )}
      </div>

      {/* Score chips */}
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((value) => {
          const isSelected = score === value;
          return (
            <motion.button
              key={value}
              type="button"
              onClick={() => onScoreChange(value)}
              className={cn(
                // Base: large tappable area
                "relative h-14 md:h-12 rounded-2xl",
                "flex items-center justify-center",
                "text-lg md:text-base font-bold",
                "border-2 transition-all duration-200",
                "active:scale-90",
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
                isSelected
                  ? cn(
                      SCORE_COLORS[value],
                      "text-white shadow-lg",
                      "focus:ring-current"
                    )
                  : cn(
                      "bg-gray-50 dark:bg-white/5",
                      "border-gray-200 dark:border-white/10",
                      "text-gray-500 dark:text-gray-400",
                      "hover:border-gray-300 dark:hover:border-white/20",
                      "hover:bg-gray-100 dark:hover:bg-white/10",
                      "focus:ring-gray-400"
                    )
              )}
              whileTap={{ scale: 0.88 }}
              aria-label={`${label}: ${value} - ${SCORE_LABELS[value]}`}
              aria-pressed={isSelected}
            >
              {value}
              {isSelected && (
                <motion.div
                  layoutId={`score-ring-${label}`}
                  className="absolute inset-0 rounded-2xl border-2 border-white/30"
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Notes toggle + textarea */}
      {onNotesChange && (
        <>
          {!showNotes && (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className={cn(
                "flex items-center gap-1.5",
                "text-xs font-medium text-gray-400 dark:text-gray-500",
                "hover:text-gray-600 dark:hover:text-gray-300",
                "py-1 px-2 rounded-lg",
                "hover:bg-gray-100 dark:hover:bg-white/5",
                "transition-all duration-150"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Agregar notas
            </button>
          )}

          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <Textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Observaciones..."
                  className={cn(
                    "rounded-xl bg-white/50 dark:bg-black/30",
                    "border-gray-200/50 dark:border-white/10",
                    "resize-none min-h-[60px]",
                    "text-sm",
                    "focus:ring-2 focus:ring-blue-500/50"
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
