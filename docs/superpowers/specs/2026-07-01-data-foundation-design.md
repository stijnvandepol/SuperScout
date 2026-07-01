# SuperScout — Datafundament (Subproject 1) — Ontwerp

**Datum:** 2026-07-01
**Status:** Goedgekeurd (datamodel + taxonomie), implementatie gestart
**Scope:** Het datafundament — genormaliseerd `Offer`-model, bron-agnostische ingestielaag, eerste adapter (Dirk). Frontend/accounts/admin volgen als aparte subprojecten.

## 1. Context & doel

SuperScout aggregeert aanbiedingen van Nederlandse supermarkten in één snelle, mobile-first PWA. Dit subproject bouwt de **backbone**: hoe aanbiedingen binnenkomen en genormaliseerd worden opgeslagen. Alle latere features (zoeken, filters, pagina's) hangen hieraan.

## 2. Databron-strategie

Geen enkele NL-keten heeft een officiële publieke API. Beslissing (2026-07-01): **DIY** — eigen connectors op basis van reverse-engineerde endpoints, achter een bron-agnostische adapter. Zie [[superscout-offer-endpoints]] voor de concrete endpoints (uit eigen MITM-capture).

Twee soorten `SourceAdapter` achter één interface:

- **Directe adapters** (diepte, hoge kwaliteit): Dirk, Jumbo, AH, Plus. Elk kent zijn eigen rauwe API-vorm.
- **Folder-aggregator-adapter** (breedte, later): folderz-stijl scraping voor de lange staart (Lidl, Aldi, Coop, Vomar, Hoogvliet, Spar, …).

Beide produceren genormaliseerde `Offer`s. Zo: dag-1 dekking van 4 ketens diep + pad naar 15+ breed, zonder kernwijziging.

**Niet-functionele eisen aan de adapter-laag:** caching (nooit live per-request naar de bron), rate-limiting per bron, circuit-breaker (één kapotte keten sleept de rest niet mee), en per-keten individueel repareerbaar (endpoints kunnen breken).

**Juridisch/privacy:** offerdata is niet-persoonlijk (AVG niet bindend). Live constraints: ToS/contract (Ryanair-precedent) + databankenrecht. Ongeautoriseerde API's → respecteer caching/rate-limits. Rauwe MITM-captures bevatten PII en worden **nooit** gecommit.

## 3. Techniek

- **Taal:** TypeScript (strict), gedeeld tussen ingestie en latere Next.js-frontend.
- **Structuur:** pnpm-monorepo.
  - `packages/core` — domein (geen deps): `Offer`, `DiscountMechanism`, `SupermarketSlug`, `SourceAdapter`.
  - `packages/ingestion` — adapters + normalisatie. Eerste: `adapters/dirk`.
  - `apps/web` — Next.js (later subproject).
- **Geld:** intern als **integer centen** (geen floats — afrondingsveiligheid).

## 4. Het `Offer`-model

Genormaliseerd, afgeleid uit de echte schema's van Dirk/Jumbo/AH/Plus. Kernvelden: `id` (`${source}:${sourceOfferId}`), `source`, `title`, `description`, `brand`, `category` (onze taxonomie) + `sourceCategoryRaw`, `imageUrl`, `pricing` (currentPrice/originalPrice/savingsAbsolute/savingsPercent — alle in centen), `mechanism`, `rawLabel`, `validFrom`/`validUntil`/`isNextWeek`, `flags` (isOrganic/isPrivateLabel/isAgeRestricted), `url`, `productEans`, `fetchedAt`.

Ontwerpprincipe: **`rawLabel` blijft altijd bewaard** naast de gestructureerde `mechanism` → een onbekende keten-variant valt terug op `mechanism.type==='unknown'` zonder de aanbieding te verliezen (graceful degradation).

## 5. Kortings-taxonomie (`DiscountMechanism`)

Discriminated union — type-veilig en filterbaar:

- `price_drop` — nieuw < oud (Dirk)
- `multi_buy { buyQuantity, totalPriceCents }` — "2 voor 3,99"
- `buy_x_get_y_free { buyQuantity, freeQuantity }` — 1+1, 2+1, 1+2
- `nth_discounted { nth, percent }` — "2e halve prijs" → nth:2, percent:50
- `percentage_off { percent }` — "25% korting"
- `amount_off { amountCents }`
- `cashback { amountCents }`
- `free_delivery { minSpendCents }`
- `unknown` — fallback (rawLabel blijft)

Filter "alleen 1+1" = `type==='buy_x_get_y_free' && buyQuantity===1 && freeQuantity===1`.

## 6. `SourceAdapter`-interface

Elke bron implementeert: fetch rauwe data → normaliseer naar `Offer[]`. Interface (indicatief):

```ts
interface SourceAdapter {
  readonly source: SupermarketSlug;
  fetchOffers(): Promise<Offer[]>;   // haalt + normaliseert
}
```

Normalisatie is per adapter gesplitst in `*.raw.ts` (rauwe responsetypes) en `*.normalize.ts` (raw → Offer), zodat rauwe rariteiten (Dirk's `"ACTIE_\n "`, Plus' `DisplayInfo_Label`) nooit voorbij de adaptergrens lekken.

## 7. Eerste slice: Dirk

`GET https://www.dirk.nl/api/offers/current/{1..18}` (geen auth). Vertical slice: fetch → normaliseer → `Offer[]`, met tests tegen een echte fixture uit de capture. Valideert het model tegen de realiteit voordat we op papier verder ontwerpen.

De label→mechanism-parser wordt (learning mode) door de gebruiker ingevuld, afgedekt door tests.

## 8. Vervolg (roadmap-haakjes)

Na Dirk: Jumbo (nuTab GraphQL) → AH (bonusPromotions, anoniem token) → Plus (OutSystems) → folder-aggregator-adapter → persistente store (DB-ontwerp) → frontend-subproject.
