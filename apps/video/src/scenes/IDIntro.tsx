import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { AnimatedText } from "../components/AnimatedText";

export const IDIntro: React.FC = () => {
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
              background: "linear-gradient(135deg, #84CC16, #65A30D)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 60px rgba(132,204,22,0.3)",
            }}
          >
            <span style={{ fontSize: 60 }}>🔬</span>
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
            I+D Prototipos
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
            Investigacion y Desarrollo
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
            Guia completa del modulo
          </p>
        </AnimatedText>
      </div>
    </div>
  );
};
