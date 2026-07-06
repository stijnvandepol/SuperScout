import { ImageResponse } from "next/og";

export const alt = "SuperScout — alle supermarktaanbiedingen van deze week op één plek";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social share card: brand look, no external font fetches (build-safe).
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
          background: "#fbfcf9",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#f5a800",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#16180f" }}>
            Super<span style={{ color: "#f5a800" }}>Scout</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 88,
            fontWeight: 700,
            color: "#16180f",
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          <div style={{ display: "flex" }}>Vind de</div>
          <div style={{ display: "flex" }}>
            <span style={{ color: "#f5a800" }}>beste deal</span>&nbsp;in seconden.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 32, color: "#51564a" }}>
          Aanbiedingen van 10 supermarkten · dagelijks vers · zonder account
        </div>
      </div>
    ),
    size,
  );
}
