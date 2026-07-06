import Link from "next/link";

const LINKS = [
  { href: "/product", label: "Over SuperScout" },
  { href: "/privacy", label: "Privacy" },
  { href: "/voorwaarden", label: "Voorwaarden" },
  { href: "/ethiek", label: "Ethiek" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 pt-8 pb-28 sm:flex-row sm:items-center sm:justify-between md:pb-8">
        <nav aria-label="Over deze site" className="flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-xs font-bold text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="font-mono text-xs text-ink-soft">
          Gemaakt door{" "}
          <a
            href="https://stijnvandepol.nl"
            target="_blank"
            rel="noopener me"
            className="font-bold text-ink underline underline-offset-2 hover:text-deal"
          >
            Stijn van de Pol
          </a>
        </p>
      </div>
    </footer>
  );
}
