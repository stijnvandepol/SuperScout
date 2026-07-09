import type { SupermarketSlug } from "@superscout/core";
import { STORE_ICON, STORE_META } from "@/lib/format";

/**
 * Store badge — the supermarket's own favicon in a fixed square so every store
 * shows at an identical size. Falls back to a colour-coded text chip for chains
 * without a stored icon.
 */
export function StoreBadge({ source }: { source: SupermarketSlug }) {
  const meta = STORE_META[source];
  const icon = STORE_ICON[source];

  if (icon) {
    return (
      <span
        className="block h-7 w-7 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/10"
        title={meta.name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          alt={meta.name}
          width={28}
          height={28}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide"
      style={{ background: meta.bg, color: meta.fg }}
    >
      {meta.name}
    </span>
  );
}
