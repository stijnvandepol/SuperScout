import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon — same magnifier-finds-discount mark as icon.svg,
// drawn inline (no external font/asset fetch, build-safe).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffbe0f",
          borderRadius: 40,
        }}
      >
        <svg width="150" height="150" viewBox="0 0 32 32">
          <g stroke="#1c1500" fill="none">
            <circle cx="14" cy="13.5" r="6.75" strokeWidth="2.6" />
            <path d="M19 18.5 24.5 24" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M11.6 16.2 16.4 10.8" strokeWidth="1.9" strokeLinecap="round" />
          </g>
          <circle cx="11.9" cy="11.4" r="1.45" fill="#1c1500" />
          <circle cx="16.1" cy="15.6" r="1.45" fill="#1c1500" />
        </svg>
      </div>
    ),
    size,
  );
}
