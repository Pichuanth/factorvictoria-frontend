import React from "react";

export default function HudCard({
  bg,
  bgColor,
  children,
  className = "",
  overlayVariant = "casillas",
  glow = "gold",
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 ${className}`}
      style={{ backgroundColor: bgColor || "#020617" }}
    >
      {bg ? (
        <img
          src={bg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      ) : null}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
