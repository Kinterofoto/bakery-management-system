import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

export const FormField: React.FC<{
  label: string;
  value: string;
  placeholder: string;
  delay?: number;
  typing?: boolean;
  typingStart?: number;
}> = ({ label, value, placeholder, delay = 0, typing = false, typingStart = 0 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let displayValue = value;
  if (typing && frame >= typingStart) {
    const charsToShow = Math.min(
      Math.floor((frame - typingStart) / 2),
      value.length
    );
    displayValue = value.substring(0, charsToShow);
  } else if (typing) {
    displayValue = "";
  }

  const showCursor =
    typing && frame >= typingStart && displayValue.length < value.length;

  return (
    <div style={{ opacity, marginBottom: 16 }}>
      <label
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: "#374151",
          display: "block",
          marginBottom: 6,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {label}
      </label>
      <div
        style={{
          background: "rgba(255,255,255,0.5)",
          border: "1px solid rgba(229,231,235,0.5)",
          borderRadius: 12,
          padding: "12px 16px",
          fontSize: 18,
          color: displayValue ? "#111827" : "#9CA3AF",
          fontFamily: "system-ui, sans-serif",
          minHeight: 48,
          display: "flex",
          alignItems: "center",
        }}
      >
        {displayValue || placeholder}
        {showCursor && (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 22,
              background: "#3B82F6",
              marginLeft: 1,
            }}
          />
        )}
      </div>
    </div>
  );
};
