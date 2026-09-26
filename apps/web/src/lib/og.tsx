import { ImageResponse } from "next/og";
import type { Offer } from "@superscout/core";
import { formatEuro, STORE_META } from "@/lib/format";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * A share card that shows the deals, not just the logo.
 *
 * In a WhatsApp group or a Facebook feed the preview is the whole pitch: "18
 * koffie-acties, Douwe Egberts −50% bij Jumbo" gets the tap that a generic
 * brand card does not. Same palette as the site card; system sans-serif, so
 * no font is fetched while rendering.
 */
export function dealCard({
  eyebrow,
  title,
  subtitle,
  deals,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  deals: { offer: Offer; percent: number | null }[];
}): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fbfcf9",
          padding: 64,
          fontFamily: "sans-serif",
          color: "#16180f",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28 }}>
          <div style={{ display: "flex", fontWeight: 700 }}>
            Super<span style={{ color: "#f5a800" }}>Scout</span>
          </div>
          <div style={{ display: "flex", color: "#51564a" }}>{eyebrow}</div>
        </div>

        <div style={{ display: "flex", marginTop: 36, fontSize: 68, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: "#51564a" }}>{subtitle}</div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 14 }}>
          {deals.slice(0, 3).map(({ offer, percent }) => (
            <div
              key={offer.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#ffffff",
                border: "2px solid #e6e9df",
                borderRadius: 18,
                padding: "14px 22px",
                fontSize: 28,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 820 }}>
                <div
                  style={{
                    display: "flex",
                    background: STORE_META[offer.source].bg,
                    color: STORE_META[offer.source].fg,
                    borderRadius: 10,
                    padding: "4px 12px",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {STORE_META[offer.source].name}
                </div>
                <div style={{ display: "flex", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {offer.title.length > 44 ? `${offer.title.slice(0, 43)}…` : offer.title}
                </div>
              </div>
              <div style={{ display: "flex", fontWeight: 700, color: "#0f7a3e" }}>
                {percent !== null
                  ? `-${percent}%`
                  : offer.pricing.currentPriceCents !== null
                    ? formatEuro(offer.pricing.currentPriceCents)
                    : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
