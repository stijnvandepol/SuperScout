import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Product, SupermarketSlug } from "@superscout/core";
import { isCanonicalSlug, priceKey, productPath } from "@superscout/core";
import { getProduct, neighbours } from "@/lib/catalogue";
import { getOffers } from "@/lib/offers";
import { insightFor } from "@/lib/price-history";
import { formatEuro, offerSlug, STORE_META } from "@/lib/format";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";

/**
 * The permanent page for one product at one chain.
 *
 * This is the page the whole catalogue crawl exists for. An offer page could
 * only ever describe a promotion, so it expired weekly and never accumulated
 * ranking; this one exists whether or not the product is discounted, which is
 * what lets a page earn its position over months instead of days. It also
 * answers a question the promotion feed cannot: "wat kost dit bij AH".
 */

export const revalidate = 3600;

// 42.000 products are never pre-rendered — ISR builds each on first request and
// caches it. Pre-rendering them would make the image and the build unusable.
export const dynamicParams = true;

type Params = { params: Promise<{ chain: string; id: string; slug: string }> };

function resolve(chain: string, id: string): Product | undefined {
  if (!(chain in STORE_META)) return undefined;
  return getProduct(chain as SupermarketSlug, id);
}

/** The promotion running for this product right now, if any. */
function liveOffer(product: Product) {
  const key = priceKey({
    source: product.source,
    title: product.title,
  } as never);
  if (!key) return undefined;

  return getOffers().find((offer) => priceKey(offer) === key);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { chain, id } = await params;
  const product = resolve(chain, id);
  if (!product) return { title: "Product niet gevonden — SuperScout" };

  const store = STORE_META[product.source].name;
  const price = product.priceCents !== null ? formatEuro(product.priceCents) : null;

  const title = price
    ? `${product.title} — ${price} bij ${store}`
    : `${product.title} bij ${store}`;

  const unit = product.salesUnitSize ? ` (${product.salesUnitSize})` : "";
  const perUnit =
    product.unitPriceCents !== null && product.unitPriceCents !== undefined && product.unitPriceLabel
      ? ` Dat is ${formatEuro(product.unitPriceCents)} per ${product.unitPriceLabel.toLowerCase()}.`
      : "";

  const description = price
    ? `${product.title}${unit} kost ${price} bij ${store}.${perUnit} Bekijk de actuele prijs en of het deze week in de aanbieding is.`
    : `${product.title}${unit} bij ${store}. Bekijk de actuele prijs en of het deze week in de aanbieding is.`;

  return {
    title,
    description,
    alternates: { canonical: productPath(product) },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "nl_NL",
      url: productPath(product),
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { chain, id, slug } = await params;

  const product = resolve(chain, id);
  if (!product) notFound();

  // The id resolved the page, so a stale slug is not an error — but one product
  // should have one address, so the old spelling redirects to the current one.
  if (!isCanonicalSlug(product, slug)) permanentRedirect(productPath(product));

  const store = STORE_META[product.source];
  const offer = liveOffer(product);
  const insight = insightFor({ source: product.source, title: product.title } as never);
  const rail = neighbours(product);
  const canonical = productPath(product);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <JsonLd data={productJsonLd(product, `${SITE_URL}${canonical}`)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: store.name, path: `/winkel/${product.source}` },
          { name: product.title, path: canonical },
        ])}
      />

      <p className="pt-6 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
        <Link href={`/winkel/${product.source}`} className="hover:text-ink">
          {store.name}
        </Link>
        {product.categoryPath ? ` · ${product.categoryPath}` : ""}
      </p>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface-2">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain p-8 mix-blend-multiply"
            />
          ) : (
            <span className="font-display text-7xl text-ink-soft/30">€</span>
          )}
        </div>

        <div className="flex flex-col">
          {product.brand ? (
            <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
              {product.brand}
            </span>
          ) : null}
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {product.title}
          </h1>

          <div className="mt-6 flex items-end gap-3">
            {product.priceCents !== null ? (
              <span className="font-display text-5xl font-bold tabular-nums leading-none">
                {formatEuro(product.priceCents)}
              </span>
            ) : (
              <span className="font-display text-2xl font-bold leading-none text-ink-soft">
                Prijs niet opgegeven
              </span>
            )}
            {product.priceBeforeBonusCents != null ? (
              <span className="font-mono text-lg text-ink-soft line-through">
                {formatEuro(product.priceBeforeBonusCents)}
              </span>
            ) : null}
          </div>

          {product.unitPriceCents != null && product.unitPriceLabel ? (
            <p className="mt-2 font-mono text-sm text-ink-soft">
              {formatEuro(product.unitPriceCents)} per {product.unitPriceLabel.toLowerCase()}
            </p>
          ) : null}

          {offer ? (
            <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-fresh">
                Deze week in de aanbieding
              </p>
              <p className="mt-2 text-[15px] leading-relaxed">
                <Link
                  href={`/aanbieding/${offerSlug(offer)}`}
                  className="font-medium underline decoration-deal decoration-2 underline-offset-2"
                >
                  Bekijk de actie bij {store.name}
                </Link>
              </p>
            </div>
          ) : null}

          <dl className="mt-8 space-y-3 border-t border-line pt-6 text-sm">
            {product.salesUnitSize ? (
              <Row label="Verpakking" value={product.salesUnitSize} />
            ) : null}
            <Row label="Winkel" value={store.name} />
            {product.categoryPath ? <Row label="Categorie" value={product.categoryPath} /> : null}
          </dl>

          {product.url ? (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="mt-8 w-fit rounded-full px-6 py-3 text-center font-display text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
              style={{ background: store.bg, color: store.fg }}
            >
              Bekijk bij {store.name} →
            </a>
          ) : null}

          {insight ? (
            <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                Prijsontwikkeling
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                In de afgelopen periode zagen we dit {insight.promotions}× in de aanbieding, tussen{" "}
                {formatEuro(insight.lowestCents)} en {formatEuro(insight.highestCents)}.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <ProductProse product={product} store={store.name} offer={Boolean(offer)} />

      {rail.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-display text-xl font-bold tracking-tight">
            Meer uit dit schap bij {store.name}
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {rail.map((other) => (
              <Link
                key={other.id}
                href={productPath(other)}
                className="rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
              >
                <h3 className="font-display text-sm font-medium leading-snug line-clamp-2">
                  {other.title}
                </h3>
                {other.priceCents !== null ? (
                  <p className="mt-2 font-display text-lg font-bold tabular-nums">
                    {formatEuro(other.priceCents)}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-mono text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

/**
 * Prose composed from this product's own numbers.
 *
 * 42.000 pages differing only in a title and a price read as thin content, and
 * a section that large being judged thin drags the whole site. Every sentence
 * here is built from data this product actually has, so no two pages produce
 * the same paragraph.
 */
function ProductProse({
  product,
  store,
  offer,
}: {
  product: Product;
  store: string;
  offer: boolean;
}) {
  const price = product.priceCents !== null ? formatEuro(product.priceCents) : null;
  const perUnit =
    product.unitPriceCents != null && product.unitPriceLabel
      ? `${formatEuro(product.unitPriceCents)} per ${product.unitPriceLabel.toLowerCase()}`
      : null;

  return (
    <section className="mt-14 border-t border-line pt-10">
      <h2 className="font-display text-xl font-bold tracking-tight">
        Wat kost {product.title} bij {store}?
      </h2>
      <div className="mt-4 max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-soft">
        <p>
          {price ? (
            <>
              <strong className="font-semibold text-ink">{product.title}</strong> kost op dit moment{" "}
              {price} bij {store}
              {product.salesUnitSize ? ` voor ${product.salesUnitSize.toLowerCase()}` : ""}.
              {perUnit ? ` Omgerekend is dat ${perUnit}.` : ""}
            </>
          ) : (
            <>
              <strong className="font-semibold text-ink">{product.title}</strong> staat in het
              assortiment van {store}, maar er is geen vaste prijs gepubliceerd — die verschilt per
              winkel of per gewicht.
            </>
          )}
        </p>
        <p>
          {offer
            ? `Dit product staat deze week in de aanbieding. SuperScout haalt de prijzen dagelijks rechtstreeks bij ${store} op, dus wat hierboven staat is wat de keten vandaag vraagt.`
            : `Dit product staat op dit moment niet in de aanbieding. SuperScout haalt de prijzen dagelijks rechtstreeks bij ${store} op en bewaart wat een product eerder in de actie kostte, zodat je bij een volgende korting kunt zien of die echt scherp is.`}{" "}
          Controleer de definitieve prijs altijd in de winkel of de app van {store}; SuperScout
          verkoopt zelf niets.
        </p>
      </div>
    </section>
  );
}

/** schema.org Product for a catalogue page — the shelf price, not a promotion. */
function productJsonLd(product: Product, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.imageUrl ? { image: [product.imageUrl] } : {}),
    ...(product.categoryPath ? { category: product.categoryPath } : {}),
    sku: product.id,
    ...(product.priceCents !== null
      ? {
          offers: {
            "@type": "Offer",
            url,
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            price: (product.priceCents / 100).toFixed(2),
            priceCurrency: "EUR",
            seller: {
              "@type": "Organization",
              name: STORE_META[product.source].name,
              url: STORE_META[product.source].offersUrl,
            },
          },
        }
      : {}),
  };
}
