"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Camera,
  Share2,
  MessageSquare,
  Palette,
  Eye,
  Cookie,
  Wind,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface QualityData {
  texture_score: number | null;
  texture_notes: string;
  color_score: number | null;
  color_notes: string;
  appearance_score: number | null;
  appearance_notes: string;
  taste_score: number | null;
  taste_notes: string;
  aroma_score: number | null;
  aroma_notes: string;
  crumb_structure_score: number | null;
  crumb_structure_notes: string;
  overall_notes: string;
}

interface QualityAssessmentStepProps {
  prototypeId: string;
  qualityData: QualityData | null;
  sensoryToken: string | null;
  onSave: (data: QualityData) => void;
  onGenerateSensoryLink: () => Promise<string | null>;
  onUploadPhoto: (file: File) => void;
}

const QUALITY_CRITERIA = [
  {
    key: "texture",
    label: "Textura",
    icon: Cookie,
    description: "Suavidad, firmeza, elasticidad",
  },
  {
    key: "color",
    label: "Color",
    icon: Palette,
    description: "Uniformidad, tono esperado",
  },
  {
    key: "appearance",
    label: "Apariencia",
    icon: Eye,
    description: "Forma, tamano, acabado visual",
  },
  {
    key: "taste",
    label: "Sabor",
    icon: Star,
    description: "Balance, dulzura, sal",
  },
  {
    key: "aroma",
    label: "Aroma",
    icon: Wind,
    description: "Intensidad, notas olfativas",
  },
  {
    key: "crumb_structure",
    label: "Estructura de miga",
    icon: Layers,
    description: "Alveolos, humedad, densidad",
  },
] as const;

export function QualityAssessmentStep({
  prototypeId,
  qualityData,
  sensoryToken,
  onSave,
  onGenerateSensoryLink,
  onUploadPhoto,
}: QualityAssessmentStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [data, setData] = useState<QualityData>(() => ({
    texture_score: qualityData?.texture_score ?? null,
    texture_notes: qualityData?.texture_notes ?? "",
    color_score: qualityData?.color_score ?? null,
    color_notes: qualityData?.color_notes ?? "",
    appearance_score: qualityData?.appearance_score ?? null,
    appearance_notes: qualityData?.appearance_notes ?? "",
    taste_score: qualityData?.taste_score ?? null,
    taste_notes: qualityData?.taste_notes ?? "",
    aroma_score: qualityData?.aroma_score ?? null,
    aroma_notes: qualityData?.aroma_notes ?? "",
    crumb_structure_score: qualityData?.crumb_structure_score ?? null,
    crumb_structure_notes: qualityData?.crumb_structure_notes ?? "",
    overall_notes: qualityData?.overall_notes ?? "",
  }));

  const [linkCopied, setLinkCopied] = useState(false);

  // Debounced auto-save
  const handleChange = useCallback(
    (field: keyof QualityData, value: any) => {
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

  // Expose save to parent
  useEffect(() => {
    (window as any).__wizardStepSave = () => onSave(data);
    return () => {
      delete (window as any).__wizardStepSave;
    };
  }, [data, onSave]);

  const handleGenerateLink = useCallback(async () => {
    const token = await onGenerateSensoryLink();
    if (token) {
      const url = `${window.location.origin}/sensorial/${token}`;
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [onGenerateSensoryLink]);

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
          Evaluacion de Calidad
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Evalua las caracteristicas sensoriales del prototipo.
        </p>
      </div>

      {/* Quality criteria cards */}
      <div className="space-y-4">
        {QUALITY_CRITERIA.map((criterion) => {
          const scoreKey = `${criterion.key}_score` as keyof QualityData;
          const notesKey = `${criterion.key}_notes` as keyof QualityData;
          const score = data[scoreKey] as number | null;
          const notes = data[notesKey] as string;
          const Icon = criterion.icon;

          return (
            <div
              key={criterion.key}
              className={cn(
                "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
                "border border-white/20 dark:border-white/10",
                "rounded-2xl p-4 shadow-sm"
              )}
            >
              {/* Criterion header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    score
                      ? "bg-lime-500/10"
                      : "bg-gray-100 dark:bg-white/5"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4.5 h-4.5",
                      score
                        ? "text-lime-500"
                        : "text-gray-400"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {criterion.label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {criterion.description}
                  </p>
                </div>
              </div>

              {/* Star rating */}
              <div className="flex items-center gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleChange(scoreKey, value)}
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center",
                      "transition-all duration-150 active:scale-90",
                      score != null && value <= score
                        ? "bg-lime-500/15 text-lime-500"
                        : "bg-gray-50 dark:bg-white/5 text-gray-300 dark:text-gray-600 hover:text-lime-400"
                    )}
                    aria-label={`${criterion.label}: ${value} de 5`}
                  >
                    <Star
                      className="w-5 h-5"
                      fill={
                        score != null && value <= score
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                ))}
                {score != null && (
                  <span className="ml-2 text-sm font-bold text-gray-900 dark:text-white">
                    {score}/5
                  </span>
                )}
              </div>

              {/* Notes */}
              <Textarea
                value={notes}
                onChange={(e) => handleChange(notesKey, e.target.value)}
                placeholder={`Notas sobre ${criterion.label.toLowerCase()}...`}
                rows={2}
                className={cn(
                  "rounded-xl text-sm resize-none",
                  "bg-white/50 dark:bg-black/30",
                  "border border-gray-200/50 dark:border-white/10",
                  "focus:ring-2 focus:ring-lime-500/50"
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Overall notes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Notas generales
          </Label>
        </div>
        <Textarea
          value={data.overall_notes}
          onChange={(e) => handleChange("overall_notes", e.target.value)}
          placeholder="Observaciones generales sobre la calidad del prototipo..."
          rows={4}
          className={cn(
            "rounded-xl text-base resize-none",
            "bg-white/50 dark:bg-black/30 backdrop-blur-md",
            "border border-gray-200/50 dark:border-white/10",
            "focus:ring-2 focus:ring-lime-500/50"
          )}
        />
      </div>

      {/* Photo capture */}
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
        Foto de evidencia de calidad
      </Button>

      {/* Sensory link share */}
      <div
        className={cn(
          "bg-blue-500/5 border border-blue-500/20",
          "rounded-2xl p-4"
        )}
      >
        <div className="flex items-center gap-3 mb-3">
          <Share2 className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Evaluacion sensorial externa
            </p>
            <p className="text-xs text-gray-500">
              Genera un enlace para que evaluadores externos califiquen el
              prototipo.
            </p>
          </div>
        </div>
        <Button
          onClick={handleGenerateLink}
          className={cn(
            "w-full h-12 rounded-xl font-semibold gap-2",
            "bg-blue-500 hover:bg-blue-600 text-white",
            "shadow-md shadow-blue-500/30",
            "active:scale-95 transition-all duration-150"
          )}
        >
          <Share2 className="w-4 h-4" />
          {linkCopied
            ? "Enlace copiado!"
            : sensoryToken
              ? "Copiar enlace sensorial"
              : "Generar enlace sensorial"}
        </Button>
      </div>

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
