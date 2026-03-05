import React from "react";

export const Background: React.FC<{
  variant?: "blue" | "gray";
}> = ({ variant = "blue" }) => {
  const gradient =
    variant === "blue"
      ? "linear-gradient(135deg, #EBF5FF 0%, #FFFFFF 50%, #EBF5FF 100%)"
      : "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: gradient,
      }}
    />
  );
};
