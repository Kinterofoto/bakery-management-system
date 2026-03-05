import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { GlassCard } from "../components/GlassCard";
import { AnimatedText } from "../components/AnimatedText";
import { Subtitle } from "../components/Subtitle";

export const PortalOrdenes: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      <Background variant="gray" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "32px 60px",
          gap: 20,
        }}
      >
        {/* Header */}
        <GlassCard delay={0} style={{ padding: "20px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 32 }}>🏢</span>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: "#111827", margin: 0 }}>Distribuidora ABC S.A.</h1>
              <p style={{ fontSize: 15, color: "#6B7280", margin: "2px 0 0" }}>Portal de Gestion de Materiales</p>
            </div>
          </div>
        </GlassCard>

        {/* Tabs - Orders selected */}
        <AnimatedText delay={5}>
          <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 16, padding: 8, display: "flex", gap: 8 }}>
            <div style={{ flex: 1, padding: "12px 24px", borderRadius: 12, color: "#6B7280", fontWeight: 600, fontSize: 18, textAlign: "center" }}>
              📦 Materiales
            </div>
            <div
              style={{
                flex: 1,
                padding: "12px 24px",
                borderRadius: 12,
                background: "#8B5CF6",
                color: "white",
                fontWeight: 600,
                fontSize: 18,
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
              }}
            >
              📋 Ordenes de Compra
            </div>
          </div>
        </AnimatedText>

        {/* Orders content */}
        <GlassCard delay={10} style={{ padding: "24px 32px", flex: 1, overflow: "hidden" }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "#111827", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 10 }}>
            📋 Ordenes de Compra (3)
          </h2>

          {/* Stats */}
          <AnimatedText delay={15}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Pendientes", value: "1", color: "#EAB308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)" },
                { label: "Ordenados", value: "1", color: "#3B82F6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)" },
                { label: "Parciales", value: "0", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)" },
                { label: "Recibidos", value: "1", color: "#22C55E", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: stat.bg,
                    border: `1px solid ${stat.border}`,
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>{stat.label}</p>
                  <p style={{ fontSize: 32, fontWeight: 700, color: stat.color, margin: "4px 0 0" }}>{stat.value}</p>
                </div>
              ))}
            </div>
          </AnimatedText>

          {/* Order cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              {
                number: "OC-001",
                status: "Pendiente",
                statusColor: "#EAB308",
                statusBg: "rgba(234,179,8,0.15)",
                date: "28 Feb 2026",
                delivery: "5 Mar 2026",
                total: "335,000",
                items: [
                  { name: "Harina de Trigo", qty: "2 sacos", price: "$125,000" },
                  { name: "Azucar Refinada", qty: "1 saco", price: "$85,000" },
                ],
              },
              {
                number: "OC-002",
                status: "Recibido",
                statusColor: "#22C55E",
                statusBg: "rgba(34,197,94,0.15)",
                date: "20 Feb 2026",
                delivery: "25 Feb 2026",
                total: "250,000",
                items: [
                  { name: "Harina de Trigo", qty: "2 sacos", price: "$125,000" },
                ],
                completion: 100,
              },
            ].map((order, i) => {
              const orderOpacity = interpolate(frame - (25 + i * 12), [0, 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={order.number}
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    border: "1px solid rgba(229,231,235,0.5)",
                    borderRadius: 16,
                    padding: 20,
                    opacity: orderOpacity,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: 0 }}>
                      Orden #{order.number}
                    </h3>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: 8,
                        background: order.statusBg,
                        color: order.statusColor,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 14 }}>
                    <div>
                      <p style={{ color: "#9CA3AF", margin: 0 }}>Fecha</p>
                      <p style={{ color: "#111827", fontWeight: 500, margin: "2px 0 0" }}>{order.date}</p>
                    </div>
                    <div>
                      <p style={{ color: "#9CA3AF", margin: 0 }}>Entrega</p>
                      <p style={{ color: "#111827", fontWeight: 500, margin: "2px 0 0" }}>{order.delivery}</p>
                    </div>
                    <div>
                      <p style={{ color: "#9CA3AF", margin: 0 }}>Total</p>
                      <p style={{ color: "#111827", fontWeight: 700, margin: "2px 0 0" }}>${order.total}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ marginTop: 12, borderTop: "1px solid rgba(229,231,235,0.3)", paddingTop: 12 }}>
                    {order.items.map((item) => (
                      <div
                        key={item.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 12px",
                          background: "rgba(249,250,251,0.5)",
                          borderRadius: 8,
                          marginBottom: 4,
                          fontSize: 14,
                        }}
                      >
                        <span style={{ color: "#374151", fontWeight: 500 }}>{item.name}</span>
                        <span style={{ color: "#6B7280" }}>{item.qty} - {item.price}</span>
                      </div>
                    ))}
                  </div>

                  {/* Completion bar */}
                  {order.completion !== undefined && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>Progreso de Recepcion</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#8B5CF6" }}>{order.completion}%</span>
                      </div>
                      <div style={{ width: "100%", height: 8, background: "#E5E7EB", borderRadius: 4 }}>
                        <div
                          style={{
                            width: `${order.completion}%`,
                            height: 8,
                            background: "#8B5CF6",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      <Subtitle
        text="En Ordenes de Compra puedes ver tus pedidos, su estado y el detalle de cada uno"
        startFrame={5}
        endFrame={150}
      />
    </div>
  );
};
