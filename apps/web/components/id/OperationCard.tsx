"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface OperationData {
  id: string;
  name: string;
  step_number: number;
  description?: string;
  is_sub_product?: boolean;
  is_filling?: boolean;
  assigned_material_ids?: string[];
  target_temp_c?: number | null;
  target_time_min?: number | null;
}

interface MaterialOption {
  id: string;
  material_name: string;
}

interface OperationCardProps {
  operation: OperationData;
  onUpdate: (id: string, field: string, value: string | number | boolean | string[]) => void;
  onDelete: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  materials?: MaterialOption[];
  isFirst?: boolean;
  isLast?: boolean;
}

export function OperationCard({
  operation,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  materials = [],
  isFirst = false,
  isLast = false,
}: OperationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const assignedMaterials = materials.filter((m) =>
    operation.assigned_material_ids?.includes(m.id)
  );

  const toggleMaterial = (materialId: string) => {
    const current = operation.assigned_material_ids || [];
    const next = current.includes(materialId)
      ? current.filter((id) => id !== materialId)
      : [...current, materialId];
    onUpdate(operation.id, "assigned_material_ids", next);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "bg-white/70 dark:bg-black/50",
        "backdrop-blur-xl",
        "border border-white/20 dark:border-white/10",
        "rounded-2xl",
        "shadow-sm shadow-black/5",
        "overflow-hidden",
        "transition-shadow duration-200",
        expanded && "shadow-md shadow-black/10"
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 p-4">
        {/* Drag handle (desktop) / move arrows (mobile) */}
        <div className="flex-shrink-0 hidden md:flex items-center text-gray-300 dark:text-gray-600 cursor-grab">
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="flex-shrink-0 flex md:hidden flex-col gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onMoveUp?.(operation.id)}
            disabled={isFirst}
            className="w-7 h-7 rounded-lg"
            aria-label="Mover arriba"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onMoveDown?.(operation.id)}
            disabled={isLast}
            className="w-7 h-7 rounded-lg"
            aria-label="Mover abajo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Step number badge */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-xl",
            "bg-gray-900 dark:bg-white",
            "text-white dark:text-gray-900",
            "flex items-center justify-center",
            "text-xs font-bold"
          )}
        >
          {operation.step_number}
        </div>

        {/* Operation name */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {operation.name}
          </h4>
          {/* Toggle badges */}
          <div className="flex items-center gap-1.5 mt-1">
            {operation.is_sub_product && (
              <Badge className="bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/20 text-[10px] px-1.5 py-0">
                Sub-producto
              </Badge>
            )}
            {operation.is_filling && (
              <Badge className="bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/20 text-[10px] px-1.5 py-0">
                Relleno
              </Badge>
            )}
            {assignedMaterials.length > 0 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {assignedMaterials.length} materiales
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Desktop move arrows */}
          <div className="hidden md:flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMoveUp?.(operation.id)}
              disabled={isFirst}
              className="w-8 h-8 rounded-lg"
              aria-label="Mover arriba"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMoveDown?.(operation.id)}
              disabled={isLast}
              className="w-8 h-8 rounded-lg"
              aria-label="Mover abajo"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(operation.id)}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            aria-label={`Eliminar ${operation.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-lg"
            aria-label={expanded ? "Contraer" : "Expandir"}
          >
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </Button>
        </div>
      </div>

      {/* Assigned materials chips */}
      {assignedMaterials.length > 0 && !expanded && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {assignedMaterials.map((m) => (
            <span
              key={m.id}
              className={cn(
                "inline-flex items-center",
                "px-2 py-0.5 rounded-lg",
                "text-[10px] font-medium",
                "bg-blue-50 dark:bg-blue-500/10",
                "text-blue-600 dark:text-blue-300",
                "border border-blue-100 dark:border-blue-500/20"
              )}
            >
              {m.material_name}
            </span>
          ))}
        </div>
      )}

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-white/5 pt-4">
              {/* Operation name edit */}
              <div>
                <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Nombre
                </Label>
                <Input
                  value={operation.name}
                  onChange={(e) =>
                    onUpdate(operation.id, "name", e.target.value)
                  }
                  className="h-10 rounded-xl bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Descripcion
                </Label>
                <Textarea
                  value={operation.description || ""}
                  onChange={(e) =>
                    onUpdate(operation.id, "description", e.target.value)
                  }
                  placeholder="Instrucciones de la operacion..."
                  className="rounded-xl bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 resize-none min-h-[60px]"
                />
              </div>

              {/* Target temp and time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Temp. objetivo (C)
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={operation.target_temp_c ?? ""}
                    onChange={(e) =>
                      onUpdate(
                        operation.id,
                        "target_temp_c",
                        e.target.value ? parseFloat(e.target.value) : 0
                      )
                    }
                    placeholder="--"
                    className="h-10 rounded-xl bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Tiempo objetivo (min)
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={operation.target_time_min ?? ""}
                    onChange={(e) =>
                      onUpdate(
                        operation.id,
                        "target_time_min",
                        e.target.value ? parseInt(e.target.value) : 0
                      )
                    }
                    placeholder="--"
                    className="h-10 rounded-xl bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={operation.is_sub_product ?? false}
                    onCheckedChange={(val) =>
                      onUpdate(operation.id, "is_sub_product", val)
                    }
                    aria-label="Sub-producto"
                  />
                  <Label className="text-sm font-medium">Sub-producto</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={operation.is_filling ?? false}
                    onCheckedChange={(val) =>
                      onUpdate(operation.id, "is_filling", val)
                    }
                    aria-label="Relleno"
                  />
                  <Label className="text-sm font-medium">Relleno</Label>
                </div>
              </div>

              {/* Material assignment */}
              {materials.length > 0 && (
                <div>
                  <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                    Materiales asignados
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {materials.map((m) => {
                      const isAssigned =
                        operation.assigned_material_ids?.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMaterial(m.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-medium",
                            "border transition-all duration-150",
                            "active:scale-95",
                            "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                            isAssigned
                              ? "bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/20"
                              : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-blue-300"
                          )}
                        >
                          {m.material_name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
