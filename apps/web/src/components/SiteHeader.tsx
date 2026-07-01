import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          Super<span className="text-deal">Scout</span>
        </Link>
        <nav className="hidden items-center gap-6 font-mono text-xs uppercase tracking-widest text-ink-soft md:flex">
          <Link href="/categorieen" className="transition-colors hover:text-ink">
            Categorieën
          </Link>
          <Link href="/winkels" className="transition-colors hover:text-ink">
            Winkels
          </Link>
          <Link href="/mandje" className="transition-colors hover:text-ink">
            Mandje
          </Link>
        </nav>
      </div>
    </header>
  );
}
