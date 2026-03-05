import React from "react";
import { useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { ProgressSteps } from "../components/ProgressSteps";
import { FormField } from "../components/FormField";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";
import { Cursor } from "../components/Cursor";

export const RegistroStep1: React.FC = () => {
  const frame = useCurrentFrame();

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
        {/* Title */}
        <AnimatedText delay={0}>
          <h1 style={{ fontSize: 42, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            Registro de Proveedores
          </h1>
          <p style={{ fontSize: 20, color: "#6B7280", textAlign: "center", margin: 0 }}>
            Panaderia Industrial
          </p>
        </AnimatedText>

        {/* Progress */}
        <AnimatedText delay={8} style={{ margin: "24px 0" }}>
          <ProgressSteps currentStep={1} />
        </AnimatedText>

        {/* Form Card */}
        <GlassCard delay={12} style={{ width: 800, padding: "40px 48px", flex: 1, maxHeight: 500 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 48 }}>🏢</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: "8px 0 0" }}>
              Informacion de la Empresa
            </h2>
          </div>

          <FormField
            label="Nombre de la Empresa *"
            value="Distribuidora ABC S.A."
            placeholder="Ej: Distribuidora ABC S.A."
            delay={20}
            typing
            typingStart={30}
          />
          <FormField
            label="NIT *"
            value="900123456-7"
            placeholder="Ej: 900123456-7"
            delay={25}
            typing
            typingStart={55}
          />
          <FormField
            label="Direccion *"
            value="Calle 123 #45-67, Bogota"
            placeholder="Ej: Calle 123 #45-67, Bogota"
            delay={30}
            typing
            typingStart={75}
          />
        </GlassCard>

        {/* Navigation buttons */}
        <AnimatedText delay={90} style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 20, justifyContent: "flex-end", width: 800 }}>
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

      {/* Cursor clicking "Siguiente" */}
      <Cursor
        startX={1100}
        startY={600}
        endX={1180}
        endY={860}
        startFrame={100}
        duration={20}
        clickAt={22}
      />

      <Subtitle
        text="Paso 1: Ingresa los datos de tu empresa: nombre, NIT y direccion"
        startFrame={5}
        endFrame={140}
      />
    </div>
  );
};
