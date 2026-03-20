import React from "react";
import { Background } from "../components/Background";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";

export const PortalIntro: React.FC = () => {
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
          gap: 40,
        }}
      >
        <AnimatedText delay={0}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 28,
              background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 60px rgba(139,92,246,0.3)",
            }}
          >
            <span style={{ fontSize: 50 }}>📦</span>
          </div>
        </AnimatedText>

        <AnimatedText delay={10}>
          <h1 style={{ fontSize: 64, fontWeight: 700, color: "#111827", margin: 0, textAlign: "center" }}>
            Portal del Proveedor
          </h1>
        </AnimatedText>

        <AnimatedText delay={20}>
          <p style={{ fontSize: 32, color: "#6B7280", margin: 0, textAlign: "center" }}>
            Accede con tu enlace unico para gestionar:
          </p>
        </AnimatedText>

        <AnimatedText delay={30}>
          <div style={{ display: "flex", gap: 40 }}>
            {[
              { icon: "📅", label: "Dias de\nEntrega" },
              { icon: "📦", label: "Tus\nMateriales" },
              { icon: "📋", label: "Ordenes de\nCompra" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.4)",
                  borderRadius: 20,
                  padding: "32px 40px",
                  textAlign: "center",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
                }}
              >
                <span style={{ fontSize: 48 }}>{item.icon}</span>
                <p style={{ fontSize: 20, fontWeight: 600, color: "#374151", margin: "12px 0 0", whiteSpace: "pre-line" }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </AnimatedText>
      </div>

      <Subtitle
        text="Una vez aprobado, recibiras un enlace unico para acceder a tu portal"
        startFrame={5}
        endFrame={120}
      />
    </div>
  );
};
