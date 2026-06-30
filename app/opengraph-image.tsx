import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const runtime = "edge";
export const alt = `${SITE_NAME} — A personal stock journal`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#070b14",
          padding: 72,
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(60% 60% at 30% 20%, rgba(110,91,255,0.35), transparent 70%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16, zIndex: 1 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #6e5bff, #00d9ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            ✦
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, zIndex: 1 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.05,
              maxWidth: 980,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <span>A stock journal that turns your trades into&nbsp;</span>
            <span
              style={{
                background: "linear-gradient(135deg, #6e5bff, #00d9ff)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              clean P/L.
            </span>
          </div>
          <div style={{ fontSize: 28, color: "#c8cbd6", maxWidth: 900 }}>
            Multi-broker ledger · average-cost P/L · RSI signals · Shadow Trading
          </div>
        </div>
      </div>
    ),
    size,
  );
}
