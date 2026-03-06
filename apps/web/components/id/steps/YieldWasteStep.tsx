"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Scissors,
  BarChart3,
  Hash,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PrototypeMaterial } from "@/hooks/use-prototype-materials";
import type { PrototypeOperation } from "@/hooks/use-prototype-operations";
import {
  calculateTotalGrams,
  calculateYield,
  formatGrams,
  formatPercentage,
  type MaterialForCalc,
} from "@/lib/id-calculations";

interface YieldData {
  total_input_weight_grams: number | null;
  total_output_weight_grams: number | null;
  total_output_units: number | null;
  formulation_with_trim: boolean;
  weight_before_trim_grams: number | null;
  trim_weight_grams: number | null;
  notes: string;
}

interface YieldWasteStepProps {
  prototypeId: string;
  materials: PrototypeMaterial[];
  operations: PrototypeOperation[];
  yieldData: YieldData | null;
  onSave: (data: YieldData) => void;
}

export function YieldWasteStep({
  prototypeId,
  materials,
  operations,
  yieldData,
  onSave,
}: YieldWasteStepProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Calculate theoretical input from materials
  const theoreticalInput = useMemo(() => {
    const materialsForCalc: MaterialForCalc[] = materials.map((m) => ({
      original_quantity: m.original_quantity,
      unit_equivalence_grams: m.unit_equivalence_grams,
      is_base_ingredient: m.is_base_ingredient,
    }));
    return calculateTotalGrams(materialsForCalc);
  }, [materials]);

  const [data, setData] = useState<YieldData>(() => ({
    total_input_weight_grams:
      yieldData?.total_input_weight_grams ?? (theoreticalInput || null),
    total_output_weight_grams:
      yieldData?.total_output_weight_grams ?? null,
    total_output_units: yieldData?.total_output_units ?? null,
    formulation_with_trim: yieldData?.formulation_with_trim ?? false,
    weight_before_trim_grams: yieldData?.weight_before_trim_grams ?? null,
    trim_weight_grams: yieldData?.trim_weight_grams ?? null,
    notes: yieldData?.notes ?? "",
  }));

  // Computed yield and waste
  const yieldCalc = useMemo(() => {
    const input = data.total_input_weight_grams;
    const output = data.total_output_weight_grams;
    if (input && output && input > 0) {
      return calculateYield(input, output);
    }
    return null;
  }, [data.total_input_weight_grams, data.total_output_weight_grams]);

  const unitWeight = useMemo(() => {
    if (
      data.total_output_weight_grams &&
      data.total_output_units &&
      data.total_output_units > 0
    ) {
      return data.total_output_weight_grams / data.total_output_units;
    }
    return null;
  }, [data.total_output_weight_grams, data.total_output_units]);

  const trimAfter = useMemo(() => {
    if (data.weight_before_trim_grams != null && data.trim_weight_grams != null) {
      return Math.max(0, data.weight_before_trim_grams - data.trim_weight_grams);
    }
    return null;
  }, [data.weight_before_trim_grams, data.trim_weight_grams]);

  // Debounced auto-save
  const handleChange = useCallback(
    (field: keyof YieldData, value: any) => {
      setData((prev) => ({ ...prev, [field]: value }));

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setData((current) => {
          onSave(current);
          return current;
        });
      }, 800);
    },
    [onSave]
  );

  const handleNumericChange = useCallback(
    (field: keyof YieldData, rawValue: string) => {
      const value = rawValue === "" ? null : parseFloat(rawValue);
      handleChange(field, value);
    },
    [handleChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Expose save
  useEffect(() => {
    (window as any).__wizardStepSave = () => onSave(data);
    return () => {
      delete (window as any).__wizardStepSave;
    };
  }, [data, onSave]);

  // Difference vs planned
  const inputDiff = useMemo(() => {
    if (data.total_input_weight_grams && theoreticalInput > 0) {
      return data.total_input_weight_grams - theoreticalInput;
    }
    return null;
  }, [data.total_input_weight_grams, theoreticalInput]);

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
          Rendimiento y Merma
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Registra los pesos finales y calcula el rendimiento del prototipo.
        </p>
      </div>

      {/* Input weight */}
      <div
        className={cn(
          "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "rounded-2xl p-4 shadow-sm space-y-3"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-400" />
            <Label className="text-sm font-medium">
              Peso total entrada (g)
            </Label>
          </div>
          {theoreticalInput > 0 && (
            <span className="text-xs text-gray-400">
              Teorico: {formatGrams(theoreticalInput)}
            </span>
          )}
        </div>
        <Input
          type="number"
          inputMode="decimal"
          value={data.total_input_weight_grams ?? ""}
          onChange={(e) =>
            handleNumericChange("total_input_weight_grams", e.target.value)
          }
          placeholder={theoreticalInput > 0 ? String(theoreticalInput) : "0"}
          className={cn(
            "h-14 rounded-xl text-xl font-semibold text-center",
            "bg-white/50 dark:bg-black/30",
            "border border-gray-200/50 dark:border-white/10",
            "focus:ring-2 focus:ring-lime-500/50"
          )}
        />
        {inputDiff != null && inputDiff !== 0 && (
          <p
            className={cn(
              "text-xs font-medium text-center",
              inputDiff > 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {inputDiff > 0 ? "+" : ""}
            {formatGrams(inputDiff)} vs planificado
          </p>
        )}
      </div>

      {/* Output weight + units */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl p-4 shadow-sm space-y-2"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-green-400" />
            <Label className="text-xs font-medium text-gray-500">
              Peso salida (g)
            </Label>
          </div>
          <Input
            type="number"
            inputMode="decimal"
            value={data.total_output_weight_grams ?? ""}
            onChange={(e) =>
              handleNumericChange("total_output_weight_grams", e.target.value)
            }
            placeholder="0"
            className={cn(
              "h-14 rounded-xl text-xl font-semibold text-center",
              "bg-white/50 dark:bg-black/30",
              "border border-gray-200/50 dark:border-white/10",
              "focus:ring-2 focus:ring-lime-500/50"
            )}
          />
        </div>

        <div
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl p-4 shadow-sm space-y-2"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-purple-400" />
            <Label className="text-xs font-medium text-gray-500">
              Unidades
            </Label>
          </div>
          <Input
            type="number"
            inputMode="numeric"
            value={data.total_output_units ?? ""}
            onChange={(e) =>
              handleNumericChange("total_output_units", e.target.value)
            }
            placeholder="0"
            className={cn(
              "h-14 rounded-xl text-xl font-semibold text-center",
              "bg-white/50 dark:bg-black/30",
              "border border-gray-200/50 dark:border-white/10",
              "focus:ring-2 focus:ring-lime-500/50"
            )}
          />
        </div>
      </div>

      {/* Auto-calculated results */}
      {(yieldCalc || unitWeight) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "bg-gray-900 dark:bg-white/10 backdrop-blur-xl",
            "rounded-2xl p-5 shadow-sm"
          )}
        >
          <div className="grid grid-cols-2 gap-4">
            {yieldCalc && (
              <>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
                      Rendimiento
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    {formatPercentage(yieldCalc.yieldPercentage, 1)}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <TrendingDown className="w-4 h-4 text-orange-400" />
                    <span className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
                      Merma
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-orange-400">
                    {formatGrams(yieldCalc.wasteGrams)}
                  </p>
                  <p className="text-xs text-gray-500">
                    ({formatPercentage(yieldCalc.wastePercentage, 1)})
                  </p>
                </div>
              </>
            )}
            {unitWeight && (
              <div className="text-center col-span-2 pt-3 border-t border-white/10">
                <span className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
                  Peso por unidad
                </span>
                <p className="text-xl font-bold text-white">
                  {formatGrams(unitWeight)}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Trim section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-gray-400" />
            <Label className="text-sm font-medium">Recorte (Trim)</Label>
          </div>
          <Switch
            checked={data.formulation_with_trim}
            onCheckedChange={(checked) =>
              handleChange("formulation_with_trim", checked)
            }
          />
        </div>

        {data.formulation_with_trim && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
              "border border-white/20 dark:border-white/10",
              "rounded-2xl p-4 shadow-sm space-y-3"
            )}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">
                  Antes del recorte (g)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={data.weight_before_trim_grams ?? ""}
                  onChange={(e) =>
                    handleNumericChange(
                      "weight_before_trim_grams",
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className={cn(
                    "h-12 rounded-xl text-base font-medium text-center",
                    "bg-white/50 dark:bg-black/30",
                    "border border-gray-200/50 dark:border-white/10"
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">
                  Peso recorte (g)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={data.trim_weight_grams ?? ""}
                  onChange={(e) =>
                    handleNumericChange("trim_weight_grams", e.target.value)
                  }
                  placeholder="0"
                  className={cn(
                    "h-12 rounded-xl text-base font-medium text-center",
                    "bg-white/50 dark:bg-black/30",
                    "border border-gray-200/50 dark:border-white/10"
                  )}
                />
              </div>
            </div>

            {trimAfter != null && (
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                <span className="text-xs text-gray-500">Despues del recorte:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatGrams(trimAfter)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Planned vs Real comparison */}
      {theoreticalInput > 0 &&
        data.total_input_weight_grams &&
        data.total_output_weight_grams && (
          <div
            className={cn(
              "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
              "border border-white/20 dark:border-white/10",
              "rounded-2xl p-4 shadow-sm"
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Planificado vs Real
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Entrada planificada</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-400">
                    {formatGrams(theoreticalInput)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-300" />
                  <span className="font-bold text-gray-900 dark:text-white">
                    {formatGrams(data.total_input_weight_grams)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
    </motion.div>
  );
}
