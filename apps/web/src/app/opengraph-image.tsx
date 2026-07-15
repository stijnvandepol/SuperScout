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
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#ffbe0f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 32 32">
              <g stroke="#1c1500" fill="none">
                <circle cx="14" cy="13.5" r="6.75" strokeWidth="2.6" />
                <path d="M19 18.5 24.5 24" strokeWidth="3.2" strokeLinecap="round" />
                <path d="M11.6 16.2 16.4 10.8" strokeWidth="1.9" strokeLinecap="round" />
              </g>
              <circle cx="11.9" cy="11.4" r="1.45" fill="#1c1500" />
              <circle cx="16.1" cy="15.6" r="1.45" fill="#1c1500" />
            </svg>
          </div>
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
