import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";

export const PortalMateriales: React.FC = () => {
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
          padding: "32px 60px",
          gap: 20,
        }}
      >
        {/* Header */}
        <GlassCard delay={0} style={{ padding: "24px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 36 }}>🏢</span>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 600, color: "#111827", margin: 0 }}>
                Distribuidora ABC S.A.
              </h1>
              <p style={{ fontSize: 16, color: "#6B7280", margin: "4px 0 0" }}>
                Portal de Gestion de Materiales
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Tabs */}
        <AnimatedText delay={8}>
          <div
            style={{
              background: "rgba(255,255,255,0.7)",
              borderRadius: 16,
              padding: 8,
              display: "flex",
              gap: 8,
            }}
          >
            <div
              style={{
                flex: 1,
                padding: "12px 24px",
                borderRadius: 12,
                background: "#8B5CF6",
                color: "white",
                fontWeight: 600,
                fontSize: 18,
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
              }}
            >
              📦 Materiales
            </div>
            <div
              style={{
                flex: 1,
                padding: "12px 24px",
                borderRadius: 12,
                color: "#6B7280",
                fontWeight: 600,
                fontSize: 18,
                textAlign: "center",
              }}
            >
              📋 Ordenes de Compra
            </div>
          </div>
        </AnimatedText>

        {/* Delivery Days */}
        <GlassCard delay={15} style={{ padding: "24px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              📅 Dias de Entrega
            </h2>
            <div
              style={{
                background: "#8B5CF6",
                color: "white",
                fontWeight: 600,
                padding: "8px 20px",
                borderRadius: 12,
                fontSize: 15,
              }}
            >
              Guardar Dias
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            {["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"].map((day) => {
              const isSelected = ["Lunes", "Miercoles", "Viernes"].includes(day);
              return (
                <div
                  key={day}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: `2px solid ${isSelected ? "#8B5CF6" : "rgba(229,231,235,0.5)"}`,
                    background: isSelected ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.5)",
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: `2px solid ${isSelected ? "#8B5CF6" : "#D1D5DB"}`,
                      background: isSelected ? "#8B5CF6" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {isSelected && "✓"}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#374151" }}>{day}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Materials Section */}
        <GlassCard delay={25} style={{ padding: "24px 32px", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              📦 Materiales Asignados (2)
            </h2>
            <div
              style={{
                background: "#8B5CF6",
                color: "white",
                fontWeight: 600,
                padding: "10px 24px",
                borderRadius: 12,
                fontSize: 16,
                boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              + Agregar Material
            </div>
          </div>

          {/* Material cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { name: "Harina Panadera Premium", official: "Harina de Trigo", presentation: "Saco x 50 kg", price: "125,000", weight: "50000", pricePerGram: "2.5000" },
              { name: "Mantequilla Sin Sal", official: null, presentation: "Caja x 10 kg", price: "85,000", weight: "10000", pricePerGram: "8.5000" },
            ].map((mat, i) => {
              const matOpacity = interpolate(frame - (30 + i * 10), [0, 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={mat.name}
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    border: "1px solid rgba(229,231,235,0.5)",
                    borderRadius: 16,
                    padding: 20,
                    opacity: matOpacity,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: 0 }}>{mat.name}</h3>
                      {mat.official && (
                        <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", margin: "2px 0 0" }}>
                          Nombre oficial: {mat.official}
                        </p>
                      )}
                      <p style={{ fontSize: 15, color: "#6B7280", margin: "4px 0 0" }}>{mat.presentation}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#16A34A", fontSize: 18 }}>$</span>
                          <div>
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Precio</p>
                            <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>${mat.price}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 18 }}>⚖️</span>
                          <div>
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Peso Total</p>
                            <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>{mat.weight} g</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 18 }}>ℹ️</span>
                          <div>
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Precio/Gramo</p>
                            <p style={{ fontSize: 16, fontWeight: 600, color: "#8B5CF6", margin: 0 }}>${mat.pricePerGram}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ padding: 8, borderRadius: 8, color: "#6B7280", fontSize: 18 }}>✏️</div>
                      <div style={{ padding: 8, borderRadius: 8, color: "#DC2626", fontSize: 18 }}>🗑️</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      <Subtitle
        text="En la pestana Materiales puedes ver y editar tus dias de entrega y materiales"
        startFrame={5}
        endFrame={150}
      />
    </div>
  );
};
