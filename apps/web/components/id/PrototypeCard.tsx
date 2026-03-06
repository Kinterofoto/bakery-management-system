"use client";

import { motion } from "framer-motion";
import { Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PrototypeStatusBadge } from "./PrototypeStatusBadge";

interface PrototypeData {
  id: string;
  product_name: string;
  code?: string;
  status: string;
  version: number;
  created_at: string;
  current_step?: number;
  total_steps?: number;
}

interface PrototypeCardProps {
  prototype: PrototypeData;
  onClick: (id: string) => void;
}

export function PrototypeCard({ prototype, onClick }: PrototypeCardProps) {
  const {
    id,
    product_name,
    code,
    status,
    version,
    created_at,
    current_step = 0,
    total_steps = 9,
  } = prototype;

  const progressPercent =
    total_steps > 0 ? (current_step / total_steps) * 100 : 0;

  const formattedDate = new Date(created_at).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <motion.button
      type="button"
      onClick={() => onClick(id)}
      className={cn(
        "w-full text-left",
        "bg-white/70 dark:bg-black/50",
        "backdrop-blur-xl",
        "border border-white/20 dark:border-white/10",
        "rounded-2xl",
        "p-5",
        "shadow-sm shadow-black/5",
        "hover:shadow-lg hover:shadow-black/10",
        "hover:border-white/30 dark:hover:border-white/20",
        "active:scale-[0.98]",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
        "group"
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Top: Name + Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
            {product_name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {code && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {code}
              </Badge>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              v{version}
            </span>
          </div>
        </div>
        <PrototypeStatusBadge status={status} />
      </div>

      {/* Middle: Metadata */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formattedDate}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          Paso {current_step}/{total_steps}
        </span>
      </div>

      {/* Bottom: Progress bar */}
      <div className="relative h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "absolute left-0 top-0 bottom-0 rounded-full",
            progressPercent === 100
              ? "bg-green-500"
              : "bg-blue-500"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </motion.button>
  );
}
