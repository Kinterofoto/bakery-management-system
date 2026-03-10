import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";

export const IDPanelSensorial: React.FC = () => {
  const frame = useCurrentFrame();

  const evaluators = [
    { name: "Maria Gomez", role: "QA", score: 4.3 },
    { name: "Carlos Ruiz", role: "Panadero", score: 4.0 },
    { name: "Ana Torres", role: "Cliente", score: 4.7 },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      <Background variant="gray" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          padding: "40px 60px",
          gap: 40,
        }}
      >
        {/* Left: QR + Link */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          <AnimatedText delay={0}>
            <h1 style={{ fontSize: 42, fontWeight: 700, color: "#111827", margin: 0 }}>
              Panel Sensorial
            </h1>
            <p style={{ fontSize: 18, color: "#6B7280", margin: "8px 0 0" }}>
              Comparte el link con evaluadores externos
            </p>
          </AnimatedText>

          <GlassCard delay={10} style={{ padding: "28px 32px" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>
              Enlace Panel Sensorial
            </h3>

            {/* URL field */}
            <div
              style={{
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                padding: "12px 16px",
                fontFamily: "monospace",
                fontSize: 14,
                color: "#6B7280",
                marginBottom: 16,
              }}
            >
              panaderia.com/panel-sensorial/abc123...
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  flex: 1,
                  background: "#3B82F6",
                  color: "white",
                  fontWeight: 600,
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontSize: 16,
                  textAlign: "center",
                }}
              >
                Compartir
              </div>
              <div
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  border: "1px solid #D1D5DB",
                  fontSize: 16,
                  textAlign: "center",
                  color: "#6B7280",
                }}
              >
                Copiar
              </div>
            </div>

            {/* QR placeholder */}
            <AnimatedText delay={25}>
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 180,
                    height: 180,
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: 16,
                    display: "grid",
                    gridTemplateColumns: "repeat(9, 1fr)",
                    gridTemplateRows: "repeat(9, 1fr)",
                    gap: 2,
                    padding: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  }}
                >
                  {Array.from({ length: 81 }).map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: [0,1,2,6,7,8,9,17,18,26,54,55,56,62,63,64,72,73,74,80,10,20,14,24,11,13,21,23,65,67,75,77,71,73,55,57,30,32,40,42,50,38,48].includes(idx)
                          ? "#111827"
                          : "transparent",
                        borderRadius: 1,
                      }}
                    />
                  ))}
                </div>
              </div>
            </AnimatedText>
          </GlassCard>
        </div>

        {/* Right: Results */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <GlassCard delay={15} style={{ padding: "24px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: 0 }}>Resultados</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#6B7280" }}>
                <span>👥</span> 3 evaluaciones
              </div>
            </div>

            {/* Overall */}
            <div
              style={{
                background: "rgba(234,179,8,0.1)",
                borderRadius: 14,
                padding: "20px",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 42, fontWeight: 700, color: "#CA8A04", margin: 0 }}>4.3</p>
              <p style={{ fontSize: 12, color: "#CA8A04", margin: "4px 0 0", textTransform: "uppercase" }}>
                Promedio General
              </p>
            </div>

            {/* Per param */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Textura", score: "4.2" },
                { label: "Color", score: "4.5" },
                { label: "Sabor", score: "4.6" },
                { label: "Aroma", score: "4.0" },
                { label: "Apariencia", score: "4.3" },
                { label: "Miga", score: "4.1" },
              ].map((p, i) => {
                const pOpacity = interpolate(frame - (30 + i * 6), [0, 8], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return (
                  <div
                    key={p.label}
                    style={{
                      background: "#F9FAFB",
                      borderRadius: 10,
                      padding: "12px",
                      textAlign: "center",
                      opacity: pOpacity,
                    }}
                  >
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>{p.score}</p>
                    <p style={{ fontSize: 10, color: "#6B7280", margin: "2px 0 0", textTransform: "uppercase" }}>{p.label}</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Evaluators list */}
          <GlassCard delay={40} style={{ padding: "20px 28px" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", margin: "0 0 12px", textTransform: "uppercase" }}>
              Evaluadores
            </p>
            {evaluators.map((ev, i) => {
              const evOpacity = interpolate(frame - (50 + i * 8), [0, 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={ev.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #F3F4F6",
                    marginBottom: 8,
                    opacity: evOpacity,
                  }}
                >
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>{ev.name}</p>
                    <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>{ev.role}</p>
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#CA8A04", margin: 0 }}>{ev.score}</p>
                </div>
              );
            })}
          </GlassCard>
        </div>
      </div>

      <Subtitle
        text="Genera un QR o link para que evaluadores externos califiquen el producto sin necesidad de cuenta"
        startFrame={5}
        endFrame={260}
      />
    </div>
  );
};
