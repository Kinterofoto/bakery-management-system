"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WizardNavigationProps {
  onBack?: () => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  currentStep: number;
  totalSteps: number;
  isLivePhase?: boolean;
  isLastStep?: boolean;
  loading?: boolean;
  nextDisabled?: boolean;
}

export function WizardNavigation({
  onBack,
  onNext,
  onSaveDraft,
  currentStep,
  totalSteps,
  isLivePhase = false,
  isLastStep = false,
  loading = false,
  nextDisabled = false,
}: WizardNavigationProps) {
  const nextLabel = isLastStep
    ? "Finalizar"
    : isLivePhase
      ? "Siguiente Operacion"
      : "Siguiente";

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        // Mobile: sticky bottom bar with safe area
        "fixed bottom-0 left-0 right-0 z-40",
        "md:relative md:mt-8",
        "bg-white/80 dark:bg-black/60",
        "backdrop-blur-2xl",
        "border-t border-white/20 dark:border-white/10",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.05)]",
        "md:shadow-none md:border-t-0 md:bg-transparent md:backdrop-blur-none",
        "px-4 pt-3 md:px-0 md:pt-0",
        // Safe area padding for notched phones
        "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]",
        "md:pb-0"
      )}
    >
      <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
        {/* Back button */}
        <div className="flex-shrink-0">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className={cn(
                "rounded-xl h-12 px-4",
                "text-gray-600 dark:text-gray-400",
                "hover:bg-gray-100 dark:hover:bg-white/10",
                "active:scale-95 transition-all duration-150"
              )}
              aria-label="Paso anterior"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span className="hidden sm:inline">Atras</span>
            </Button>
          ) : (
            <div className="w-12" />
          )}
        </div>

        {/* Center: step indicator + save draft */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {currentStep} / {totalSteps}
          </span>
          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              className={cn(
                "flex items-center gap-1.5",
                "text-xs font-medium text-gray-400 dark:text-gray-500",
                "hover:text-gray-600 dark:hover:text-gray-300",
                "active:scale-95 transition-all duration-150",
                "py-1 px-2 rounded-lg",
                "hover:bg-gray-100 dark:hover:bg-white/5"
              )}
              aria-label="Guardar borrador"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Borrador</span>
            </button>
          )}
        </div>

        {/* Next / Finish button */}
        <div className="flex-shrink-0">
          <Button
            type="button"
            onClick={onNext}
            disabled={loading || nextDisabled}
            className={cn(
              "rounded-xl h-12 px-5 font-semibold",
              "shadow-md active:scale-95 transition-all duration-150",
              isLivePhase
                ? "bg-lime-500 hover:bg-lime-600 shadow-lime-500/30 hover:shadow-lime-500/40 text-white"
                : "bg-blue-500 hover:bg-blue-600 shadow-blue-500/30 hover:shadow-blue-500/40 text-white",
              isLastStep &&
                "bg-green-500 hover:bg-green-600 shadow-green-500/30 hover:shadow-green-500/40"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span className="text-sm">{nextLabel}</span>
                {!isLastStep && <ChevronRight className="w-5 h-5 ml-1" />}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
