"use client";

import { useEffect, useState } from "react";
import { isInBasket, onBasketChange, toggleBasket } from "@/lib/basket";

export function AddToBasketButton({ id, variant = "full" }: { id: string; variant?: "full" | "mini" }) {
  const [inBasket, setInBasket] = useState(false);

  useEffect(() => {
    const read = () => setInBasket(isInBasket(id));
    read();
    return onBasketChange(read);
  }, [id]);

  if (variant === "mini") {
    return (
      <button
        type="button"
        onClick={() => toggleBasket(id)}
        aria-pressed={inBasket}
        aria-label={inBasket ? "Uit mandje" : "In mandje"}
        className={`rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh ${
          inBasket ? "border-fresh bg-fresh/10 text-fresh" : "border-line text-ink-soft hover:text-ink"
        }`}
      >
        {inBasket ? "✓ mandje" : "+ mandje"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleBasket(id)}
      aria-pressed={inBasket}
      className={`rounded-full border px-6 py-3 font-display text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh ${
        inBasket ? "border-fresh bg-fresh text-white" : "border-line hover:border-ink"
      }`}
    >
      {inBasket ? "✓ In je mandje" : "+ In mandje"}
    </button>
  );
}
