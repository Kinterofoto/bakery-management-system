"use client";

import { cn } from "@/lib/utils";

interface PrototypeStatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; classes: string }
> = {
  draft: {
    label: "Borrador",
    classes:
      "bg-gray-100 dark:bg-gray-500/15 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-500/20",
  },
  in_progress: {
    label: "En Progreso",
    classes:
      "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20",
  },
  sensory_review: {
    label: "Evaluacion Sensorial",
    classes:
      "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
  },
  approved: {
    label: "Aprobado",
    classes:
      "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/20",
  },
  rejected: {
    label: "Rechazado",
    classes:
      "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/20",
  },
  archived: {
    label: "Archivado",
    classes:
      "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/20",
  },
};

export function PrototypeStatusBadge({ status }: PrototypeStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    classes:
      "bg-gray-100 dark:bg-gray-500/15 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center",
        "px-2.5 py-0.5 rounded-full",
        "text-[11px] font-semibold",
        "border",
        "whitespace-nowrap shrink-0",
        config.classes
      )}
    >
      {config.label}
    </span>
  );
}
