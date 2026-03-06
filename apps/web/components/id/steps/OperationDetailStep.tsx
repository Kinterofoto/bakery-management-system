"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Thermometer,
  Scale,
  Users,
  Camera,
  Clock,
  Scissors,
  Layers,
  AlertTriangle,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { PrototypeOperation, PrototypeOperationUpdate } from "@/hooks/use-prototype-operations";
import type { PrototypePhoto } from "@/hooks/use-prototype-photos";
import type { PrototypeMaterial } from "@/hooks/use-prototype-materials";
import { formatGrams, formatPercentage } from "@/lib/id-calculations";

interface OperationDetailStepProps {
  prototypeId: string;
  operations: PrototypeOperation[];
  currentOperationIndex: number;
  onOperationChange: (index: number) => void;
  onUpdateOperation: (id: string, updates: PrototypeOperationUpdate) => void;
  onContinueToQuality: () => void;
  photos: PrototypePhoto[];
  onUploadPhoto: (file: File, operationId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  // Timer controls
  onStartTimer: (operationId: string) => void;
  onStopTimer: (operationId: string) => void;
  onResetTimer: (operationId: string) => void;
  materials: PrototypeMaterial[];
}

export function OperationDetailStep({
  prototypeId,
  operations,
  currentOperationIndex,
  onOperationChange,
  onUpdateOperation,
  onContinueToQuality,
  photos,
  onUploadPhoto,
  onDeletePhoto,
  onStartTimer,
  onStopTimer,
  onResetTimer,
  materials,
}: OperationDetailStepProps) {
  const operation = operations[currentOperationIndex];
  const isFirst = currentOperationIndex === 0;
  const isLast = currentOperationIndex === operations.length - 1;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Local form state for the current operation
  const [localFields, setLocalFields] = useState<Record<string, any>>({});

  // Reset local fields when operation changes
  useEffect(() => {
    if (!operation) return;
    setLocalFields({
      temperature_celsius: operation.temperature_celsius ?? "",
      input_weight_grams: operation.input_weight_grams ?? "",
      output_weight_grams: operation.output_weight_grams ?? "",
      people_count: operation.people_count ?? 1,
      observations: operation.observations ?? "",
      sub_product_input_grams: operation.sub_product_input_grams ?? "",
      sub_product_output_grams: operation.sub_product_output_grams ?? "",
      has_trim: operation.has_trim ?? false,
      weight_before_trim_grams: operation.weight_before_trim_grams ?? "",
      trim_weight_grams: operation.trim_weight_grams ?? "",
    });
  }, [operation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save
  const handleFieldChange = useCallback(
    (field: string, value: any) => {
      setLocalFields((prev) => ({ ...prev, [field]: value }));

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!operation) return;
        const numValue =
          typeof value === "string" && value !== ""
            ? parseFloat(value)
            : value === ""
              ? null
              : value;

        const updates: PrototypeOperationUpdate = { [field]: numValue };

        // Auto-calculate waste if both weights are present
        const inputW =
          field === "input_weight_grams"
            ? numValue
            : localFields.input_weight_grams
              ? parseFloat(String(localFields.input_weight_grams))
              : null;
        const outputW =
          field === "output_weight_grams"
            ? numValue
            : localFields.output_weight_grams
              ? parseFloat(String(localFields.output_weight_grams))
              : null;

        if (
          (field === "input_weight_grams" || field === "output_weight_grams") &&
          inputW != null &&
          outputW != null
        ) {
          updates.input_weight_grams = inputW;
          updates.output_weight_grams = outputW;
        }

        // Auto-calc trim
        if (field === "weight_before_trim_grams" || field === "trim_weight_grams") {
          const before =
            field === "weight_before_trim_grams"
              ? numValue
              : localFields.weight_before_trim_grams
                ? parseFloat(String(localFields.weight_before_trim_grams))
                : null;
          const trim =
            field === "trim_weight_grams"
              ? numValue
              : localFields.trim_weight_grams
                ? parseFloat(String(localFields.trim_weight_grams))
                : null;
          if (before != null && trim != null) {
            updates.weight_after_trim_grams = Math.max(0, before - trim);
          }
        }

        onUpdateOperation(operation.id, updates);
      }, 800);
    },
    [operation, localFields, onUpdateOperation]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Timer display
  const [timerDisplay, setTimerDisplay] = useState("00:00");

  useEffect(() => {
    if (!operation) return;

    const updateDisplay = () => {
      let elapsed = operation.timer_elapsed_seconds || 0;
      if (operation.timer_started_at) {
        const started = new Date(operation.timer_started_at).getTime();
        elapsed += Math.floor((Date.now() - started) / 1000);
      }
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setTimerDisplay(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      );
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [operation?.timer_started_at, operation?.timer_elapsed_seconds, operation?.id]);

  const isTimerRunning = !!operation?.timer_started_at;

  // Auto-calculated merma
  const merma = useMemo(() => {
    const input = parseFloat(String(localFields.input_weight_grams));
    const output = parseFloat(String(localFields.output_weight_grams));
    if (!isNaN(input) && !isNaN(output) && input > 0) {
      const wasteG = input - output;
      const wastePct = (wasteG / input) * 100;
      return { grams: wasteG, percentage: wastePct };
    }
    return null;
  }, [localFields.input_weight_grams, localFields.output_weight_grams]);

  // Photos for this operation
  const operationPhotos = useMemo(
    () => photos.filter((p) => p.prototype_operation_id === operation?.id),
    [photos, operation?.id]
  );

  const handlePhotoCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && operation) {
        onUploadPhoto(file, operation.id);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [operation, onUploadPhoto]
  );

  if (!operation) return null;

  return (
    <motion.div
      key={operation.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-6 pb-32 md:pb-8"
    >
      {/* Operation header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-lime-500 uppercase tracking-wide">
            Operacion {currentOperationIndex + 1} de {operations.length}
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {operation.operation_name}
          </h2>
        </div>
      </div>

      {/* Timer */}
      <div
        className={cn(
          "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
          "border rounded-2xl p-6 shadow-sm text-center",
          isTimerRunning
            ? "border-lime-500/30 bg-lime-500/5"
            : "border-white/20 dark:border-white/10"
        )}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Temporizador
          </span>
        </div>
        <p
          className={cn(
            "text-5xl font-bold tabular-nums tracking-tight",
            isTimerRunning
              ? "text-lime-500"
              : "text-gray-900 dark:text-white"
          )}
        >
          {timerDisplay}
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          {!isTimerRunning ? (
            <Button
              onClick={() => onStartTimer(operation.id)}
              className={cn(
                "h-12 px-8 rounded-xl font-semibold",
                "bg-lime-500 hover:bg-lime-600 text-white",
                "shadow-md shadow-lime-500/30",
                "active:scale-95 transition-all duration-150"
              )}
            >
              Iniciar
            </Button>
          ) : (
            <Button
              onClick={() => onStopTimer(operation.id)}
              className={cn(
                "h-12 px-8 rounded-xl font-semibold",
                "bg-red-500 hover:bg-red-600 text-white",
                "shadow-md shadow-red-500/30",
                "active:scale-95 transition-all duration-150"
              )}
            >
              Detener
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onResetTimer(operation.id)}
            className="h-12 px-4 rounded-xl"
          >
            Reiniciar
          </Button>
        </div>
      </div>

      {/* Numeric inputs - large touch targets */}
      <div className="grid grid-cols-2 gap-4">
        {/* Temperature */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <Label className="text-xs font-medium text-gray-500">
              Temperatura (C)
            </Label>
          </div>
          <Input
            type="number"
            inputMode="decimal"
            value={localFields.temperature_celsius ?? ""}
            onChange={(e) =>
              handleFieldChange("temperature_celsius", e.target.value)
            }
            placeholder="--"
            className={cn(
              "h-14 rounded-xl text-xl font-semibold text-center",
              "bg-white/50 dark:bg-black/30",
              "border border-gray-200/50 dark:border-white/10",
              "focus:ring-2 focus:ring-lime-500/50"
            )}
          />
        </div>

        {/* People */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-400" />
            <Label className="text-xs font-medium text-gray-500">
              Personas
            </Label>
          </div>
          <Input
            type="number"
            inputMode="numeric"
            value={localFields.people_count ?? 1}
            onChange={(e) =>
              handleFieldChange("people_count", e.target.value)
            }
            min={1}
            className={cn(
              "h-14 rounded-xl text-xl font-semibold text-center",
              "bg-white/50 dark:bg-black/30",
              "border border-gray-200/50 dark:border-white/10",
              "focus:ring-2 focus:ring-lime-500/50"
            )}
          />
        </div>

        {/* Input weight */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-green-400" />
            <Label className="text-xs font-medium text-gray-500">
              Peso entrada (g)
            </Label>
          </div>
          <Input
            type="number"
            inputMode="decimal"
            value={localFields.input_weight_grams ?? ""}
            onChange={(e) =>
              handleFieldChange("input_weight_grams", e.target.value)
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

        {/* Output weight */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-purple-400" />
            <Label className="text-xs font-medium text-gray-500">
              Peso salida (g)
            </Label>
          </div>
          <Input
            type="number"
            inputMode="decimal"
            value={localFields.output_weight_grams ?? ""}
            onChange={(e) =>
              handleFieldChange("output_weight_grams", e.target.value)
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

      {/* Auto-calculated merma */}
      {merma && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center justify-between p-4 rounded-2xl",
            merma.percentage > 10
              ? "bg-orange-500/10 border border-orange-500/20"
              : "bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5"
          )}
        >
          <div className="flex items-center gap-2">
            {merma.percentage > 10 && (
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Merma
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {formatGrams(merma.grams)}
            </span>
            <span className="text-xs font-medium text-gray-500">
              ({formatPercentage(merma.percentage, 1)})
            </span>
          </div>
        </motion.div>
      )}

      {/* Sub-product section */}
      {operation.produces_sub_product && (
        <div
          className={cn(
            "bg-purple-500/5 border border-purple-500/20",
            "rounded-2xl p-4 space-y-3"
          )}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
              Sub-producto: {operation.sub_product_name || "Sin nombre"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">
                Peso entrada (g)
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={localFields.sub_product_input_grams ?? ""}
                onChange={(e) =>
                  handleFieldChange("sub_product_input_grams", e.target.value)
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
                Peso salida (g)
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={localFields.sub_product_output_grams ?? ""}
                onChange={(e) =>
                  handleFieldChange(
                    "sub_product_output_grams",
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
          </div>
        </div>
      )}

      {/* Trim section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-gray-400" />
            <Label className="text-sm font-medium">
              Recorte (Trim)
            </Label>
          </div>
          <Switch
            checked={localFields.has_trim ?? false}
            onCheckedChange={(checked) =>
              handleFieldChange("has_trim", checked)
            }
          />
        </div>

        {localFields.has_trim && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">
                Antes del recorte (g)
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={localFields.weight_before_trim_grams ?? ""}
                onChange={(e) =>
                  handleFieldChange(
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
                value={localFields.trim_weight_grams ?? ""}
                onChange={(e) =>
                  handleFieldChange("trim_weight_grams", e.target.value)
                }
                placeholder="0"
                className={cn(
                  "h-12 rounded-xl text-base font-medium text-center",
                  "bg-white/50 dark:bg-black/30",
                  "border border-gray-200/50 dark:border-white/10"
                )}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Observations */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Observaciones
        </Label>
        <Textarea
          value={localFields.observations ?? ""}
          onChange={(e) => handleFieldChange("observations", e.target.value)}
          placeholder="Notas sobre esta operacion..."
          rows={3}
          className={cn(
            "rounded-xl text-base resize-none",
            "bg-white/50 dark:bg-black/30 backdrop-blur-md",
            "border border-gray-200/50 dark:border-white/10",
            "focus:ring-2 focus:ring-lime-500/50"
          )}
        />
      </div>

      {/* Photo thumbnails */}
      {operationPhotos.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500">
            Fotos ({operationPhotos.length})
          </Label>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {operationPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/20"
              >
                <img
                  src={photo.photo_url}
                  alt={photo.caption || "Foto de operacion"}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onDeletePhoto(photo.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                  aria-label="Eliminar foto"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operation navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
        <Button
          variant="ghost"
          onClick={() => onOperationChange(currentOperationIndex - 1)}
          disabled={isFirst}
          className="h-12 rounded-xl px-4 gap-1"
        >
          <ChevronLeft className="w-5 h-5" />
          Anterior
        </Button>

        <span className="text-xs font-medium text-gray-400">
          {currentOperationIndex + 1} / {operations.length}
        </span>

        {isLast ? (
          <Button
            onClick={onContinueToQuality}
            className={cn(
              "h-12 rounded-xl px-5 font-semibold gap-1",
              "bg-lime-500 hover:bg-lime-600 text-white",
              "shadow-md shadow-lime-500/30",
              "active:scale-95 transition-all duration-150"
            )}
          >
            Continuar
            <ChevronRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            onClick={() => onOperationChange(currentOperationIndex + 1)}
            className={cn(
              "h-12 rounded-xl px-5 font-semibold gap-1",
              "bg-lime-500 hover:bg-lime-600 text-white",
              "shadow-md shadow-lime-500/30",
              "active:scale-95 transition-all duration-150"
            )}
          >
            Siguiente
            <ChevronRight className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Floating photo FAB */}
      <button
        type="button"
        onClick={handlePhotoCapture}
        className={cn(
          "fixed bottom-24 right-4 md:bottom-8 md:right-8 z-30",
          "w-14 h-14 rounded-full",
          "bg-lime-500 text-white shadow-lg shadow-lime-500/30",
          "flex items-center justify-center",
          "hover:bg-lime-600 hover:shadow-xl hover:shadow-lime-500/40",
          "active:scale-90 transition-all duration-150"
        )}
        aria-label="Tomar foto"
      >
        <Camera className="w-6 h-6" />
      </button>

      {/* Hidden file input for photo capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
        aria-hidden="true"
      />
    </motion.div>
  );
}
