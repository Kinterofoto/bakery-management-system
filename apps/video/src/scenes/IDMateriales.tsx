import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";

export const IDMateriales: React.FC = () => {
  const frame = useCurrentFrame();

  const materials = [
    { name: "HARINA PANADERA", qty: "1000", unit: "g", baker: "100.00%", eng: "52.63%", base: true },
    { name: "AGUA", qty: "650", unit: "g", baker: "65.00%", eng: "34.21%", base: false },
    { name: "SAL", qty: "20", unit: "g", baker: "2.00%", eng: "1.05%", base: false },
    { name: "LEVADURA", qty: "30", unit: "g", baker: "3.00%", eng: "1.58%", base: false },
    { name: "MASA MADRE", qty: "200", unit: "g", baker: "20.00%", eng: "10.53%", base: false },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      <Background variant="gray" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "32px 60px",
          gap: 20,
        }}
      >
        {/* Header */}
        <GlassCard delay={0} style={{ padding: "20px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #84CC16, #65A30D)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 24 }}>🧪</span>
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: 0 }}>
                  Componentes - Materiales
                </h1>
                <p style={{ fontSize: 14, color: "#6B7280", margin: "2px 0 0" }}>
                  PAN DE MASA MADRE INTEGRAL
                </p>
              </div>
            </div>
            <div
              style={{
                background: "#84CC16",
                color: "white",
                fontWeight: 600,
                padding: "10px 20px",
                borderRadius: 12,
                fontSize: 15,
              }}
            >
              + Agregar Material
            </div>
          </div>
        </GlassCard>

        {/* Materials table */}
        <GlassCard delay={10} style={{ padding: "24px 32px", flex: 1 }}>
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
              gap: 16,
              padding: "12px 16px",
              borderBottom: "2px solid #E5E7EB",
              marginBottom: 8,
            }}
          >
            {["Material", "Cantidad", "% Panadero", "% Ingenieria", "Base"].map((h) => (
              <p key={h} style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", margin: 0, textTransform: "uppercase" }}>
                {h}
              </p>
            ))}
          </div>

          {/* Table rows */}
          {materials.map((mat, i) => {
            const rowOpacity = interpolate(frame - (15 + i * 8), [0, 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={mat.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  gap: 16,
                  padding: "14px 16px",
                  borderBottom: "1px solid #F3F4F6",
                  opacity: rowOpacity,
                  background: mat.base ? "rgba(132,204,22,0.08)" : "transparent",
                  borderRadius: 8,
                }}
              >
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>{mat.name}</p>
                </div>
                <p style={{ fontSize: 16, color: "#374151", margin: 0 }}>{mat.qty} {mat.unit}</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: "#84CC16", margin: 0 }}>{mat.baker}</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: "#3B82F6", margin: 0 }}>{mat.eng}</p>
                <div>
                  {mat.base && (
                    <div
                      style={{
                        background: "#84CC16",
                        color: "white",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 8,
                        display: "inline-block",
                      }}
                    >
                      BASE
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Totals */}
          <AnimatedText delay={60}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                gap: 16,
                padding: "16px 16px",
                borderTop: "2px solid #E5E7EB",
                marginTop: 8,
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>TOTAL</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>1,900 g</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#84CC16", margin: 0 }}>190.00%</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#3B82F6", margin: 0 }}>100.00%</p>
              <div />
            </div>
          </AnimatedText>
        </GlassCard>
      </div>

      <Subtitle
        text="Agrega materiales, marca la harina como base, y los porcentajes se calculan automaticamente"
        startFrame={5}
        endFrame={240}
      />
    </div>
  );
};
