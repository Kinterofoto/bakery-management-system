import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";

export const IDCalidad: React.FC = () => {
  const frame = useCurrentFrame();

  const params = [
    { label: "Textura", score: 4 },
    { label: "Color", score: 5 },
    { label: "Apariencia", score: 4 },
    { label: "Sabor", score: 5 },
    { label: "Aroma", score: 4 },
    { label: "Miga", score: 3 },
  ];

  const avgScore = params.reduce((a, b) => a + b.score, 0) / params.length;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      <Background variant="gray" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 80px",
          gap: 24,
        }}
      >
        <AnimatedText delay={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 48 }}>⭐</span>
            <h1 style={{ fontSize: 48, fontWeight: 700, color: "#111827", margin: 0 }}>
              Evaluacion de Calidad
            </h1>
          </div>
        </AnimatedText>

        {/* Overall score */}
        <GlassCard delay={10} style={{ padding: "24px 48px", textAlign: "center" as const }}>
          <p style={{ fontSize: 56, fontWeight: 700, color: "#EAB308", margin: 0 }}>
            {avgScore.toFixed(1)}
          </p>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0", textTransform: "uppercase" as const, letterSpacing: 1 }}>
            Puntaje Promedio
          </p>
        </GlassCard>

        {/* Score cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, width: "100%" }}>
          {params.map((param, i) => {
            const cardOpacity = interpolate(frame - (20 + i * 8), [0, 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={param.label}
                style={{
                  background: "rgba(255,255,255,0.92)",
                  borderRadius: 16,
                  padding: "20px 24px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
                  opacity: cardOpacity,
                }}
              >
                <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 12px" }}>
                  {param.label}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <div
                      key={val}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 10,
                        background: val === param.score ? "#EAB308" : "#F3F4F6",
                        color: val === param.score ? "white" : "#9CA3AF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {val}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Approved badge */}
        <AnimatedText delay={70}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(34,197,94,0.1)",
              border: "2px solid rgba(34,197,94,0.3)",
              borderRadius: 16,
              padding: "16px 32px",
            }}
          >
            <span style={{ fontSize: 28 }}>✅</span>
            <p style={{ fontSize: 22, fontWeight: 600, color: "#16A34A", margin: 0 }}>
              Prototipo Aprobado
            </p>
          </div>
        </AnimatedText>
      </div>

      <Subtitle
        text="Evalua cada parametro de calidad con puntuacion 1 a 5 y aprueba o rechaza el prototipo"
        startFrame={5}
        endFrame={200}
      />
    </div>
  );
};
