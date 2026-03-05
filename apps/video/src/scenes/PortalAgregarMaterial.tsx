import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { AnimatedText } from "../components/AnimatedText";
import { FormField } from "../components/FormField";
import { Subtitle } from "../components/Subtitle";
import { Cursor } from "../components/Cursor";

export const PortalAgregarMaterial: React.FC = () => {
  const frame = useCurrentFrame();

  const modalOpacity = interpolate(frame, [5, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const modalScale = interpolate(frame, [5, 15], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      <Background variant="gray" />

      {/* Dimmed background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          opacity: modalOpacity,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: modalOpacity,
          transform: `scale(${modalScale})`,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.95)",

            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 24,
            width: 750,
            boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#8B5CF6",
              padding: "20px 32px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "white", margin: 0 }}>
              Agregar Material
            </h2>
            <div style={{ color: "white", fontSize: 22, cursor: "pointer" }}>✕</div>
          </div>

          {/* Form Content */}
          <div style={{ padding: "28px 32px" }}>
            {/* Material selector */}
            <AnimatedText delay={15}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 16, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
                  Material *
                </label>
                <div
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    border: "1px solid rgba(229,231,235,0.5)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontSize: 18,
                    color: frame >= 30 ? "#111827" : "#9CA3AF",
                  }}
                >
                  {frame >= 30 ? "Azucar Refinada" : "Selecciona un material"}
                </div>
                <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>
                  Selecciona el material con el nombre mas parecido al tuyo
                </p>
              </div>
            </AnimatedText>

            <FormField
              label="Nombre Comercial (opcional)"
              value="Azucar Blanca Extra Fina"
              placeholder="Ej: Harina Panadera Premium"
              delay={20}
              typing
              typingStart={38}
            />

            <FormField
              label="Presentacion *"
              value="Saco x 50 kg"
              placeholder="Ej: Caja x 500 g"
              delay={25}
              typing
              typingStart={60}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <FormField
                label="Peso Total (gramos) *"
                value="50000"
                placeholder="Ej: 500"
                delay={30}
                typing
                typingStart={75}
              />
              <FormField
                label="Precio del Empaque *"
                value="95000"
                placeholder="Ej: 15000"
                delay={30}
                typing
                typingStart={85}
              />
            </div>

            {/* Price per gram calculation */}
            {frame >= 95 && (
              <AnimatedText delay={95}>
                <div
                  style={{
                    background: "rgba(139,92,246,0.1)",
                    border: "1px solid rgba(139,92,246,0.3)",
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 8,
                  }}
                >
                  <p style={{ fontSize: 15, fontWeight: 500, color: "#7C3AED", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    ℹ️ Precio por gramo
                  </p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "#7C3AED", margin: "8px 0 0" }}>
                    $1.9000
                  </p>
                  <p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0" }}>
                    Este es el precio calculado por cada gramo del material
                  </p>
                </div>
              </AnimatedText>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              background: "rgba(249,250,251,0.5)",
              padding: "16px 32px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <div style={{ padding: "10px 24px", borderRadius: 12, fontSize: 16, color: "#6B7280" }}>
              Cancelar
            </div>
            <div
              style={{
                background: "#8B5CF6",
                color: "white",
                fontWeight: 600,
                padding: "10px 28px",
                borderRadius: 12,
                fontSize: 16,
                boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
              }}
            >
              Agregar
            </div>
          </div>
        </div>
      </div>

      <Cursor
        startX={900}
        startY={400}
        endX={680}
        endY={830}
        startFrame={105}
        duration={15}
        clickAt={18}
      />

      <Subtitle
        text="Para agregar un material: selecciona de la lista, agrega detalles de precio y peso"
        startFrame={5}
        endFrame={110}
      />
      <Subtitle
        text="El precio por gramo se calcula automaticamente"
        startFrame={95}
        endFrame={140}
      />
    </div>
  );
};
