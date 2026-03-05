import React from "react";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { ProgressSteps } from "../components/ProgressSteps";
import { FormField } from "../components/FormField";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";
import { Cursor } from "../components/Cursor";

export const RegistroStep2: React.FC = () => {
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
          <ProgressSteps currentStep={2} />
        </AnimatedText>

        <GlassCard delay={8} style={{ width: 800, padding: "40px 48px", flex: 1, maxHeight: 500 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 48 }}>👤</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: "8px 0 0" }}>
              Informacion de Contacto
            </h2>
          </div>

          <FormField
            label="Nombre del Contacto *"
            value="Juan Perez"
            placeholder="Ej: Juan Perez"
            delay={15}
            typing
            typingStart={22}
          />
          <FormField
            label="Telefono *"
            value="3001234567"
            placeholder="Ej: 3001234567"
            delay={20}
            typing
            typingStart={40}
          />
          <FormField
            label="Email *"
            value="contacto@distribuidoraabc.com"
            placeholder="Ej: contacto@empresa.com"
            delay={25}
            typing
            typingStart={55}
          />
        </GlassCard>

        <AnimatedText delay={85} style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 20, justifyContent: "space-between", width: 800 }}>
            <div
              style={{
                color: "#6B7280",
                fontWeight: 600,
                padding: "12px 32px",
                borderRadius: 12,
                fontSize: 18,
              }}
            >
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

      <Cursor
        startX={1100}
        startY={600}
        endX={1180}
        endY={860}
        startFrame={95}
        duration={20}
        clickAt={22}
      />

      <Subtitle
        text="Paso 2: Ingresa la persona de contacto, telefono y email"
        startFrame={5}
        endFrame={130}
      />
    </div>
  );
};
