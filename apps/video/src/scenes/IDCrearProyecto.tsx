import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";

export const IDCrearProyecto: React.FC = () => {
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
          justifyContent: "center",
          padding: "40px 80px",
          gap: 30,
        }}
      >
        <AnimatedText delay={0}>
          <h1 style={{ fontSize: 48, fontWeight: 700, color: "#111827", margin: 0, textAlign: "center" }}>
            Crear Nuevo Prototipo
          </h1>
        </AnimatedText>

        <GlassCard delay={10} style={{ padding: "32px 48px", width: 800 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#111827", margin: "0 0 20px" }}>
            Proyecto
          </h2>

          {/* Project selection buttons */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Sin Proyecto", active: false },
              { label: "Existente", active: false },
              { label: "Nuevo", active: true },
            ].map((btn) => (
              <div
                key={btn.label}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: btn.active ? "#111827" : "transparent",
                  color: btn.active ? "white" : "#6B7280",
                  border: btn.active ? "none" : "1px solid #D1D5DB",
                  fontWeight: 600,
                  fontSize: 16,
                  textAlign: "center",
                }}
              >
                {btn.label}
              </div>
            ))}
          </div>

          {/* New project fields */}
          <AnimatedText delay={20}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  padding: "12px 16px",
                }}
              >
                <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Nombre del proyecto</p>
                <p style={{ fontSize: 18, color: "#111827", margin: "4px 0 0", fontWeight: 500 }}>
                  Pan Artesanal Premium 2026
                </p>
              </div>
              <div
                style={{
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  padding: "12px 16px",
                }}
              >
                <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Descripcion (opcional)</p>
                <p style={{ fontSize: 16, color: "#6B7280", margin: "4px 0 0" }}>
                  Linea de panes artesanales con masa madre
                </p>
              </div>
            </div>
          </AnimatedText>
        </GlassCard>

        <GlassCard delay={30} style={{ padding: "32px 48px", width: 800 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#111827", margin: "0 0 20px" }}>
            Producto
          </h2>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 12,
                background: "#111827",
                color: "white",
                fontWeight: 600,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              Producto Nuevo
            </div>
            <div
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #D1D5DB",
                color: "#6B7280",
                fontWeight: 600,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              Producto Existente
            </div>
          </div>
          <div
            style={{
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: 12,
              padding: "12px 16px",
            }}
          >
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Nombre del Producto</p>
            <p style={{ fontSize: 18, color: "#111827", margin: "4px 0 0", fontWeight: 500 }}>
              PAN DE MASA MADRE INTEGRAL
            </p>
          </div>
        </GlassCard>
      </div>

      <Subtitle
        text="Primero crea o selecciona un proyecto, luego define el producto a prototipar"
        startFrame={5}
        endFrame={200}
      />
    </div>
  );
};
