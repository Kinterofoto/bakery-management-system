"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Package, Box, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PackagingData {
  units_per_flow_pack: number | null;
  units_per_box: number | null;
}

interface PackagingStepProps {
  prototypeId: string;
  prototypeData: PackagingData | null;
  onSave: (data: PackagingData) => void;
  onUploadPhoto: (file: File) => void;
}

export function PackagingStep({
  prototypeId,
  prototypeData,
  onSave,
  onUploadPhoto,
}: PackagingStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [data, setData] = useState<PackagingData>(() => ({
    units_per_flow_pack: prototypeData?.units_per_flow_pack ?? null,
    units_per_box: prototypeData?.units_per_box ?? null,
  }));

  // Debounced auto-save
  const handleChange = useCallback(
    (field: keyof PackagingData, rawValue: string) => {
      const value = rawValue === "" ? null : parseInt(rawValue, 10);
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

  const handlePhotoCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUploadPhoto(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onUploadPhoto]
  );

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
          Empaque
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Define la configuracion de empaque del prototipo.
        </p>
      </div>

      {/* Flow pack */}
      <div
        className={cn(
          "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "rounded-2xl p-6 shadow-sm space-y-4"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lime-500/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-lime-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Unidades por Flow Pack
            </p>
            <p className="text-xs text-gray-400">
              Cuantas unidades van en cada empaque individual
            </p>
          </div>
        </div>
        <Input
          type="number"
          inputMode="numeric"
          value={data.units_per_flow_pack ?? ""}
          onChange={(e) =>
            handleChange("units_per_flow_pack", e.target.value)
          }
          placeholder="Ej: 1"
          min={1}
          className={cn(
            "h-14 rounded-xl text-2xl font-bold text-center",
            "bg-white/50 dark:bg-black/30",
            "border border-gray-200/50 dark:border-white/10",
            "focus:ring-2 focus:ring-lime-500/50"
          )}
        />
      </div>

      {/* Box */}
      <div
        className={cn(
          "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "rounded-2xl p-6 shadow-sm space-y-4"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Box className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Unidades por Caja
            </p>
            <p className="text-xs text-gray-400">
              Cuantas unidades (o flow packs) van en cada caja
            </p>
          </div>
        </div>
        <Input
          type="number"
          inputMode="numeric"
          value={data.units_per_box ?? ""}
          onChange={(e) => handleChange("units_per_box", e.target.value)}
          placeholder="Ej: 12"
          min={1}
          className={cn(
            "h-14 rounded-xl text-2xl font-bold text-center",
            "bg-white/50 dark:bg-black/30",
            "border border-gray-200/50 dark:border-white/10",
            "focus:ring-2 focus:ring-lime-500/50"
          )}
        />
      </div>

      {/* Summary */}
      {data.units_per_flow_pack && data.units_per_box && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "bg-gray-900 dark:bg-white/10 backdrop-blur-xl",
            "rounded-2xl p-5 shadow-sm text-center"
          )}
        >
          <p className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-1">
            Resumen de empaque
          </p>
          <p className="text-lg font-bold text-white">
            {data.units_per_flow_pack} und/flow pack ·{" "}
            {data.units_per_box} und/caja
          </p>
          {data.units_per_flow_pack > 1 && (
            <p className="text-sm text-gray-400 mt-1">
              {Math.floor(data.units_per_box / data.units_per_flow_pack)} flow
              packs por caja
            </p>
          )}
        </motion.div>
      )}

      {/* Photo of packaging concept */}
      <Button
        variant="outline"
        onClick={handlePhotoCapture}
        className={cn(
          "w-full h-14 rounded-xl gap-2",
          "border-dashed border-2 border-gray-200 dark:border-white/10",
          "text-gray-500 hover:text-lime-600 hover:border-lime-500/30",
          "hover:bg-lime-500/5 transition-all duration-150"
        )}
      >
        <Camera className="w-5 h-5" />
        Foto de concepto de empaque
      </Button>

      {/* Hidden file input */}
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
