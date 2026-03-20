import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

export const Subtitle: React.FC<{
  text: string;
  startFrame?: number;
  endFrame?: number;
}> = ({ text, startFrame = 0, endFrame = 999999 }) => {
  const frame = useCurrentFrame();

  if (frame < startFrame || frame > endFrame) return null;

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 10, endFrame - 10, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: "50%",
        transform: "translateX(-50%)",
        opacity,
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.75)",
          borderRadius: 16,
          padding: "16px 40px",
          maxWidth: 1200,
        }}
      >
        <p
          style={{
            color: "white",
            fontSize: 32,
            fontWeight: 500,
            textAlign: "center",
            margin: 0,
            lineHeight: 1.4,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
};
