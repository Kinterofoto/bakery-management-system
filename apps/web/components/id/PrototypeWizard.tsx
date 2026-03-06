"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WizardProgressBar } from "@/components/id/WizardProgressBar";
import { WizardNavigation } from "@/components/id/WizardNavigation";

// Step components
import { ProductSelectionStep } from "@/components/id/steps/ProductSelectionStep";
import { MaterialsStep } from "@/components/id/steps/MaterialsStep";
import { ProcessDesignStep } from "@/components/id/steps/ProcessDesignStep";
import { OperationDetailStep } from "@/components/id/steps/OperationDetailStep";
import { QualityAssessmentStep } from "@/components/id/steps/QualityAssessmentStep";
import { YieldWasteStep } from "@/components/id/steps/YieldWasteStep";
import { PackagingStep } from "@/components/id/steps/PackagingStep";
import { CostSummaryStep } from "@/components/id/steps/CostSummaryStep";
import { ReviewStep } from "@/components/id/steps/ReviewStep";

// Hooks
import { usePrototypes, type Prototype } from "@/hooks/use-prototypes";
import {
  usePrototypeMaterials,
  type PrototypeMaterial,
  type PrototypeMaterialInsert,
} from "@/hooks/use-prototype-materials";
import {
  usePrototypeOperations,
  type PrototypeOperation,
  type PrototypeOperationInsert,
  type PrototypeOperationUpdate,
} from "@/hooks/use-prototype-operations";
import {
  usePrototypePhotos,
  type PrototypePhoto,
} from "@/hooks/use-prototype-photos";

// Types
import { supabase } from "@/lib/supabase";

const TOTAL_STEPS = 9;
const SETUP_STEPS = 3;

const STEP_LABELS = [
  "Producto",
  "Formula",
  "Proceso",
  "Operaciones",
  "Calidad",
  "Rendimiento",
  "Empaque",
  "Costos",
  "Revision",
];

interface PrototypeWizardProps {
  prototypeId?: string;
  onComplete: () => void;
}

export function PrototypeWizard({
  prototypeId: initialPrototypeId,
  onComplete,
}: PrototypeWizardProps) {
  // Core state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [prototypeId, setPrototypeId] = useState<string | null>(
    initialPrototypeId ?? null
  );
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!initialPrototypeId);

  // Data state
  const [prototype, setPrototype] = useState<Prototype | null>(null);
  const [materials, setMaterials] = useState<PrototypeMaterial[]>([]);
  const [operations, setOperations] = useState<PrototypeOperation[]>([]);
  const [photos, setPhotos] = useState<PrototypePhoto[]>([]);
  const [qualityData, setQualityData] = useState<any>(null);
  const [yieldData, setYieldData] = useState<any>(null);
  const [costData, setCostData] = useState<any>(null);
  const [sensoryToken, setSensoryToken] = useState<string | null>(null);

  // Live phase sub-navigation
  const [currentOperationIndex, setCurrentOperationIndex] = useState(0);

  // Direction for animation
  const [direction, setDirection] = useState(1);

  // Hooks
  const prototypesHook = usePrototypes();
  const materialsHook = usePrototypeMaterials();
  const operationsHook = usePrototypeOperations();
  const photosHook = usePrototypePhotos();

  // Auto-save debounce ref
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>();

  // --- Load existing prototype data ---
  useEffect(() => {
    if (!initialPrototypeId) {
      setInitialLoading(false);
      return;
    }

    async function loadData() {
      try {
        const [proto, mats, ops, pics] = await Promise.all([
          prototypesHook.getPrototypeById(initialPrototypeId!),
          materialsHook.getMaterialsByPrototype(initialPrototypeId!),
          operationsHook.getOperationsByPrototype(initialPrototypeId!),
          photosHook.getPhotosByPrototype(initialPrototypeId!),
        ]);

        if (proto) {
          setPrototype(proto);
          setCurrentStep(proto.wizard_step || 1);
          setSensoryToken(proto.sensory_token);
        }
        setMaterials(mats);
        setOperations(ops);
        setPhotos(pics);

        // Load quality data
        const { data: qualData } = await supabase
          .schema("investigacion")
          .from("prototype_quality")
          .select("*")
          .eq("prototype_id", initialPrototypeId!)
          .maybeSingle();
        if (qualData) setQualityData(qualData);

        // Load yield data
        const { data: yData } = await supabase
          .schema("investigacion")
          .from("prototype_yield_tracking")
          .select("*")
          .eq("prototype_id", initialPrototypeId!)
          .maybeSingle();
        if (yData) setYieldData(yData);

        // Load cost data
        const { data: cData } = await supabase
          .schema("investigacion")
          .from("prototype_cost_estimates")
          .select("*")
          .eq("prototype_id", initialPrototypeId!)
          .maybeSingle();
        if (cData) setCostData(cData);

        // Compute completed steps
        const completed: number[] = [];
        if (proto?.product_name) completed.push(1);
        if (mats.length > 0) completed.push(2);
        if (ops.length > 0) completed.push(3);
        // Steps 4-9 depend on wizard_step progress
        if (proto && proto.wizard_step > 4) {
          for (let i = 4; i < proto.wizard_step; i++) {
            completed.push(i);
          }
        }
        setCompletedSteps(completed);
      } catch (err) {
        console.error("Error loading prototype data:", err);
        toast.error("Error al cargar datos del prototipo");
      } finally {
        setInitialLoading(false);
      }
    }

    loadData();
  }, [initialPrototypeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Navigation ---
  const goToStep = useCallback(
    (step: number) => {
      if (step < 1 || step > TOTAL_STEPS) return;
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);

      // Persist wizard_step to DB
      if (prototypeId) {
        prototypesHook.updatePrototype(prototypeId, { wizard_step: step });
      }
    },
    [currentStep, prototypeId, prototypesHook]
  );

  const nextStep = useCallback(() => {
    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep]
    );
    goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  const previousStep = useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  // --- Step 1: Product selection save ---
  const handleProductSave = useCallback(
    async (data: {
      product_id: string | null;
      product_name: string;
      product_category: string;
      is_new_product: boolean;
      code: string;
      description: string;
      objectives: string;
    }) => {
      setLoading(true);
      try {
        if (prototypeId) {
          // Update existing
          const updated = await prototypesHook.updatePrototype(prototypeId, {
            ...data,
            wizard_step: 2,
          });
          if (updated) setPrototype(updated);
        } else {
          // Create new
          const created = await prototypesHook.createPrototype({
            ...data,
            wizard_step: 2,
            status: "draft",
          });
          if (created) {
            setPrototype(created);
            setPrototypeId(created.id);
          }
        }
        nextStep();
      } catch (err) {
        toast.error("Error al guardar producto");
      } finally {
        setLoading(false);
      }
    },
    [prototypeId, prototypesHook, nextStep]
  );

  // --- Step 2: Materials save ---
  const handleMaterialsSave = useCallback(
    async (materialInserts: PrototypeMaterialInsert[]) => {
      if (!prototypeId) return;
      setLoading(true);
      try {
        // Remove existing, then re-insert all
        const existingMats = await materialsHook.getMaterialsByPrototype(
          prototypeId
        );
        for (const mat of existingMats) {
          await materialsHook.removeMaterial(mat.id, prototypeId);
        }

        const inserted: PrototypeMaterial[] = [];
        for (const matData of materialInserts) {
          const result = await materialsHook.addMaterial(matData);
          if (result) inserted.push(result);
        }

        // Refetch to get computed fields
        const refreshed =
          await materialsHook.getMaterialsByPrototype(prototypeId);
        setMaterials(refreshed);

        await prototypesHook.updatePrototype(prototypeId, { wizard_step: 3 });
        nextStep();
      } catch (err) {
        toast.error("Error al guardar materiales");
      } finally {
        setLoading(false);
      }
    },
    [prototypeId, materialsHook, prototypesHook, nextStep]
  );

  // --- Step 3: Operations save ---
  const handleOperationsSave = useCallback(
    async (operationInserts: PrototypeOperationInsert[]) => {
      if (!prototypeId) return;
      setLoading(true);
      try {
        // Remove existing, then re-insert
        const existingOps =
          await operationsHook.getOperationsByPrototype(prototypeId);
        for (const op of existingOps) {
          await operationsHook.removeOperation(op.id);
        }

        const inserted: PrototypeOperation[] = [];
        for (const opData of operationInserts) {
          const result = await operationsHook.addOperation(opData);
          if (result) inserted.push(result);
        }

        setOperations(inserted);
        await prototypesHook.updatePrototype(prototypeId, { wizard_step: 3 });
      } catch (err) {
        toast.error("Error al guardar operaciones");
      } finally {
        setLoading(false);
      }
    },
    [prototypeId, operationsHook, prototypesHook]
  );

  // Start live phase (from step 3)
  const handleStartLive = useCallback(async () => {
    if (!prototypeId) return;
    // Trigger operations save first
    const stepSave = (window as any).__wizardStepSave;
    if (stepSave) stepSave();

    // Small delay for save to complete, then advance
    setTimeout(async () => {
      await prototypesHook.updatePrototype(prototypeId, {
        wizard_step: 4,
        status: "in_progress",
      });
      setCurrentOperationIndex(0);
      goToStep(4);
    }, 500);
  }, [prototypeId, prototypesHook, goToStep]);

  // --- Step 4: Operation detail update (debounced auto-save) ---
  const handleUpdateOperation = useCallback(
    (id: string, updates: PrototypeOperationUpdate) => {
      // Optimistically update local state
      setOperations((prev) =>
        prev.map((op) => (op.id === id ? { ...op, ...updates } : op))
      );

      // Debounced save to DB
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(async () => {
        await operationsHook.updateOperation(id, updates);
      }, 300);
    },
    [operationsHook]
  );

  const handleContinueToQuality = useCallback(() => {
    goToStep(5);
  }, [goToStep]);

  // --- Step 5: Quality save ---
  const handleQualitySave = useCallback(
    async (data: any) => {
      if (!prototypeId) return;
      try {
        // Upsert quality data
        const { error } = await supabase
          .schema("investigacion")
          .from("prototype_quality")
          .upsert(
            { ...data, prototype_id: prototypeId },
            { onConflict: "prototype_id" }
          );
        if (error) throw error;
        setQualityData(data);
      } catch (err) {
        console.error("Error saving quality:", err);
      }
    },
    [prototypeId]
  );

  const handleGenerateSensoryLink = useCallback(async (): Promise<
    string | null
  > => {
    if (!prototypeId) return null;
    try {
      const token = crypto.randomUUID();
      await prototypesHook.updatePrototype(prototypeId, {
        sensory_token: token,
      });
      setSensoryToken(token);
      return token;
    } catch {
      toast.error("Error al generar enlace sensorial");
      return null;
    }
  }, [prototypeId, prototypesHook]);

  // --- Step 6: Yield save ---
  const handleYieldSave = useCallback(
    async (data: any) => {
      if (!prototypeId) return;
      try {
        const { error } = await supabase
          .schema("investigacion")
          .from("prototype_yield_tracking")
          .upsert(
            { ...data, prototype_id: prototypeId },
            { onConflict: "prototype_id" }
          );
        if (error) throw error;
        setYieldData(data);
      } catch (err) {
        console.error("Error saving yield:", err);
      }
    },
    [prototypeId]
  );

  // --- Step 7: Packaging save ---
  const handlePackagingSave = useCallback(
    async (data: { units_per_flow_pack: number | null; units_per_box: number | null }) => {
      if (!prototypeId) return;
      try {
        const updated = await prototypesHook.updatePrototype(prototypeId, data);
        if (updated) setPrototype(updated);
      } catch (err) {
        console.error("Error saving packaging:", err);
      }
    },
    [prototypeId, prototypesHook]
  );

  // --- Step 8: Cost save ---
  const handleCostSave = useCallback(
    async (data: { labor_cost_per_minute: number; notes: string }) => {
      if (!prototypeId) return;
      try {
        const { error } = await supabase
          .schema("investigacion")
          .from("prototype_cost_estimates")
          .upsert(
            { ...data, prototype_id: prototypeId },
            { onConflict: "prototype_id" }
          );
        if (error) throw error;
        setCostData(data);
      } catch (err) {
        console.error("Error saving costs:", err);
      }
    },
    [prototypeId]
  );

  // --- Photo handlers ---
  const handleUploadPhoto = useCallback(
    async (file: File, operationId?: string) => {
      if (!prototypeId) return;
      const result = await photosHook.uploadPhoto(
        file,
        prototypeId,
        operationId ?? null,
        null,
        null
      );
      if (result) {
        setPhotos((prev) => [...prev, result]);
      }
    },
    [prototypeId, photosHook]
  );

  const handleDeletePhoto = useCallback(
    async (photoId: string) => {
      const success = await photosHook.deletePhoto(photoId);
      if (success) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      }
    },
    [photosHook]
  );

  // --- Timer handlers ---
  const handleStartTimer = useCallback(
    async (operationId: string) => {
      const result = await operationsHook.startTimer(operationId);
      if (result) {
        setOperations((prev) =>
          prev.map((op) => (op.id === operationId ? result : op))
        );
      }
    },
    [operationsHook]
  );

  const handleStopTimer = useCallback(
    async (operationId: string) => {
      const result = await operationsHook.stopTimer(operationId);
      if (result) {
        setOperations((prev) =>
          prev.map((op) => (op.id === operationId ? result : op))
        );
      }
    },
    [operationsHook]
  );

  const handleResetTimer = useCallback(
    async (operationId: string) => {
      const result = await operationsHook.resetTimer(operationId);
      if (result) {
        setOperations((prev) =>
          prev.map((op) => (op.id === operationId ? result : op))
        );
      }
    },
    [operationsHook]
  );

  // --- Review actions ---
  const handleSaveDraft = useCallback(async () => {
    if (!prototypeId) return;
    setLoading(true);
    await prototypesHook.updatePrototype(prototypeId, {
      status: "draft",
      wizard_step: currentStep,
    });
    setLoading(false);
    toast.success("Borrador guardado");
  }, [prototypeId, currentStep, prototypesHook]);

  const handleFinalize = useCallback(async () => {
    if (!prototypeId) return;
    setLoading(true);
    await prototypesHook.updatePrototype(prototypeId, {
      status: "completed",
      wizard_completed: true,
      wizard_step: TOTAL_STEPS,
    });
    setLoading(false);
    toast.success("Prototipo finalizado exitosamente");
    onComplete();
  }, [prototypeId, prototypesHook, onComplete]);

  const handleMigrateToProduction = useCallback(async () => {
    if (!prototypeId) return;
    toast.info("Funcionalidad de migracion a produccion pendiente");
  }, [prototypeId]);

  // --- Generate code ---
  const handleGenerateCode = useCallback(async () => {
    return await prototypesHook.generateCode();
  }, [prototypesHook]);

  // --- Next handler for WizardNavigation ---
  const handleNext = useCallback(() => {
    // For setup steps, try to call the step's save function
    const stepSave = (window as any).__wizardStepSave;
    if (currentStep <= SETUP_STEPS && stepSave) {
      stepSave();
      return;
    }
    // For live steps, just advance
    nextStep();
  }, [currentStep, nextStep]);

  // --- Loading state ---
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-lime-500 animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Cargando prototipo...</p>
        </div>
      </div>
    );
  }

  const isLivePhase = currentStep > SETUP_STEPS;
  const isLastStep = currentStep === TOTAL_STEPS;

  // Step 4 has its own navigation, so hide the bottom nav for it
  const showBottomNav = currentStep !== 4;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0">
      {/* Progress bar */}
      <WizardProgressBar
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        completedSteps={completedSteps}
        onStepClick={goToStep}
        stepLabels={STEP_LABELS}
      />

      {/* Step content with animated transitions */}
      <div className="mt-6 min-h-[60vh]">
        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === 1 && (
            <ProductSelectionStep
              key="step-1"
              initialData={prototype}
              generatedCode={prototype?.code ?? null}
              onSave={handleProductSave}
              onCodeGenerate={handleGenerateCode}
            />
          )}

          {currentStep === 2 && prototypeId && (
            <MaterialsStep
              key="step-2"
              prototypeId={prototypeId}
              initialMaterials={materials}
              onSave={handleMaterialsSave}
            />
          )}

          {currentStep === 3 && prototypeId && (
            <ProcessDesignStep
              key="step-3"
              prototypeId={prototypeId}
              operations={operations}
              materials={materials}
              onSave={handleOperationsSave}
              onStartLive={handleStartLive}
            />
          )}

          {currentStep === 4 && prototypeId && (
            <OperationDetailStep
              key="step-4"
              prototypeId={prototypeId}
              operations={operations}
              currentOperationIndex={currentOperationIndex}
              onOperationChange={setCurrentOperationIndex}
              onUpdateOperation={handleUpdateOperation}
              onContinueToQuality={handleContinueToQuality}
              photos={photos}
              onUploadPhoto={(file, opId) => handleUploadPhoto(file, opId)}
              onDeletePhoto={handleDeletePhoto}
              onStartTimer={handleStartTimer}
              onStopTimer={handleStopTimer}
              onResetTimer={handleResetTimer}
              materials={materials}
            />
          )}

          {currentStep === 5 && prototypeId && (
            <QualityAssessmentStep
              key="step-5"
              prototypeId={prototypeId}
              qualityData={qualityData}
              sensoryToken={sensoryToken}
              onSave={handleQualitySave}
              onGenerateSensoryLink={handleGenerateSensoryLink}
              onUploadPhoto={(file) => handleUploadPhoto(file)}
            />
          )}

          {currentStep === 6 && prototypeId && (
            <YieldWasteStep
              key="step-6"
              prototypeId={prototypeId}
              materials={materials}
              operations={operations}
              yieldData={yieldData}
              onSave={handleYieldSave}
            />
          )}

          {currentStep === 7 && prototypeId && (
            <PackagingStep
              key="step-7"
              prototypeId={prototypeId}
              prototypeData={
                prototype
                  ? {
                      units_per_flow_pack: prototype.units_per_flow_pack,
                      units_per_box: prototype.units_per_box,
                    }
                  : null
              }
              onSave={handlePackagingSave}
              onUploadPhoto={(file) => handleUploadPhoto(file)}
            />
          )}

          {currentStep === 8 && prototypeId && (
            <CostSummaryStep
              key="step-8"
              prototypeId={prototypeId}
              materials={materials}
              operations={operations}
              costData={costData}
              yieldData={yieldData}
              onSave={handleCostSave}
            />
          )}

          {currentStep === 9 && prototypeId && (
            <ReviewStep
              key="step-9"
              prototypeId={prototypeId}
              prototype={prototype}
              materials={materials}
              operations={operations}
              photos={photos}
              qualityData={qualityData}
              yieldData={yieldData}
              costData={costData}
              onSaveDraft={handleSaveDraft}
              onFinalize={handleFinalize}
              onMigrateToProduction={handleMigrateToProduction}
              loading={loading}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      {showBottomNav && (
        <WizardNavigation
          onBack={currentStep > 1 ? previousStep : undefined}
          onNext={handleNext}
          onSaveDraft={prototypeId ? handleSaveDraft : undefined}
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          isLivePhase={isLivePhase}
          isLastStep={isLastStep}
          loading={loading}
          nextDisabled={
            currentStep === 1 && !prototype?.product_name && !prototypeId
              ? false
              : false
          }
        />
      )}
    </div>
  );
}
