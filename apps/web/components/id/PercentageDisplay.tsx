"use client";

import { cn } from "@/lib/utils";

interface PercentageDisplayProps {
  bakerPercentage: number;
  engineeringPercentage: number;
  isBase?: boolean;
}

export function PercentageDisplay({
  bakerPercentage,
  engineeringPercentage,
  isBase = false,
}: PercentageDisplayProps) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Baker's percentage */}
      <span
        className={cn(
          "inline-flex items-center gap-1",
          "px-2 py-0.5 rounded-lg",
          "text-[11px] font-semibold",
          "bg-blue-100 dark:bg-blue-500/15",
          "text-blue-700 dark:text-blue-300",
          "border border-blue-200/50 dark:border-blue-500/20"
        )}
        title="Porcentaje panadero"
      >
        Pan: {isBase ? "100% (base)" : `${bakerPercentage.toFixed(1)}%`}
      </span>

      {/* Engineering percentage */}
      <span
        className={cn(
          "inline-flex items-center gap-1",
          "px-2 py-0.5 rounded-lg",
          "text-[11px] font-semibold",
          "bg-purple-100 dark:bg-purple-500/15",
          "text-purple-700 dark:text-purple-300",
          "border border-purple-200/50 dark:border-purple-500/20"
        )}
        title="Porcentaje ingenieria"
      >
        Ing: {engineeringPercentage.toFixed(1)}%
      </span>
    </div>
  );
}
