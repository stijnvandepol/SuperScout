"use client";

import { track } from "@/lib/analytics";

/**
 * A link to the retailer that records the click-through.
 *
 * The click to the store is the one moment SuperScout was useful enough to act
 * on, so it is the conversion worth counting — per store, never per person.
 */
export function OutboundLink({
  href,
  store,
  rel,
  className,
  style,
  children,
}: {
  href: string;
  store: string;
  rel: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className={className}
      style={style}
      onClick={() => track("Doorklik winkel", { winkel: store })}
    >
      {children}
    </a>
  );
}
