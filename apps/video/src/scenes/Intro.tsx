import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { AnimatedText } from "../components/AnimatedText";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  const logoScale = interpolate(frame, [0, 20], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Background variant="blue" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Logo / Icon */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 60px rgba(59,130,246,0.3)",
            }}
          >
            <span style={{ fontSize: 60 }}>🏭</span>
          </div>
        </div>

        <AnimatedText delay={10}>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
              textAlign: "center",
            }}
          >
            Portal de Proveedores
          </h1>
        </AnimatedText>

        <AnimatedText delay={20}>
          <p
            style={{
              fontSize: 36,
              color: "#6B7280",
              margin: "16px 0 0",
              textAlign: "center",
            }}
          >
            Panaderia Industrial
          </p>
        </AnimatedText>

        <AnimatedText delay={35}>
          <p
            style={{
              fontSize: 28,
              color: "#9CA3AF",
              margin: "40px 0 0",
              textAlign: "center",
            }}
          >
            Guia de registro y uso del portal
          </p>
        </AnimatedText>
      </div>
    </div>
  );
};
