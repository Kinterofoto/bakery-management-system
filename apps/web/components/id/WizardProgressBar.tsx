"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardProgressBarProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
  stepLabels?: string[];
}

const SETUP_STEPS = 3;

export function WizardProgressBar({
  currentStep,
  totalSteps,
  completedSteps,
  onStepClick,
  stepLabels = [],
}: WizardProgressBarProps) {
  const isStepCompleted = (step: number) => completedSteps.includes(step);
  const isStepActive = (step: number) => step === currentStep;
  const isStepAccessible = (step: number) =>
    step <= currentStep || isStepCompleted(step);

  return (
    <div className="w-full px-2 py-4">
      {/* Phase indicators */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span
          className={cn(
            "text-xs font-semibold tracking-wide uppercase transition-colors duration-200",
            currentStep <= SETUP_STEPS
              ? "text-blue-500"
              : "text-gray-400 dark:text-gray-500"
          )}
        >
          Setup
        </span>
        <span
          className={cn(
            "text-xs font-semibold tracking-wide uppercase transition-colors duration-200",
            currentStep > SETUP_STEPS
              ? "text-lime-500"
              : "text-gray-400 dark:text-gray-500"
          )}
        >
          En Vivo
        </span>
      </div>

      {/* Progress dots and lines */}
      <div className="relative flex items-center justify-between">
        {/* Connecting line (background) */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-gray-200 dark:bg-white/10 mx-4" />

        {/* Connecting line (progress) */}
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] mx-4"
          style={{
            background:
              currentStep <= SETUP_STEPS
                ? "rgb(59, 130, 246)"
                : "rgb(132, 204, 22)",
          }}
          initial={{ width: "0%" }}
          animate={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />

        {/* Phase divider */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[2px] h-6 bg-gray-300 dark:bg-white/20 rounded-full"
          style={{
            left: `${(SETUP_STEPS / (totalSteps - 1)) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        />

        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const completed = isStepCompleted(step);
          const active = isStepActive(step);
          const accessible = isStepAccessible(step);
          const isLivePhase = step > SETUP_STEPS;

          return (
            <div key={step} className="relative flex flex-col items-center z-10">
              <motion.button
                type="button"
                disabled={!accessible}
                onClick={() => accessible && onStepClick?.(step)}
                className={cn(
                  "relative flex items-center justify-center rounded-full transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
                  active
                    ? "w-10 h-10 shadow-lg"
                    : "w-7 h-7",
                  active && !isLivePhase &&
                    "bg-blue-500 focus:ring-blue-500 shadow-blue-500/30",
                  active && isLivePhase &&
                    "bg-lime-500 focus:ring-lime-500 shadow-lime-500/30",
                  completed && !active &&
                    "bg-gray-900 dark:bg-white",
                  !completed && !active && accessible &&
                    "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500",
                  !accessible &&
                    "bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50"
                )}
                whileTap={accessible ? { scale: 0.9 } : undefined}
                layout
                transition={{ layout: { duration: 0.3, ease: "easeOut" } }}
                aria-label={`Paso ${step}${stepLabels[i] ? `: ${stepLabels[i]}` : ""}`}
                aria-current={active ? "step" : undefined}
              >
                {completed && !active ? (
                  <Check className="w-3.5 h-3.5 text-white dark:text-gray-900" />
                ) : (
                  <span
                    className={cn(
                      "text-xs font-bold",
                      active
                        ? "text-white"
                        : "text-gray-500 dark:text-gray-400"
                    )}
                  >
                    {step}
                  </span>
                )}

                {/* Pulse ring for active step */}
                {active && (
                  <motion.span
                    className={cn(
                      "absolute inset-0 rounded-full",
                      isLivePhase ? "bg-lime-500/30" : "bg-blue-500/30"
                    )}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </motion.button>

              {/* Step label - hidden on mobile */}
              {stepLabels[i] && (
                <span
                  className={cn(
                    "hidden md:block mt-2 text-[10px] font-medium text-center max-w-[64px] leading-tight",
                    active
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-400 dark:text-gray-500"
                  )}
                >
                  {stepLabels[i]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
