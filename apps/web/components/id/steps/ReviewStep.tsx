"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Package,
  Layers,
  Star,
  Scale,
  Box,
  DollarSign,
  Clock,
  CheckCircle2,
  Save,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Prototype } from "@/hooks/use-prototypes";
import type { PrototypeMaterial } from "@/hooks/use-prototype-materials";
import type { PrototypeOperation } from "@/hooks/use-prototype-operations";
import type { PrototypePhoto } from "@/hooks/use-prototype-photos";
import {
  formatPercentage,
  formatGrams,
  formatCurrency,
  formatTime,
  calculateMaterialCost,
  calculateLaborCost,
  calculateCostPerUnit,
  calculateYield,
  calculateTotalGrams,
  type MaterialForCalc,
  type OperationForCalc,
} from "@/lib/id-calculations";

interface QualityData {
  texture_score: number | null;
  color_score: number | null;
  appearance_score: number | null;
  taste_score: number | null;
  aroma_score: number | null;
  crumb_structure_score: number | null;
  overall_notes: string;
}

interface YieldData {
  total_input_weight_grams: number | null;
  total_output_weight_grams: number | null;
  total_output_units: number | null;
}

interface CostData {
  labor_cost_per_minute: number;
}

interface ReviewStepProps {
  prototypeId: string;
  prototype: Prototype | null;
  materials: PrototypeMaterial[];
  operations: PrototypeOperation[];
  photos: PrototypePhoto[];
  qualityData: QualityData | null;
  yieldData: YieldData | null;
  costData: CostData | null;
  onSaveDraft: () => void;
  onFinalize: () => void;
  onMigrateToProduction: () => void;
  loading: boolean;
}

function ScoreStars({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-gray-400">--</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={cn(
            "w-3.5 h-3.5",
            v <= score ? "text-lime-500" : "text-gray-200 dark:text-gray-700"
          )}
          fill={v <= score ? "currentColor" : "none"}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-900 dark:text-white">
        {score}
      </span>
    </div>
  );
}

export function ReviewStep({
  prototypeId,
  prototype,
  materials,
  operations,
  photos,
  qualityData,
  yieldData,
  costData,
  onSaveDraft,
  onFinalize,
  onMigrateToProduction,
  loading,
}: ReviewStepProps) {
  // Compute summaries
  const totalGrams = useMemo(() => {
    const mats: MaterialForCalc[] = materials.map((m) => ({
      original_quantity: m.original_quantity,
      unit_equivalence_grams: m.unit_equivalence_grams,
      is_base_ingredient: m.is_base_ingredient,
      unit_cost: m.unit_cost,
    }));
    return calculateTotalGrams(mats);
  }, [materials]);

  const materialCost = useMemo(() => {
    const mats: MaterialForCalc[] = materials.map((m) => ({
      original_quantity: m.original_quantity,
      unit_equivalence_grams: m.unit_equivalence_grams,
      is_base_ingredient: m.is_base_ingredient,
      unit_cost: m.unit_cost,
    }));
    return calculateMaterialCost(mats);
  }, [materials]);

  const laborCalc = useMemo(() => {
    const ops: OperationForCalc[] = operations.map((op) => ({
      duration_minutes: op.duration_minutes,
      people_count: op.people_count,
      timer_elapsed_seconds: op.timer_elapsed_seconds,
    }));
    return calculateLaborCost(ops, costData?.labor_cost_per_minute ?? 0);
  }, [operations, costData]);

  const yieldCalc = useMemo(() => {
    if (
      yieldData?.total_input_weight_grams &&
      yieldData?.total_output_weight_grams
    ) {
      return calculateYield(
        yieldData.total_input_weight_grams,
        yieldData.total_output_weight_grams
      );
    }
    return null;
  }, [yieldData]);

  const perUnit = useMemo(() => {
    return calculateCostPerUnit(
      materialCost,
      laborCalc.totalLaborCost,
      yieldData?.total_output_units ?? 0
    );
  }, [materialCost, laborCalc, yieldData]);

  const avgQuality = useMemo(() => {
    if (!qualityData) return null;
    const scores = [
      qualityData.texture_score,
      qualityData.color_score,
      qualityData.appearance_score,
      qualityData.taste_score,
      qualityData.aroma_score,
      qualityData.crumb_structure_score,
    ].filter((s): s is number => s != null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [qualityData]);

  const totalTime = useMemo(() => {
    return operations.reduce(
      (sum, op) => sum + (op.timer_elapsed_seconds || 0),
      0
    );
  }, [operations]);

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
          Revision Final
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Resumen completo del prototipo. Revisa antes de finalizar.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl p-4 text-center shadow-sm"
          )}
        >
          <p className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
            Costo Total
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(materialCost + laborCalc.totalLaborCost)}
          </p>
        </div>
        <div
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl p-4 text-center shadow-sm"
          )}
        >
          <p className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
            Costo/Unidad
          </p>
          <p className="text-xl font-bold text-lime-600 dark:text-lime-400">
            {perUnit.totalCostPerUnit > 0
              ? formatCurrency(perUnit.totalCostPerUnit)
              : "--"}
          </p>
        </div>
        <div
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl p-4 text-center shadow-sm"
          )}
        >
          <p className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
            Rendimiento
          </p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {yieldCalc ? formatPercentage(yieldCalc.yieldPercentage, 1) : "--"}
          </p>
        </div>
        <div
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl p-4 text-center shadow-sm"
          )}
        >
          <p className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
            Calidad Prom.
          </p>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
            {avgQuality != null ? `${avgQuality.toFixed(1)}/5` : "--"}
          </p>
        </div>
      </div>

      {/* Accordion sections */}
      <Accordion type="multiple" defaultValue={["product"]} className="space-y-3">
        {/* Product info */}
        <AccordionItem
          value="product"
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl shadow-sm overflow-hidden",
            "data-[state=open]:shadow-md"
          )}
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-lime-500" />
              <span className="text-sm font-semibold">Producto</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Nombre</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {prototype?.product_name || "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Codigo</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {prototype?.code || "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Categoria</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {prototype?.product_category === "PT"
                    ? "Producto Terminado"
                    : "Producto en Proceso"}
                </span>
              </div>
              {prototype?.description && (
                <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                  <p className="text-gray-500 text-xs mb-1">Descripcion</p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {prototype.description}
                  </p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Formulation */}
        <AccordionItem
          value="formulation"
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl shadow-sm overflow-hidden"
          )}
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold">
                Formulacion ({materials.length} materiales)
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {/* Table */}
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5">
                    <th className="text-left py-2 text-xs font-medium text-gray-500">
                      Material
                    </th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500">
                      Cant. (g)
                    </th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500">
                      Panadero
                    </th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500">
                      Ing.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {materials.map((mat) => (
                    <tr key={mat.id}>
                      <td className="py-2 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-1">
                          {mat.is_base_ingredient && (
                            <Star className="w-3 h-3 text-lime-500" fill="currentColor" />
                          )}
                          <span className="truncate max-w-[120px]">
                            {mat.material_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {mat.original_quantity}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatPercentage(mat.baker_percentage ?? 0, 1)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatPercentage(mat.engineering_percentage ?? 0, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-white/10 font-semibold">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{formatGrams(totalGrams)}</td>
                    <td className="py-2 text-right">--</td>
                    <td className="py-2 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Operations timeline */}
        <AccordionItem
          value="operations"
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl shadow-sm overflow-hidden"
          )}
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold">
                Proceso ({operations.length} operaciones · {formatTime(totalTime)})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3">
              {operations.map((op, i) => {
                const opPhotos = photos.filter(
                  (p) => p.prototype_operation_id === op.id
                );
                return (
                  <div
                    key={op.id}
                    className="flex gap-3 items-start"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                        "bg-lime-500/15 text-lime-600"
                      )}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {op.operation_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {op.timer_elapsed_seconds != null &&
                          op.timer_elapsed_seconds > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(op.timer_elapsed_seconds)}
                            </span>
                          )}
                        {op.input_weight_grams && (
                          <span>
                            {formatGrams(op.input_weight_grams)} entrada
                          </span>
                        )}
                        {op.output_weight_grams && (
                          <span>
                            {formatGrams(op.output_weight_grams)} salida
                          </span>
                        )}
                      </div>
                      {opPhotos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {opPhotos.slice(0, 3).map((photo) => (
                            <div
                              key={photo.id}
                              className="w-12 h-12 rounded-lg overflow-hidden border border-white/20"
                            >
                              <img
                                src={photo.photo_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {opPhotos.length > 3 && (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-500">
                                +{opPhotos.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Quality */}
        {qualityData && (
          <AccordionItem
            value="quality"
            className={cn(
              "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
              "border border-white/20 dark:border-white/10",
              "rounded-2xl shadow-sm overflow-hidden"
            )}
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold">Calidad</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2">
                {[
                  { label: "Textura", score: qualityData.texture_score },
                  { label: "Color", score: qualityData.color_score },
                  { label: "Apariencia", score: qualityData.appearance_score },
                  { label: "Sabor", score: qualityData.taste_score },
                  { label: "Aroma", score: qualityData.aroma_score },
                  {
                    label: "Estructura de miga",
                    score: qualityData.crumb_structure_score,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <ScoreStars score={item.score} />
                  </div>
                ))}
              </div>
              {qualityData.overall_notes && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                  <p className="text-xs text-gray-400 mb-1">Notas</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {qualityData.overall_notes}
                  </p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Yield */}
        <AccordionItem
          value="yield"
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl shadow-sm overflow-hidden"
          )}
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3">
              <Scale className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold">
                Rendimiento y Merma
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Entrada</span>
                <span className="font-medium">
                  {yieldData?.total_input_weight_grams
                    ? formatGrams(yieldData.total_input_weight_grams)
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Salida</span>
                <span className="font-medium">
                  {yieldData?.total_output_weight_grams
                    ? formatGrams(yieldData.total_output_weight_grams)
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Unidades</span>
                <span className="font-medium">
                  {yieldData?.total_output_units ?? "--"}
                </span>
              </div>
              {yieldCalc && (
                <>
                  <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-white/5">
                    <span className="text-gray-500">Rendimiento</span>
                    <span className="font-bold text-green-600">
                      {formatPercentage(yieldCalc.yieldPercentage, 1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Merma</span>
                    <span className="font-medium text-orange-500">
                      {formatGrams(yieldCalc.wasteGrams)} (
                      {formatPercentage(yieldCalc.wastePercentage, 1)})
                    </span>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Cost */}
        <AccordionItem
          value="cost"
          className={cn(
            "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
            "border border-white/20 dark:border-white/10",
            "rounded-2xl shadow-sm overflow-hidden"
          )}
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-lime-500" />
              <span className="text-sm font-semibold">Costos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Materiales</span>
                <span className="font-medium">
                  {formatCurrency(materialCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mano de obra</span>
                <span className="font-medium">
                  {formatCurrency(laborCalc.totalLaborCost)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-white/5 font-bold">
                <span>Total</span>
                <span>
                  {formatCurrency(materialCost + laborCalc.totalLaborCost)}
                </span>
              </div>
              {perUnit.totalCostPerUnit > 0 && (
                <div className="flex justify-between text-lime-600 dark:text-lime-400 font-bold">
                  <span>Por unidad</span>
                  <span>{formatCurrency(perUnit.totalCostPerUnit)}</span>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Packaging */}
        {(prototype?.units_per_flow_pack || prototype?.units_per_box) && (
          <AccordionItem
            value="packaging"
            className={cn(
              "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
              "border border-white/20 dark:border-white/10",
              "rounded-2xl shadow-sm overflow-hidden"
            )}
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <Box className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold">Empaque</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Und/Flow Pack</span>
                  <span className="font-medium">
                    {prototype.units_per_flow_pack ?? "--"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Und/Caja</span>
                  <span className="font-medium">
                    {prototype.units_per_box ?? "--"}
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Action buttons */}
      <div className="space-y-3 pt-4">
        <Button
          onClick={onFinalize}
          disabled={loading}
          className={cn(
            "w-full h-14 rounded-2xl text-base font-bold gap-2",
            "bg-lime-500 hover:bg-lime-600 text-white",
            "shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-500/40",
            "active:scale-[0.98] transition-all duration-150"
          )}
        >
          <CheckCircle2 className="w-5 h-5" />
          Finalizar Prototipo
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={loading}
            className={cn(
              "flex-1 h-12 rounded-xl gap-2",
              "border border-gray-200 dark:border-white/10"
            )}
          >
            <Save className="w-4 h-4" />
            Guardar Borrador
          </Button>

          <Button
            variant="outline"
            onClick={onMigrateToProduction}
            disabled={loading || prototype?.status !== "approved"}
            className={cn(
              "flex-1 h-12 rounded-xl gap-2",
              "border border-blue-500/30 text-blue-600 dark:text-blue-400",
              "hover:bg-blue-500/5",
              prototype?.status !== "approved" && "opacity-50 cursor-not-allowed"
            )}
          >
            <ArrowUpRight className="w-4 h-4" />
            Migrar a Produccion
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
