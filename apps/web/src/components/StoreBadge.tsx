import type { SupermarketSlug } from "@superscout/core";
import { STORE_META } from "@/lib/format";

export function StoreBadge({ source }: { source: SupermarketSlug }) {
  const meta = STORE_META[source];
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide"
      style={{ background: meta.bg, color: meta.fg }}
    >
      {meta.name}
    </span>
  );
}
