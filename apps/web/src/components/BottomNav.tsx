"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getBasket, onBasketChange } from "@/lib/basket";
import { getWatchlist, onWatchlistChange } from "@/lib/watchlist";
import { BasketIcon, BellIcon, GridIcon, SearchIcon, StoreIcon } from "./icons";

const items = [
  { href: "/", label: "Zoeken", Icon: SearchIcon, match: (p: string) => p === "/" },
  { href: "/categorieen", label: "Categorieën", Icon: GridIcon, match: (p: string) => p.startsWith("/categorie") },
  { href: "/winkels", label: "Winkels", Icon: StoreIcon, match: (p: string) => p.startsWith("/winkel") },
  { href: "/volglijst", label: "Volglijst", Icon: BellIcon, match: (p: string) => p.startsWith("/volglijst") },
  { href: "/mandje", label: "Mandje", Icon: BasketIcon, match: (p: string) => p.startsWith("/mandje") },
];

export function BottomNav() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [watching, setWatching] = useState(0);

  useEffect(() => {
    const read = () => setCount(getBasket().length);
    read();
    return onBasketChange(read);
  }, []);

  useEffect(() => {
    const read = () => setWatching(getWatchlist().length);
    read();
    return onWatchlistChange(read);
  }, []);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 font-mono text-[10px] font-bold transition-colors ${
                active ? "text-ink" : "text-ink-soft"
              }`}
            >
              <span className="relative">
                <Icon className={`h-6 w-6 ${active ? "text-deal" : ""}`} />
                {label === "Mandje" && count > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-deal px-1 text-center text-[9px] font-bold leading-4 text-deal-ink">
                    {count}
                  </span>
                ) : null}
                {label === "Volglijst" && watching > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-fresh px-1 text-center text-[9px] font-bold leading-4 text-white">
                    {watching}
                  </span>
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
