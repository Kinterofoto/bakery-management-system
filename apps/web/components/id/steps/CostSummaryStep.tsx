"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Clock,
  Package,
  Calculator,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PrototypeMaterial } from "@/hooks/use-prototype-materials";
import type { PrototypeOperation } from "@/hooks/use-prototype-operations";
import {
  calculateMaterialCost,
  calculateLaborCost,
  calculateCostPerUnit,
  formatCurrency,
  formatTime,
  type MaterialForCalc,
  type OperationForCalc,
} from "@/lib/id-calculations";

interface CostData {
  labor_cost_per_minute: number;
  notes: string;
}

interface YieldData {
  total_output_units: number | null;
}

interface CostSummaryStepProps {
  prototypeId: string;
  materials: PrototypeMaterial[];
  operations: PrototypeOperation[];
  costData: CostData | null;
  yieldData: YieldData | null;
  onSave: (data: CostData) => void;
}

export function CostSummaryStep({
  prototypeId,
  materials,
  operations,
  costData,
  yieldData,
  onSave,
}: CostSummaryStepProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [laborRate, setLaborRate] = useState(
    costData?.labor_cost_per_minute ?? 0
  );

  // Compute costs
  const materialCostTotal = useMemo(() => {
    const materialsForCalc: MaterialForCalc[] = materials.map((m) => ({
      original_quantity: m.original_quantity,
      unit_equivalence_grams: m.unit_equivalence_grams,
      is_base_ingredient: m.is_base_ingredient,
      unit_cost: m.unit_cost,
    }));
    return calculateMaterialCost(materialsForCalc);
  }, [materials]);

  const laborCalc = useMemo(() => {
    const opsForCalc: OperationForCalc[] = operations.map((op) => ({
      duration_minutes: op.duration_minutes,
      people_count: op.people_count,
      timer_elapsed_seconds: op.timer_elapsed_seconds,
      input_weight_grams: op.input_weight_grams,
      output_weight_grams: op.output_weight_grams,
    }));
    return calculateLaborCost(opsForCalc, laborRate);
  }, [operations, laborRate]);

  const totalCost = materialCostTotal + laborCalc.totalLaborCost;

  const perUnit = useMemo(() => {
    const units = yieldData?.total_output_units ?? 0;
    return calculateCostPerUnit(
      materialCostTotal,
      laborCalc.totalLaborCost,
      units
    );
  }, [materialCostTotal, laborCalc.totalLaborCost, yieldData]);

  // Debounced save
  const handleRateChange = useCallback(
    (value: string) => {
      const rate = value === "" ? 0 : parseFloat(value);
      setLaborRate(rate);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSave({ labor_cost_per_minute: rate, notes: "" });
      }, 800);
    },
    [onSave]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Expose save
  useEffect(() => {
    (window as any).__wizardStepSave = () =>
      onSave({ labor_cost_per_minute: laborRate, notes: "" });
    return () => {
      delete (window as any).__wizardStepSave;
    };
  }, [laborRate, onSave]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6 pb-32 md:pb-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Resumen de Costos
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Revision del costeo del prototipo basado en materiales y mano de obra.
        </p>
      </div>

      {/* Labor rate input */}
      <div
        className={cn(
          "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "rounded-2xl p-4 shadow-sm space-y-3"
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <Label className="text-sm font-medium">
            Costo mano de obra ($/min)
          </Label>
        </div>
        <Input
          type="number"
          inputMode="decimal"
          value={laborRate || ""}
          onChange={(e) => handleRateChange(e.target.value)}
          placeholder="0"
          className={cn(
            "h-14 rounded-xl text-xl font-semibold text-center",
            "bg-white/50 dark:bg-black/30",
            "border border-gray-200/50 dark:border-white/10",
            "focus:ring-2 focus:ring-lime-500/50"
          )}
        />
        <p className="text-xs text-gray-400 text-center">
          Tiempo total de MO:{" "}
          {laborCalc.totalLaborMinutes.toFixed(1)} min
        </p>
      </div>

      {/* Material cost breakdown table */}
      <div
        className={cn(
          "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "rounded-2xl shadow-sm overflow-hidden"
        )}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-lime-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Desglose de Materiales
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {materials.map((mat) => (
            <div
              key={mat.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {mat.material_name}
                </p>
                <p className="text-xs text-gray-400">
                  {mat.original_quantity}g x{" "}
                  {formatCurrency(mat.unit_cost ?? 0)}/u
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white ml-3">
                {formatCurrency(mat.total_cost ?? 0)}
              </span>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Total Materiales
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {formatCurrency(materialCostTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={cn(
            "bg-blue-500/10 border border-blue-500/20",
            "rounded-2xl p-4 text-center"
          )}
        >
          <Package className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-[10px] uppercase tracking-wide font-medium text-blue-600 dark:text-blue-400">
            Total MP
          </p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {formatCurrency(materialCostTotal)}
          </p>
        </div>

        <div
          className={cn(
            "bg-purple-500/10 border border-purple-500/20",
            "rounded-2xl p-4 text-center"
          )}
        >
          <Clock className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-[10px] uppercase tracking-wide font-medium text-purple-600 dark:text-purple-400">
            Total MO
          </p>
          <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
            {formatCurrency(laborCalc.totalLaborCost)}
          </p>
        </div>

        <div
          className={cn(
            "bg-lime-500/10 border border-lime-500/20",
            "rounded-2xl p-4 text-center"
          )}
        >
          <Calculator className="w-5 h-5 text-lime-500 mx-auto mb-1" />
          <p className="text-[10px] uppercase tracking-wide font-medium text-lime-600 dark:text-lime-400">
            Costo Total
          </p>
          <p className="text-xl font-bold text-lime-700 dark:text-lime-300">
            {formatCurrency(totalCost)}
          </p>
        </div>

        <div
          className={cn(
            "bg-orange-500/10 border border-orange-500/20",
            "rounded-2xl p-4 text-center"
          )}
        >
          <TrendingUp className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className="text-[10px] uppercase tracking-wide font-medium text-orange-600 dark:text-orange-400">
            Por Unidad
          </p>
          <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
            {perUnit.totalCostPerUnit > 0
              ? formatCurrency(perUnit.totalCostPerUnit)
              : "--"}
          </p>
          {perUnit.totalCostPerUnit > 0 && (
            <p className="text-[10px] text-orange-500 mt-0.5">
              MP: {formatCurrency(perUnit.materialCostPerUnit)} + MO:{" "}
              {formatCurrency(perUnit.laborCostPerUnit)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
