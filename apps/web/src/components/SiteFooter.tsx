import Link from "next/link";
import { categoriesPresent, getOffers } from "@/lib/offers";
import { STORE_META } from "@/lib/format";
import { DEAL_TYPES } from "@/lib/deal-types";

const ABOUT_LINKS = [
  { href: "/product", label: "Over SuperScout" },
  { href: "/privacy", label: "Privacy" },
  { href: "/voorwaarden", label: "Voorwaarden" },
  { href: "/ethiek", label: "Ethiek" },
] as const;

/**
 * Sitewide footer hub.
 *
 * Beyond navigation this is the site's main internal-linking surface: it puts
 * every store, the top categories and every deal-type page one click from any
 * page on the site. Without it those hubs sit two or three clicks deep behind
 * an index page, which is where crawlers start ignoring them.
 */
export function SiteFooter() {
  const offers = getOffers();
  const stores = [...new Set(offers.map((o) => o.source))].sort((a, b) =>
    STORE_META[a].name.localeCompare(STORE_META[b].name, "nl"),
  );
  const categories = categoriesPresent().slice(0, 8);
  const dealTypes = DEAL_TYPES.filter((type) => offers.some(type.matches));

  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 pt-12 pb-28 md:pb-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <FooterColumn title="Supermarkten" href="/winkels">
            {stores.map((slug) => (
              <FooterLink key={slug} href={`/winkel/${slug}`}>
                {STORE_META[slug].name} aanbiedingen
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Categorieën" href="/categorieen">
            {categories.map((c) => (
              <FooterLink key={c.slug} href={`/categorie/${c.slug}`}>
                {c.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Actievormen" href="/acties">
            {dealTypes.map((type) => (
              <FooterLink key={type.slug} href={`/acties/${type.slug}`}>
                {type.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Over">
            {ABOUT_LINKS.map((l) => (
              <FooterLink key={l.href} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-ink-soft">
            SuperScout vergelijkt de weekaanbiedingen van Nederlandse supermarkten en is niet
            verbonden aan een van de ketens. Prijzen zijn indicatief; de winkel bepaalt de
            definitieve prijs.
          </p>
          <p className="shrink-0 font-mono text-xs text-ink-soft">
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
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={title}>
      <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-soft">
        {href ? (
          <Link href={href} className="transition-colors hover:text-ink">
            {title}
          </Link>
        ) : (
          title
        )}
      </h2>
      <ul className="mt-3 space-y-2">{children}</ul>
    </nav>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-ink-soft transition-colors hover:text-ink">
        {children}
      </Link>
    </li>
  );
}
