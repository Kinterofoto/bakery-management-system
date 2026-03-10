import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";

export const IDOperaciones: React.FC = () => {
  const frame = useCurrentFrame();

  const operations = [
    {
      name: "Mezclado",
      time: "15 min",
      temp: "25°C",
      people: 1,
      materials: ["HARINA PANADERA", "AGUA", "SAL", "LEVADURA"],
    },
    {
      name: "Fermentacion",
      time: "120 min",
      temp: "28°C",
      people: 1,
      materials: ["MASA MADRE"],
    },
    {
      name: "Division y Formado",
      time: "20 min",
      temp: "-",
      people: 2,
      materials: [],
    },
    {
      name: "Horneado",
      time: "35 min",
      temp: "220°C",
      people: 1,
      materials: [],
    },
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
        <GlassCard delay={0} style={{ padding: "20px 32px" }}>
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
                Operaciones del Proceso
              </h1>
              <p style={{ fontSize: 14, color: "#6B7280", margin: "2px 0 0" }}>
                Define cada paso y asigna materiales
              </p>
            </div>
          </div>
        </GlassCard>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1 }}>
          {operations.map((op, i) => {
            const cardOpacity = interpolate(frame - (10 + i * 12), [0, 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={op.name}
                style={{
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 20,
                  padding: "24px 28px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                  opacity: cardOpacity,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#84CC16",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    {i + 1}
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 600, color: "#111827", margin: 0 }}>{op.name}</h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "10px 14px" }}>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Tiempo</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "2px 0 0" }}>{op.time}</p>
                  </div>
                  <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "10px 14px" }}>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Temp.</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "2px 0 0" }}>{op.temp}</p>
                  </div>
                  <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "10px 14px" }}>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Personas</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "2px 0 0" }}>{op.people}</p>
                  </div>
                </div>

                {op.materials.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", margin: "0 0 8px", textTransform: "uppercase" }}>
                      Materiales asignados
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {op.materials.map((m) => (
                        <div
                          key={m}
                          style={{
                            background: "rgba(132,204,22,0.15)",
                            color: "#65A30D",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: 8,
                          }}
                        >
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Subtitle
        text="Agrega operaciones, define parametros y asigna materiales a cada paso del proceso"
        startFrame={5}
        endFrame={230}
      />
    </div>
  );
};
