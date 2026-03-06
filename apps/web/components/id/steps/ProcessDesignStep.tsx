"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  Trash2,
  Play,
  Layers,
  PieChart,
  Settings2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
import type { PrototypeOperation, PrototypeOperationInsert } from "@/hooks/use-prototype-operations";
import type { PrototypeMaterial } from "@/hooks/use-prototype-materials";

interface CatalogOperation {
  id: string;
  name: string;
}

interface LocalOperation {
  tempId: string;
  operation_id: string | null;
  operation_name: string;
  is_custom_operation: boolean;
  step_number: number;
  produces_sub_product: boolean;
  sub_product_name: string;
  is_filling: boolean;
  has_trim: boolean;
  instructions: string;
  assigned_material_ids: string[];
}

interface ProcessDesignStepProps {
  prototypeId: string;
  operations: PrototypeOperation[];
  materials: PrototypeMaterial[];
  onSave: (operations: PrototypeOperationInsert[]) => void;
  onStartLive: () => void;
}

export function ProcessDesignStep({
  prototypeId,
  operations: initialOperations,
  materials,
  onSave,
  onStartLive,
}: ProcessDesignStepProps) {
  const [catalogOps, setCatalogOps] = useState<CatalogOperation[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [addSearchOpen, setAddSearchOpen] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");

  const [operations, setOperations] = useState<LocalOperation[]>(() =>
    initialOperations.length > 0
      ? initialOperations.map((op) => ({
          tempId: op.id,
          operation_id: op.operation_id,
          operation_name: op.operation_name ?? "",
          is_custom_operation: op.is_custom_operation,
          step_number: op.step_number,
          produces_sub_product: op.produces_sub_product,
          sub_product_name: op.sub_product_name ?? "",
          is_filling: op.is_filling,
          has_trim: op.has_trim,
          instructions: op.instructions ?? "",
          assigned_material_ids: [],
        }))
      : []
  );

  // Expanded card state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch catalog operations
  useEffect(() => {
    async function fetchCatalog() {
      setCatalogLoading(true);
      const { data } = await supabase
        .schema("produccion")
        .from("operations")
        .select("id, name")
        .order("name");
      setCatalogOps((data as CatalogOperation[]) || []);
      setCatalogLoading(false);
    }
    fetchCatalog();
  }, []);

  const handleAddCatalogOp = useCallback(
    (op: CatalogOperation) => {
      const newOp: LocalOperation = {
        tempId: crypto.randomUUID(),
        operation_id: op.id,
        operation_name: op.name,
        is_custom_operation: false,
        step_number: operations.length + 1,
        produces_sub_product: false,
        sub_product_name: "",
        is_filling: false,
        has_trim: false,
        instructions: "",
        assigned_material_ids: [],
      };
      setOperations((prev) => [...prev, newOp]);
      setAddSearchOpen(false);
    },
    [operations.length]
  );

  const handleAddCustomOp = useCallback(() => {
    if (!customName.trim()) return;
    const newOp: LocalOperation = {
      tempId: crypto.randomUUID(),
      operation_id: null,
      operation_name: customName.trim(),
      is_custom_operation: true,
      step_number: operations.length + 1,
      produces_sub_product: false,
      sub_product_name: "",
      is_filling: false,
      has_trim: false,
      instructions: "",
      assigned_material_ids: [],
    };
    setOperations((prev) => [...prev, newOp]);
    setCustomName("");
    setIsAddingCustom(false);
  }, [customName, operations.length]);

  const handleRemoveOp = useCallback((tempId: string) => {
    setOperations((prev) => {
      const filtered = prev.filter((o) => o.tempId !== tempId);
      return filtered.map((o, i) => ({ ...o, step_number: i + 1 }));
    });
  }, []);

  const handleUpdateOp = useCallback(
    (tempId: string, field: keyof LocalOperation, value: any) => {
      setOperations((prev) =>
        prev.map((o) => (o.tempId === tempId ? { ...o, [field]: value } : o))
      );
    },
    []
  );

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setOperations((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((o, i) => ({ ...o, step_number: i + 1 }));
    });
  }, []);

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= operations.length - 1) return;
      setOperations((prev) => {
        const next = [...prev];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        return next.map((o, i) => ({ ...o, step_number: i + 1 }));
      });
    },
    [operations.length]
  );

  const toggleMaterialAssignment = useCallback(
    (opTempId: string, materialId: string) => {
      setOperations((prev) =>
        prev.map((o) => {
          if (o.tempId !== opTempId) return o;
          const has = o.assigned_material_ids.includes(materialId);
          return {
            ...o,
            assigned_material_ids: has
              ? o.assigned_material_ids.filter((id) => id !== materialId)
              : [...o.assigned_material_ids, materialId],
          };
        })
      );
    },
    []
  );

  // Expose save to parent
  const handleSave = useCallback(() => {
    const inserts: PrototypeOperationInsert[] = operations.map((o) => ({
      prototype_id: prototypeId,
      operation_id: o.operation_id,
      operation_name: o.operation_name,
      is_custom_operation: o.is_custom_operation,
      step_number: o.step_number,
      produces_sub_product: o.produces_sub_product,
      sub_product_name: o.sub_product_name || undefined,
      is_filling: o.is_filling,
      has_trim: o.has_trim,
      instructions: o.instructions || undefined,
    }));
    onSave(inserts);
  }, [operations, prototypeId, onSave]);

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
          Diseno de Proceso
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Define las operaciones de produccion en el orden correcto.
        </p>
      </div>

      {/* Operations list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {operations.map((op, index) => {
            const isExpanded = expandedId === op.tempId;

            return (
              <motion.div
                key={op.tempId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
                  "border border-white/20 dark:border-white/10",
                  "rounded-2xl shadow-sm overflow-hidden"
                )}
              >
                {/* Card header */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : op.tempId)
                  }
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                        "bg-lime-500/15 text-lime-600 dark:text-lime-400"
                      )}
                    >
                      {op.step_number}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {op.operation_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {op.is_custom_operation && (
                          <span className="text-[10px] font-medium bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-md">
                            Personalizada
                          </span>
                        )}
                        {op.produces_sub_product && (
                          <span className="text-[10px] font-medium bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded-md">
                            Sub-producto
                          </span>
                        )}
                        {op.is_filling && (
                          <span className="text-[10px] font-medium bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded-md">
                            Relleno
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Settings2
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform duration-200",
                      isExpanded && "rotate-90"
                    )}
                  />
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-white/5 pt-4">
                        {/* Reorder and delete */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="rounded-lg h-9"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveDown(index)}
                            disabled={index >= operations.length - 1}
                            className="rounded-lg h-9"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <div className="flex-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOp(op.tempId)}
                            className="rounded-lg h-9 text-red-500 hover:text-red-600 hover:bg-red-500/5"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>

                        {/* Toggles */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-gray-400" />
                              <Label className="text-sm">
                                Produce sub-producto
                              </Label>
                            </div>
                            <Switch
                              checked={op.produces_sub_product}
                              onCheckedChange={(checked) =>
                                handleUpdateOp(
                                  op.tempId,
                                  "produces_sub_product",
                                  checked
                                )
                              }
                            />
                          </div>

                          {op.produces_sub_product && (
                            <Input
                              value={op.sub_product_name}
                              onChange={(e) =>
                                handleUpdateOp(
                                  op.tempId,
                                  "sub_product_name",
                                  e.target.value
                                )
                              }
                              placeholder="Nombre del sub-producto..."
                              className={cn(
                                "h-11 rounded-xl text-sm",
                                "bg-white/50 dark:bg-black/30",
                                "border border-gray-200/50 dark:border-white/10"
                              )}
                            />
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PieChart className="w-4 h-4 text-gray-400" />
                              <Label className="text-sm">Es relleno</Label>
                            </div>
                            <Switch
                              checked={op.is_filling}
                              onCheckedChange={(checked) =>
                                handleUpdateOp(
                                  op.tempId,
                                  "is_filling",
                                  checked
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Assign materials */}
                        {materials.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-gray-500">
                              Materiales asignados
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {materials.map((mat) => {
                                const isAssigned =
                                  op.assigned_material_ids.includes(
                                    mat.id
                                  );
                                return (
                                  <button
                                    key={mat.id}
                                    type="button"
                                    onClick={() =>
                                      toggleMaterialAssignment(
                                        op.tempId,
                                        mat.id
                                      )
                                    }
                                    className={cn(
                                      "text-xs font-medium px-3 py-1.5 rounded-lg",
                                      "border transition-all duration-150 active:scale-95",
                                      isAssigned
                                        ? "bg-lime-500/15 border-lime-500/30 text-lime-700 dark:text-lime-400"
                                        : "bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 text-gray-500"
                                    )}
                                  >
                                    {mat.material_name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Instructions */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-500">
                            Instrucciones
                          </Label>
                          <Textarea
                            value={op.instructions}
                            onChange={(e) =>
                              handleUpdateOp(
                                op.tempId,
                                "instructions",
                                e.target.value
                              )
                            }
                            placeholder="Instrucciones para esta operacion..."
                            rows={2}
                            className={cn(
                              "rounded-xl text-sm resize-none",
                              "bg-white/50 dark:bg-black/30",
                              "border border-gray-200/50 dark:border-white/10"
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add operation */}
      <div className="space-y-3">
        {!isAddingCustom ? (
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
                  Buscar Operacion
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Buscar operacion..." />
                  <CommandList>
                    <CommandEmpty>
                      {catalogLoading
                        ? "Cargando..."
                        : "No se encontraron operaciones."}
                    </CommandEmpty>
                    <CommandGroup>
                      {catalogOps.map((cop) => (
                        <CommandItem
                          key={cop.id}
                          value={cop.name}
                          onSelect={() => handleAddCatalogOp(cop)}
                          className="py-3"
                        >
                          <span className="text-sm">{cop.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              onClick={() => setIsAddingCustom(true)}
              className={cn(
                "h-14 rounded-xl gap-2 px-4",
                "border-dashed border-2 border-gray-200 dark:border-white/10",
                "text-gray-500 hover:text-lime-600 hover:border-lime-500/30",
                "hover:bg-lime-500/5 transition-all duration-150"
              )}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Personalizada</span>
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
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nombre de la operacion..."
              onKeyDown={(e) => e.key === "Enter" && handleAddCustomOp()}
              autoFocus
              className={cn(
                "flex-1 h-12 rounded-xl text-base",
                "bg-white/50 dark:bg-black/30",
                "border border-gray-200/50 dark:border-white/10"
              )}
            />
            <Button
              onClick={handleAddCustomOp}
              disabled={!customName.trim()}
              className="h-12 rounded-xl bg-lime-500 hover:bg-lime-600 text-white px-4"
            >
              Agregar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddingCustom(false);
                setCustomName("");
              }}
              className="h-12 rounded-xl px-3"
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Start live fabrication */}
      {operations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4"
        >
          <Button
            onClick={onStartLive}
            className={cn(
              "w-full h-16 rounded-2xl text-lg font-bold gap-3",
              "bg-lime-500 hover:bg-lime-600 text-white",
              "shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-500/40",
              "active:scale-[0.98] transition-all duration-150"
            )}
          >
            <Play className="w-6 h-6" />
            Iniciar Fabricacion
          </Button>
          <p className="text-center text-xs text-gray-400 mt-2">
            Se habilitaran los controles de registro en vivo
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
