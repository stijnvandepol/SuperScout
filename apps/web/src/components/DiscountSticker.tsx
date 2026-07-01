export function DiscountSticker({ label, urgent = false }: { label: string; urgent?: boolean }) {
  return (
    <span
      className={`inline-block -rotate-3 rounded-lg px-2.5 py-1 font-display text-sm font-bold leading-none shadow-[0_3px_12px_rgba(0,0,0,0.18)] ${
        urgent ? "bg-urgent text-white" : "bg-deal text-deal-ink"
      }`}
    >
      {label}
    </span>
  );
}
