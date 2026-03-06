"use client";

import { motion } from "framer-motion";
import { Star, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PercentageDisplay } from "./PercentageDisplay";

interface MaterialData {
  id: string;
  material_name: string;
  quantity: number | null;
  unit: string;
  is_new_material?: boolean;
  is_base_ingredient?: boolean;
}

interface MaterialRowProps {
  material: MaterialData;
  onUpdate: (id: string, field: string, value: string | number | boolean) => void;
  onDelete: (id: string) => void;
  onToggleBase: (id: string) => void;
  bakerPercentage: number;
  engineeringPercentage: number;
}

const UNITS = ["g", "kg", "ml", "L", "und", "oz", "lb"];

export function MaterialRow({
  material,
  onUpdate,
  onDelete,
  onToggleBase,
  bakerPercentage,
  engineeringPercentage,
}: MaterialRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "bg-white/70 dark:bg-black/50",
        "backdrop-blur-xl",
        "border border-white/20 dark:border-white/10",
        "rounded-2xl",
        "p-4",
        "shadow-sm shadow-black/5",
        "hover:shadow-md hover:shadow-black/10",
        "transition-shadow duration-200"
      )}
    >
      {/* Mobile: stacked layout */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        {/* Material name + badges */}
        <div className="flex items-center gap-2 md:flex-1 md:min-w-0">
          {/* Base ingredient toggle */}
          <button
            type="button"
            onClick={() => onToggleBase(material.id)}
            className={cn(
              "flex-shrink-0 w-9 h-9 rounded-xl",
              "flex items-center justify-center",
              "transition-all duration-200",
              "active:scale-90",
              "focus:outline-none focus:ring-2 focus:ring-amber-500/50",
              material.is_base_ingredient
                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-500"
                : "bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-gray-600 hover:text-amber-400"
            )}
            aria-label={
              material.is_base_ingredient
                ? "Quitar como ingrediente base"
                : "Marcar como ingrediente base"
            }
          >
            <Star
              className="w-4.5 h-4.5"
              fill={material.is_base_ingredient ? "currentColor" : "none"}
            />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {material.material_name}
            </span>
            {material.is_new_material && (
              <Badge className="bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-400 border-lime-200 dark:border-lime-500/30 text-[10px] px-1.5 py-0 flex-shrink-0">
                Nuevo
              </Badge>
            )}
          </div>
        </div>

        {/* Quantity + unit */}
        <div className="flex items-center gap-2 md:w-48">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Cant."
            value={material.quantity ?? ""}
            onChange={(e) =>
              onUpdate(
                material.id,
                "quantity",
                e.target.value ? parseFloat(e.target.value) : 0
              )
            }
            className={cn(
              "h-10 rounded-xl text-sm font-medium",
              "bg-white/50 dark:bg-black/30",
              "border-gray-200/50 dark:border-white/10",
              "focus:ring-2 focus:ring-blue-500/50",
              "w-24"
            )}
            aria-label={`Cantidad de ${material.material_name}`}
          />
          <Select
            value={material.unit}
            onValueChange={(value) => onUpdate(material.id, "unit", value)}
          >
            <SelectTrigger
              className={cn(
                "h-10 w-20 rounded-xl text-sm",
                "bg-white/50 dark:bg-black/30",
                "border-gray-200/50 dark:border-white/10"
              )}
              aria-label={`Unidad de ${material.material_name}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Percentages */}
        <div className="flex items-center gap-2 md:w-auto">
          <PercentageDisplay
            bakerPercentage={bakerPercentage}
            engineeringPercentage={engineeringPercentage}
            isBase={material.is_base_ingredient}
          />
        </div>

        {/* Delete button */}
        <div className="flex items-center justify-end md:flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(material.id)}
            className={cn(
              "w-9 h-9 rounded-xl",
              "text-gray-400 dark:text-gray-500",
              "hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10",
              "active:scale-90 transition-all duration-150"
            )}
            aria-label={`Eliminar ${material.material_name}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
