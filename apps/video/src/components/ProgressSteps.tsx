import React from "react";

const STEPS = [
  { id: 1, title: "Empresa", emoji: "🏢" },
  { id: 2, title: "Contacto", emoji: "👤" },
  { id: 3, title: "Entregas", emoji: "📅" },
  { id: 4, title: "Revision", emoji: "📋" },
];

export const ProgressSteps: React.FC<{ currentStep: number }> = ({
  currentStep,
}) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;

        return (
          <React.Fragment key={step.id}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isCompleted
                    ? "#22C55E"
                    : isCurrent
                    ? "#3B82F6"
                    : "#E5E7EB",
                  color: isCompleted || isCurrent ? "white" : "#9CA3AF",
                  fontSize: 22,
                  fontWeight: 700,
                  transition: "all 0.3s",
                }}
              >
                {isCompleted ? "✓" : step.emoji}
              </div>
              <p
                style={{
                  fontSize: 16,
                  marginTop: 6,
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? "#3B82F6" : "#6B7280",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {step.title}
              </p>
            </div>
            {index < STEPS.length - 1 && (
              <div
                style={{
                  height: 3,
                  width: 80,
                  borderRadius: 2,
                  background: isCompleted ? "#22C55E" : "#E5E7EB",
                  marginBottom: 24,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
