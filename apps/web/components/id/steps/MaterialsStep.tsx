"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Star,
  Trash2,
  GripVertical,
  Package,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PrototypeMaterial, PrototypeMaterialInsert } from "@/hooks/use-prototype-materials";
import {
  calculateBakerPercentages,
  calculateEngineeringPercentages,
  calculateTotalGrams,
  formatPercentage,
  formatGrams,
  formatCurrency,
  toGrams,
  type MaterialForCalc,
} from "@/lib/id-calculations";

interface CatalogMaterial {
  id: string;
  name: string;
  category: string;
}

interface LocalMaterial {
  tempId: string;
  material_id: string | null;
  material_name: string;
  is_new_material: boolean;
  is_base_ingredient: boolean;
  original_quantity: number;
  unit_name: string;
  unit_equivalence_grams: number;
  unit_cost: number | null;
  display_order: number;
}

interface MaterialsStepProps {
  prototypeId: string;
  initialMaterials: PrototypeMaterial[];
  onSave: (materials: PrototypeMaterialInsert[]) => void;
}

export function MaterialsStep({
  prototypeId,
  initialMaterials,
  onSave,
}: MaterialsStepProps) {
  const [catalogMaterials, setCatalogMaterials] = useState<CatalogMaterial[]>(
    []
  );
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [materials, setMaterials] = useState<LocalMaterial[]>(() =>
    initialMaterials.length > 0
      ? initialMaterials.map((m, i) => ({
          tempId: m.id,
          material_id: m.material_id,
          material_name: m.material_name ?? "",
          is_new_material: m.is_new_material,
          is_base_ingredient: m.is_base_ingredient,
          original_quantity: m.original_quantity,
          unit_name: m.unit_name ?? "gramos",
          unit_equivalence_grams: m.unit_equivalence_grams,
          unit_cost: m.unit_cost,
          display_order: m.display_order ?? i + 1,
        }))
      : []
  );
  const [addSearchOpen, setAddSearchOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");

  // Fetch catalog materials
  useEffect(() => {
    async function fetchCatalog() {
      setCatalogLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, name, category")
        .eq("category", "MP")
        .order("name");
      setCatalogMaterials((data as CatalogMaterial[]) || []);
      setCatalogLoading(false);
    }
    fetchCatalog();
  }, []);

  // Computed percentages
  const calculations = useMemo(() => {
    const materialsForCalc: MaterialForCalc[] = materials.map((m) => ({
      original_quantity: m.original_quantity,
      unit_equivalence_grams: m.unit_equivalence_grams,
      is_base_ingredient: m.is_base_ingredient,
      unit_cost: m.unit_cost,
    }));

    const bakerPct = calculateBakerPercentages(materialsForCalc);
    const engPct = calculateEngineeringPercentages(materialsForCalc);
    const totalGrams = calculateTotalGrams(materialsForCalc);
    const totalCost = materials.reduce(
      (sum, m) => sum + (m.original_quantity || 0) * (m.unit_cost || 0),
      0
    );

    return { bakerPct, engPct, totalGrams, totalCost };
  }, [materials]);

  const hasBaseIngredient = materials.some((m) => m.is_base_ingredient);

  const handleAddCatalogMaterial = useCallback(
    (product: CatalogMaterial) => {
      const newMaterial: LocalMaterial = {
        tempId: crypto.randomUUID(),
        material_id: product.id,
        material_name: product.name,
        is_new_material: false,
        is_base_ingredient: materials.length === 0,
        original_quantity: 0,
        unit_name: "gramos",
        unit_equivalence_grams: 1,
        unit_cost: null,
        display_order: materials.length + 1,
      };
      setMaterials((prev) => [...prev, newMaterial]);
      setAddSearchOpen(false);
    },
    [materials.length]
  );

  const handleAddNewMaterial = useCallback(() => {
    if (!newMaterialName.trim()) return;
    const newMaterial: LocalMaterial = {
      tempId: crypto.randomUUID(),
      material_id: null,
      material_name: newMaterialName.trim(),
      is_new_material: true,
      is_base_ingredient: materials.length === 0,
      original_quantity: 0,
      unit_name: "gramos",
      unit_equivalence_grams: 1,
      unit_cost: null,
      display_order: materials.length + 1,
    };
    setMaterials((prev) => [...prev, newMaterial]);
    setNewMaterialName("");
    setIsAddingNew(false);
  }, [newMaterialName, materials.length]);

  const handleRemoveMaterial = useCallback((tempId: string) => {
    setMaterials((prev) => prev.filter((m) => m.tempId !== tempId));
  }, []);

  const handleUpdateMaterial = useCallback(
    (tempId: string, field: keyof LocalMaterial, value: any) => {
      setMaterials((prev) =>
        prev.map((m) => {
          if (m.tempId !== tempId) return m;
          return { ...m, [field]: value };
        })
      );
    },
    []
  );

  const handleSetBase = useCallback((tempId: string) => {
    setMaterials((prev) =>
      prev.map((m) => ({
        ...m,
        is_base_ingredient: m.tempId === tempId,
      }))
    );
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setMaterials((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((m, i) => ({ ...m, display_order: i + 1 }));
    });
  }, []);

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= materials.length - 1) return;
      setMaterials((prev) => {
        const next = [...prev];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        return next.map((m, i) => ({ ...m, display_order: i + 1 }));
      });
    },
    [materials.length]
  );

  // Expose save to parent
  const handleSave = useCallback(() => {
    const inserts: PrototypeMaterialInsert[] = materials.map((m) => ({
      prototype_id: prototypeId,
      material_id: m.material_id,
      material_name: m.material_name,
      is_new_material: m.is_new_material,
      is_base_ingredient: m.is_base_ingredient,
      original_quantity: m.original_quantity,
      unit_name: m.unit_name,
      unit_equivalence_grams: m.unit_equivalence_grams,
      unit_cost: m.unit_cost,
      display_order: m.display_order,
    }));
    onSave(inserts);
  }, [materials, prototypeId, onSave]);

  useEffect(() => {
    (window as any).__wizardStepSave = handleSave;
    return () => {
      delete (window as any).__wizardStepSave;
    };
  }, [handleSave]);

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
          Formulacion
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Define los materiales y cantidades para la receta del prototipo.
        </p>
      </div>

      {/* Validation warning */}
      {materials.length > 0 && !hasBaseIngredient && (
        <div
          className={cn(
            "flex items-center gap-3 p-4 rounded-2xl",
            "bg-orange-500/10 border border-orange-500/20"
          )}
        >
          <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Selecciona un ingrediente base para calcular el porcentaje panadero.
          </p>
        </div>
      )}

      {/* Materials list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {materials.map((material, index) => (
            <motion.div
              key={material.tempId}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
                "border rounded-2xl p-4 shadow-sm",
                material.is_base_ingredient
                  ? "border-lime-500/30 bg-lime-500/5"
                  : "border-white/20 dark:border-white/10"
              )}
            >
              {/* Row header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      aria-label="Mover arriba"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                      {material.material_name}
                    </span>
                    {material.is_new_material && (
                      <span className="text-[10px] font-medium bg-lime-500/15 text-lime-700 dark:text-lime-400 px-1.5 py-0.5 rounded-md">
                        Nuevo
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetBase(material.tempId)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all duration-150",
                      material.is_base_ingredient
                        ? "text-lime-500 bg-lime-500/10"
                        : "text-gray-300 hover:text-lime-400 hover:bg-lime-500/5"
                    )}
                    title="Ingrediente base"
                    aria-label={
                      material.is_base_ingredient
                        ? "Es el ingrediente base"
                        : "Marcar como ingrediente base"
                    }
                  >
                    <Star
                      className="w-4 h-4"
                      fill={material.is_base_ingredient ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveMaterial(material.tempId)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-500/5 transition-all duration-150"
                    aria-label="Eliminar material"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quantity and cost inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Cantidad (g)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={material.original_quantity || ""}
                    onChange={(e) =>
                      handleUpdateMaterial(
                        material.tempId,
                        "original_quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                    className={cn(
                      "h-12 rounded-xl text-base font-medium",
                      "bg-white/50 dark:bg-black/30",
                      "border border-gray-200/50 dark:border-white/10",
                      "focus:ring-2 focus:ring-lime-500/50"
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">
                    Costo unitario
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={material.unit_cost ?? ""}
                    onChange={(e) =>
                      handleUpdateMaterial(
                        material.tempId,
                        "unit_cost",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    placeholder="$ 0"
                    className={cn(
                      "h-12 rounded-xl text-base",
                      "bg-white/50 dark:bg-black/30",
                      "border border-gray-200/50 dark:border-white/10",
                      "focus:ring-2 focus:ring-lime-500/50"
                    )}
                  />
                </div>
              </div>

              {/* Percentage display */}
              {material.original_quantity > 0 && (
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
                      Panadero
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatPercentage(calculations.bakerPct[index] ?? 0, 1)}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
                      Ingenieria
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatPercentage(calculations.engPct[index] ?? 0, 1)}
                    </span>
                  </div>
                  {material.unit_cost != null && material.unit_cost > 0 && (
                    <>
                      <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
                          Costo
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(
                            material.original_quantity * (material.unit_cost || 0)
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add material */}
      <div className="space-y-3">
        {!isAddingNew ? (
          <div className="flex gap-3">
            <Popover open={addSearchOpen} onOpenChange={setAddSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 h-14 rounded-xl gap-2",
                    "border-dashed border-2 border-gray-200 dark:border-white/10",
                    "text-gray-500 hover:text-lime-600 hover:border-lime-500/30",
                    "hover:bg-lime-500/5 transition-all duration-150"
                  )}
                >
                  <Search className="w-4 h-4" />
                  Buscar Material
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Buscar materia prima..." />
                  <CommandList>
                    <CommandEmpty>
                      {catalogLoading
                        ? "Cargando..."
                        : "No se encontraron materiales."}
                    </CommandEmpty>
                    <CommandGroup>
                      {catalogMaterials.map((cm) => (
                        <CommandItem
                          key={cm.id}
                          value={cm.name}
                          onSelect={() => handleAddCatalogMaterial(cm)}
                          className="py-3"
                        >
                          <span className="text-sm">{cm.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              onClick={() => setIsAddingNew(true)}
              className={cn(
                "h-14 rounded-xl gap-2 px-4",
                "border-dashed border-2 border-gray-200 dark:border-white/10",
                "text-gray-500 hover:text-lime-600 hover:border-lime-500/30",
                "hover:bg-lime-500/5 transition-all duration-150"
              )}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "flex gap-3 p-4 rounded-2xl",
              "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
              "border border-lime-500/20"
            )}
          >
            <Input
              value={newMaterialName}
              onChange={(e) => setNewMaterialName(e.target.value)}
              placeholder="Nombre del material nuevo..."
              onKeyDown={(e) => e.key === "Enter" && handleAddNewMaterial()}
              autoFocus
              className={cn(
                "flex-1 h-12 rounded-xl text-base",
                "bg-white/50 dark:bg-black/30",
                "border border-gray-200/50 dark:border-white/10",
                "focus:ring-2 focus:ring-lime-500/50"
              )}
            />
            <Button
              onClick={handleAddNewMaterial}
              disabled={!newMaterialName.trim()}
              className="h-12 rounded-xl bg-lime-500 hover:bg-lime-600 text-white px-4"
            >
              Agregar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddingNew(false);
                setNewMaterialName("");
              }}
              className="h-12 rounded-xl px-3"
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Totals bar */}
      {materials.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "bg-gray-900 dark:bg-white/10 backdrop-blur-xl",
            "rounded-2xl p-4 shadow-sm",
            "flex items-center justify-between"
          )}
        >
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
                Total
              </p>
              <p className="text-lg font-bold text-white">
                {formatGrams(calculations.totalGrams)}
              </p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
                Materiales
              </p>
              <p className="text-lg font-bold text-white">
                {materials.length}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide font-medium text-gray-400 text-right">
              Costo Est.
            </p>
            <p className="text-lg font-bold text-lime-400">
              {formatCurrency(calculations.totalCost)}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
