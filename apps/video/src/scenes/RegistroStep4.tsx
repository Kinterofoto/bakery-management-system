import React from "react";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { ProgressSteps } from "../components/ProgressSteps";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";
import { Cursor } from "../components/Cursor";

export const RegistroStep4: React.FC = () => {
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
          <ProgressSteps currentStep={4} />
        </AnimatedText>

        <GlassCard delay={8} style={{ width: 800, padding: "40px 48px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 48 }}>📋</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: "8px 0 0" }}>
              Revision
            </h2>
          </div>

          {/* Summary sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Company */}
            <AnimatedText delay={15}>
              <div
                style={{
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(229,231,235,0.5)",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
                  🏢 Empresa
                </h3>
                <p style={{ fontSize: 15, color: "#4B5563", margin: "2px 0" }}><strong>Nombre:</strong> Distribuidora ABC S.A.</p>
                <p style={{ fontSize: 15, color: "#4B5563", margin: "2px 0" }}><strong>NIT:</strong> 900123456-7</p>
                <p style={{ fontSize: 15, color: "#4B5563", margin: "2px 0" }}><strong>Direccion:</strong> Calle 123 #45-67, Bogota</p>
              </div>
            </AnimatedText>

            {/* Contact */}
            <AnimatedText delay={25}>
              <div
                style={{
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(229,231,235,0.5)",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
                  👤 Contacto
                </h3>
                <p style={{ fontSize: 15, color: "#4B5563", margin: "2px 0" }}><strong>Nombre:</strong> Juan Perez</p>
                <p style={{ fontSize: 15, color: "#4B5563", margin: "2px 0" }}><strong>Telefono:</strong> 3001234567</p>
                <p style={{ fontSize: 15, color: "#4B5563", margin: "2px 0" }}><strong>Email:</strong> contacto@distribuidoraabc.com</p>
              </div>
            </AnimatedText>

            {/* Days */}
            <AnimatedText delay={35}>
              <div
                style={{
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(229,231,235,0.5)",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
                  📅 Dias
                </h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Lunes", "Miercoles", "Viernes"].map((day) => (
                    <span
                      key={day}
                      style={{
                        padding: "4px 12px",
                        background: "rgba(59,130,246,0.15)",
                        color: "#1D4ED8",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            </AnimatedText>
          </div>
        </GlassCard>

        {/* Submit button */}
        <AnimatedText delay={50} style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 20, justifyContent: "space-between", width: 800 }}>
            <div style={{ color: "#6B7280", fontWeight: 600, padding: "12px 32px", borderRadius: 12, fontSize: 18 }}>
              ← Anterior
            </div>
            <div
              style={{
                background: "#22C55E",
                color: "white",
                fontWeight: 600,
                padding: "12px 32px",
                borderRadius: 12,
                fontSize: 18,
                boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ✓ Enviar
            </div>
          </div>
        </AnimatedText>
      </div>

      <Cursor
        startX={1100}
        startY={600}
        endX={1180}
        endY={870}
        startFrame={60}
        duration={20}
        clickAt={22}
      />

      <Subtitle
        text="Paso 4: Revisa toda la informacion y presiona Enviar"
        startFrame={5}
        endFrame={110}
      />
    </div>
  );
};
