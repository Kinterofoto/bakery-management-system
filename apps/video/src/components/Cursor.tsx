import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

export const Cursor: React.FC<{
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startFrame: number;
  duration?: number;
  clickAt?: number;
}> = ({ startX, startY, endX, endY, startFrame, duration = 20, clickAt }) => {
  const frame = useCurrentFrame();

  const x = interpolate(frame - startFrame, [0, duration], [startX, endX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame - startFrame, [0, duration], [startY, endY], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(
    frame - startFrame,
    [-5, 0, duration + 30, duration + 35],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isClicking =
    clickAt !== undefined &&
    frame >= startFrame + clickAt &&
    frame < startFrame + clickAt + 6;
  const scale = isClicking ? 0.85 : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        transform: `scale(${scale})`,
        zIndex: 999,
        pointerEvents: "none",
      }}
    >
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
        <path
          d="M3 1L3 26L9 20L15 32L20 30L14 18L23 18L3 1Z"
          fill="white"
          stroke="black"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {isClicking && (
        <div
          style={{
            position: "absolute",
            top: -8,
            left: -8,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "3px solid rgba(59,130,246,0.5)",
            animation: "none",
          }}
        />
      )}
    </div>
  );
};
