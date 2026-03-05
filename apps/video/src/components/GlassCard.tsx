import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

export const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  delay?: number;
}> = ({ children, style, delay = 0 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame - delay, [0, 15], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.3)",
        borderRadius: 24,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.1)",
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
