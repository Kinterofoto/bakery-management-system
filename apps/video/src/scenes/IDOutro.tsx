import React from "react";
import { Background } from "../components/Background";
import { AnimatedText } from "../components/AnimatedText";

export const IDOutro: React.FC = () => {
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
              background: "linear-gradient(135deg, #84CC16, #65A30D)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 60px rgba(132,204,22,0.3)",
            }}
          >
            <span style={{ fontSize: 50 }}>🔬</span>
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
              borderRadius: 20,
              padding: "32px 48px",
              maxWidth: 800,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                "Crea un proyecto y agrega prototipos",
                "Define materiales con porcentajes panadero e ingenieria",
                "Configura operaciones y asigna componentes",
                "Evalua calidad con puntuacion 1-5",
                "Comparte el panel sensorial con evaluadores externos",
                "Revisa costos y rendimiento del prototipo",
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{i + 1}.</span>
                  <p style={{ fontSize: 20, color: "#374151", margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedText>

        <AnimatedText delay={50}>
          <p style={{ fontSize: 20, color: "#9CA3AF", margin: 0, textAlign: "center" }}>
            Panaderia Industrial - I+D
          </p>
        </AnimatedText>
      </div>
    </div>
  );
};
