import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { AnimatedText } from "../components/AnimatedText";

export const Outro: React.FC = () => {
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
          justifyContent: "center",
          gap: 32,
        }}
      >
        <AnimatedText delay={0}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 28,
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 60px rgba(59,130,246,0.3)",
            }}
          >
            <span style={{ fontSize: 50 }}>🏭</span>
          </div>
        </AnimatedText>

        <AnimatedText delay={10}>
          <h1 style={{ fontSize: 56, fontWeight: 700, color: "#111827", margin: 0, textAlign: "center" }}>
            Eso es todo!
          </h1>
        </AnimatedText>

        <AnimatedText delay={20}>
          <div
            style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(12px)",
              borderRadius: 20,
              padding: "32px 48px",
              maxWidth: 800,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>1.</span>
                <p style={{ fontSize: 22, color: "#374151", margin: 0 }}>
                  Registrate en <strong>/registro-proveedor</strong>
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>2.</span>
                <p style={{ fontSize: 22, color: "#374151", margin: 0 }}>
                  Espera la aprobacion y recibe tu enlace
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>3.</span>
                <p style={{ fontSize: 22, color: "#374151", margin: 0 }}>
                  Configura tus dias de entrega y materiales
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>4.</span>
                <p style={{ fontSize: 22, color: "#374151", margin: 0 }}>
                  Consulta tus ordenes de compra en el portal
                </p>
              </div>
            </div>
          </div>
        </AnimatedText>

        <AnimatedText delay={40}>
          <p style={{ fontSize: 24, color: "#6B7280", margin: 0, textAlign: "center" }}>
            Contacta a compras si tienes alguna duda
          </p>
        </AnimatedText>

        <AnimatedText delay={50}>
          <p style={{ fontSize: 20, color: "#9CA3AF", margin: 0, textAlign: "center" }}>
            Panaderia Industrial
          </p>
        </AnimatedText>
      </div>
    </div>
  );
};
