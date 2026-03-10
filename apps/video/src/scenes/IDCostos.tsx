import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";

export const IDCostos: React.FC = () => {
  const frame = useCurrentFrame();

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
            <span style={{ fontSize: 48 }}>💰</span>
            <h1 style={{ fontSize: 48, fontWeight: 700, color: "#111827", margin: 0 }}>
              Resumen de Costos
            </h1>
          </div>
        </AnimatedText>

        {/* Cost summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, width: "100%" }}>
          {[
            { label: "Costo Materiales", value: "$45,200", icon: "📦", color: "#3B82F6" },
            { label: "Costo Mano de Obra", value: "$12,800", icon: "👷", color: "#8B5CF6" },
            { label: "Costo Total", value: "$58,000", icon: "💵", color: "#16A34A" },
          ].map((item, i) => (
            <GlassCard key={item.label} delay={10 + i * 10} style={{ padding: "28px 32px", textAlign: "center" as const }}>
              <span style={{ fontSize: 40 }}>{item.icon}</span>
              <p style={{ fontSize: 14, color: "#6B7280", margin: "12px 0 4px", textTransform: "uppercase" as const }}>
                {item.label}
              </p>
              <p style={{ fontSize: 36, fontWeight: 700, color: item.color, margin: 0 }}>
                {item.value}
              </p>
            </GlassCard>
          ))}
        </div>

        {/* Per unit */}
        <GlassCard delay={40} style={{ padding: "28px 48px", width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24 }}>
            {[
              { label: "Unidades Producidas", value: "48", unit: "uds" },
              { label: "Costo por Unidad", value: "$1,208", unit: "" },
              { label: "Rendimiento", value: "92.5", unit: "%" },
              { label: "Merma", value: "142", unit: "g" },
            ].map((item, i) => {
              const itemOpacity = interpolate(frame - (50 + i * 8), [0, 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div key={item.label} style={{ textAlign: "center", opacity: itemOpacity }}>
                  <p style={{ fontSize: 13, color: "#6B7280", margin: 0, textTransform: "uppercase" }}>{item.label}</p>
                  <p style={{ fontSize: 32, fontWeight: 700, color: "#111827", margin: "8px 0 0" }}>
                    {item.value}
                    <span style={{ fontSize: 16, color: "#9CA3AF", fontWeight: 500 }}> {item.unit}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Material breakdown */}
        <GlassCard delay={60} style={{ padding: "24px 32px", width: "100%" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>
            Desglose de Materiales
          </h3>
          {[
            { name: "HARINA PANADERA", qty: "1,000 g", cost: "$2,500" },
            { name: "AGUA", qty: "650 g", cost: "$0" },
            { name: "SAL", qty: "20 g", cost: "$50" },
            { name: "LEVADURA", qty: "30 g", cost: "$450" },
            { name: "MASA MADRE", qty: "200 g", cost: "$42,200" },
          ].map((mat, i) => {
            const rowOpacity = interpolate(frame - (65 + i * 5), [0, 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={mat.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid #F3F4F6",
                  opacity: rowOpacity,
                }}
              >
                <p style={{ fontSize: 16, fontWeight: 500, color: "#374151", margin: 0 }}>{mat.name}</p>
                <div style={{ display: "flex", gap: 40 }}>
                  <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>{mat.qty}</p>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>{mat.cost}</p>
                </div>
              </div>
            );
          })}
        </GlassCard>
      </div>

      <Subtitle
        text="El sistema calcula automaticamente costos de materiales, mano de obra y costo por unidad"
        startFrame={5}
        endFrame={220}
      />
    </div>
  );
};
