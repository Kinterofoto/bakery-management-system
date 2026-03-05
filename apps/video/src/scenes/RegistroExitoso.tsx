import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";

export const RegistroExitoso: React.FC = () => {
  const frame = useCurrentFrame();

  const checkScale = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      <Background variant="blue" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GlassCard delay={5} style={{ width: 600, padding: "60px 48px", textAlign: "center" }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              transform: `scale(${checkScale})`,
            }}
          >
            <span style={{ fontSize: 56 }}>✅</span>
          </div>

          <AnimatedText delay={20}>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>
              Registro Exitoso!
            </h2>
          </AnimatedText>

          <AnimatedText delay={30}>
            <p style={{ fontSize: 20, color: "#6B7280", margin: "0 0 32px", lineHeight: 1.5 }}>
              Gracias por registrarte como proveedor.<br />
              Nuestro equipo revisara tu informacion<br />
              y se pondra en contacto contigo pronto.
            </p>
          </AnimatedText>

          <AnimatedText delay={45}>
            <p style={{ fontSize: 18, color: "#9CA3AF", margin: 0 }}>
              Recibiras un enlace para acceder a tu portal
            </p>
          </AnimatedText>
        </GlassCard>
      </div>

      <Subtitle
        text="Tu registro ha sido enviado exitosamente. Recibiras un enlace al portal."
        startFrame={10}
        endFrame={110}
      />
    </div>
  );
};
