import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Offer } from "@superscout/core";
import {
  CATEGORY_LABEL,
  categorizeOffer,
  daysUntilExpiry,
  isExpiringSoon,
  relatedOffers,
} from "@superscout/core";
import { getBySlug, getOffers } from "@/lib/offers";

export const revalidate = 1800;
import {
  formatEuro,
  isExVat,
  mechanismDescription,
  offerSlug,
  STORE_META,
  validUntilShort,
} from "@/lib/format";
import { OfferCard } from "@/components/OfferCard";
import { StoreBadge } from "@/components/StoreBadge";
import { DiscountSticker } from "@/components/DiscountSticker";
import { AddToBasketButton } from "@/components/AddToBasketButton";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, offerJsonLd, SITE_URL } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getOffers().map((offer) => ({ slug: offerSlug(offer) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const offer = getBySlug(slug);
  if (!offer) return { title: "Aanbieding niet gevonden — SuperScout" };

  const store = STORE_META[offer.source].name;
  const price =
    offer.pricing.currentPriceCents !== null
      ? ` — ${formatEuro(offer.pricing.currentPriceCents)}`
      : "";
  const title = `${offer.title}${price} bij ${store} — SuperScout`;
  const description = `${offer.title} in de aanbieding bij ${store}. ${mechanismDescription(offer)} Geldig ${validUntilShort(offer.validUntil)}.`;

  return {
    title,
    description,
    alternates: { canonical: `/aanbieding/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "nl_NL",
      url: `/aanbieding/${slug}`,
      images: offer.imageUrl ? [offer.imageUrl] : [],
    },
  };
}

export default async function OfferPage({ params }: Params) {
  const { slug } = await params;
  const offer = getBySlug(slug);
  if (!offer) notFound();

  const nowIso = new Date().toISOString();
  const store = STORE_META[offer.source];
  const { sameBrand, alternatives, related } = relatedOffers(offer, getOffers());
  const soon = isExpiringSoon(offer.validUntil, nowIso);
  const days = daysUntilExpiry(offer.validUntil, nowIso);
  const { pricing } = offer;

  const canonical = `/aanbieding/${offerSlug(offer)}`;
  const url = `${SITE_URL}${canonical}`;
  const category = categorizeOffer(offer);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <JsonLd data={offerJsonLd(offer, url)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: store.name, path: `/winkel/${offer.source}` },
          { name: CATEGORY_LABEL[category], path: `/categorie/${category}` },
          { name: offer.title, path: canonical },
        ])}
      />

      <p className="pt-6 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
        <Link href={`/winkel/${offer.source}`} className="hover:text-ink">
          {store.name}
        </Link>
        {" · "}
        <Link href={`/categorie/${categorizeOffer(offer)}`} className="hover:text-ink">
          {CATEGORY_LABEL[categorizeOffer(offer)]}
        </Link>
      </p>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        {/* Image */}
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface-2">
          {offer.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.imageUrl}
              alt={offer.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain p-8 mix-blend-multiply"
            />
          ) : (
            <span className="font-display text-7xl text-ink-soft/30">€</span>
          )}
          <div className="absolute left-4 top-4">
            <StoreBadge source={offer.source} />
          </div>
          <div className="absolute right-4 top-4 scale-125">
            <DiscountSticker label={mechanismDescription(offer).includes("gratis") ? "GRATIS" : "DEAL"} />
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          {offer.brand ? (
            <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
              {offer.brand}
            </span>
          ) : null}
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {offer.title}
          </h1>

          <div className="mt-6 flex items-end gap-3">
            {pricing.currentPriceCents !== null ? (
              <span className="font-display text-5xl font-bold tabular-nums leading-none">
                {formatEuro(pricing.currentPriceCents)}
              </span>
            ) : (
              <span className="font-display text-3xl font-bold leading-none">
                {offer.rawLabel ?? "Actieprijs in de winkel"}
              </span>
            )}
            {pricing.originalPriceCents !== null ? (
              <span className="font-mono text-lg text-ink-soft line-through">
                {formatEuro(pricing.originalPriceCents)}
              </span>
            ) : null}
          </div>

          {pricing.savingsAbsoluteCents !== null ? (
            <span className="mt-3 w-fit rounded-md bg-fresh/10 px-2 py-1 font-mono text-xs font-bold text-fresh">
              je bespaart {formatEuro(pricing.savingsAbsoluteCents)}
              {pricing.savingsPercent !== null ? ` (${pricing.savingsPercent}%)` : ""}
            </span>
          ) : null}

          {isExVat(offer.source) ? (
            <p className="mt-3 w-fit rounded-md bg-ink/[0.06] px-2 py-1 font-mono text-xs font-bold text-ink-soft">
              Prijs is exclusief btw · groothandel
            </p>
          ) : null}

          <dl className="mt-8 space-y-3 border-t border-line pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-mono text-xs uppercase tracking-wide text-ink-soft">Actie</dt>
              <dd className="text-right">{mechanismDescription(offer)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-mono text-xs uppercase tracking-wide text-ink-soft">Geldig</dt>
              <dd className={`text-right font-mono ${soon ? "font-bold text-urgent" : ""}`}>
                {soon ? (days <= 1 ? "verloopt vandaag" : `nog ${days} dagen`) : validUntilShort(offer.validUntil)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-mono text-xs uppercase tracking-wide text-ink-soft">Winkel</dt>
              <dd className="text-right">
                <Link href={`/winkel/${offer.source}`} className="underline-offset-2 hover:underline">
                  {store.name}
                </Link>
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {offer.url ? (
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="rounded-full px-6 py-3 text-center font-display text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
                style={{ background: store.bg, color: store.fg }}
              >
                Bekijk bij {store.name} →
              </a>
            ) : null}
            <AddToBasketButton id={offer.id} />
          </div>

          <p className="mt-6 font-mono text-[11px] text-ink-soft">
            Prijsontwikkeling — binnenkort beschikbaar.
          </p>
        </div>
      </div>

      <RelatedSection title="Alternatieven bij andere winkels" offers={alternatives} nowIso={nowIso} />
      {offer.brand ? (
        <RelatedSection title={`Meer van ${offer.brand}`} offers={sameBrand} nowIso={nowIso} />
      ) : null}
      <RelatedSection title="Gerelateerde aanbiedingen" offers={related} nowIso={nowIso} />
    </div>
  );
}

function RelatedSection({
  title,
  offers,
  nowIso,
}: {
  title: string;
  offers: Offer[];
  nowIso: string;
}) {
  if (offers.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {offers.slice(0, 8).map((o) => (
          <OfferCard key={o.id} offer={o} nowIso={nowIso} />
        ))}
      </div>
    </section>
  );
}
