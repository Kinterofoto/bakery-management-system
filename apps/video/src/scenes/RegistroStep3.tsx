import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { ProgressSteps } from "../components/ProgressSteps";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";
import { Cursor } from "../components/Cursor";

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miercoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sabado" },
  { key: "sunday", label: "Domingo" },
];

const SELECTED = ["monday", "wednesday", "friday"];

export const RegistroStep3: React.FC = () => {
  const frame = useCurrentFrame();

  // Simulate clicking days one by one
  const clickFrames: Record<string, number> = {
    monday: 30,
    wednesday: 50,
    friday: 70,
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      <Background variant="blue" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 60px",
        }}
      >
        <AnimatedText delay={0}>
          <h1 style={{ fontSize: 42, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            Registro de Proveedores
          </h1>
          <p style={{ fontSize: 20, color: "#6B7280", textAlign: "center", margin: 0 }}>
            Panaderia Industrial
          </p>
        </AnimatedText>

        <AnimatedText delay={5} style={{ margin: "24px 0" }}>
          <ProgressSteps currentStep={3} />
        </AnimatedText>

        <GlassCard delay={8} style={{ width: 800, padding: "40px 48px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ fontSize: 48 }}>📅</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: "8px 0 0" }}>
              Dias de Entrega
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {DAYS.map((day) => {
              const clickFrame = clickFrames[day.key];
              const isSelected = clickFrame !== undefined && frame >= clickFrame;
              const dayOpacity = interpolate(frame - 15, [0, 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              return (
                <div
                  key={day.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: `2px solid ${isSelected ? "#3B82F6" : "rgba(229,231,235,0.5)"}`,
                    background: isSelected
                      ? "rgba(59,130,246,0.15)"
                      : "rgba(255,255,255,0.5)",
                    opacity: dayOpacity,
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      border: `2px solid ${isSelected ? "#3B82F6" : "#D1D5DB"}`,
                      background: isSelected ? "#3B82F6" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {isSelected && "✓"}
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <AnimatedText delay={80} style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 20, justifyContent: "space-between", width: 800 }}>
            <div style={{ color: "#6B7280", fontWeight: 600, padding: "12px 32px", borderRadius: 12, fontSize: 18 }}>
              ← Anterior
            </div>
            <div
              style={{
                background: "#3B82F6",
                color: "white",
                fontWeight: 600,
                padding: "12px 32px",
                borderRadius: 12,
                fontSize: 18,
                boxShadow: "0 8px 24px rgba(59,130,246,0.3)",
              }}
            >
              Siguiente →
            </div>
          </div>
        </AnimatedText>
      </div>

      {/* Cursor clicks on Monday */}
      <Cursor startX={500} startY={400} endX={580} endY={520} startFrame={20} duration={10} clickAt={12} />
      {/* Cursor clicks on Wednesday */}
      <Cursor startX={580} startY={520} endX={580} endY={590} startFrame={40} duration={10} clickAt={12} />
      {/* Cursor clicks on Friday */}
      <Cursor startX={580} startY={590} endX={580} endY={660} startFrame={60} duration={10} clickAt={12} />

      <Subtitle
        text="Paso 3: Selecciona los dias en que puedes realizar entregas"
        startFrame={5}
        endFrame={120}
      />
    </div>
  );
};
