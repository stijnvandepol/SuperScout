# Een supermarkt toevoegen

Alles van één keten staat in één map: `retailers/<slug>/`. Code, tests en fixtures. Buiten die map is er precies één regel nodig, in `retailers/index.ts`.

```
retailers/jumbo/
  index.ts                  de module: welke URL's, http of browser, hoe de adapter wordt gebouwd
  jumbo.adapter.ts          ophalen (via de beleefde fetch of de browser)
  jumbo.raw.ts              de vorm van wat de keten teruggeeft
  jumbo.normalize.ts        ruw → Offer (pure functie)
  jumbo.mechanism.ts        actielabel → mechanisme (als de keten een eigen stijl heeft)
  jumbo.adapter.test.ts     tests op opgeslagen fixtures, nooit live
  fixtures/                 echte, opgeslagen responses of pagina's
```

## Stappen

**1. Staat de keten in het register?** `packages/core/src/retailer.ts`: naam, sector, kleuren, aanbiedingen-URL. Zet `ingested: true` pas als de module werkt.

**2. Kijk eerst wat de site zelf laadt.** Op de server:

```sh
docker exec superscout-ingestion node packages/ingestion/dist/capture.cjs <slug> [url]
```

Of zonder serverlogin: start de workflow **Capture** in GitHub Actions met de slug(s); die draait hetzelfde commando op de server en zet een samenvatting in de log (`scripts/capture-report.mjs`). Het commando controleert robots.txt, opent de pagina als `SuperScoutBot` en schrijft naar `/data/captures/<slug>/<tijd>/`: de gerenderde `page.html`, élke JSON-response die de pagina laadt, en een `index.json` die aanwijst welke response op een lijst aanbiedingen lijkt. Weigert de site of verbiedt robots.txt het, dan stopt het — en dan bouwen we die module niet.

**3. Kies de bron, in deze volgorde:**

1. **Een JSON-endpoint dat de site zelf gebruikt** (Dirk, Jumbo). Robuust; HTML-wijzigingen raken het niet.
2. **JSON die in de pagina zit** (`__NUXT_DATA__`, `__NEXT_DATA__`, `application/ld+json`, een blob met `objectID`s). Zelfde voordeel, wel via de browser.
3. **Een JSON-response afvangen tijdens het laden** (PLUS). Herken hem op *vorm*, niet op de naam van de endpoint — zie `plus/index.ts`.
4. **De DOM**, alleen als het niet anders kan. Kies selectors op betekenis (`[data-product-id]`, een link naar `/p/`) boven gegenereerde class-namen.

**4. Schrijf `<slug>.normalize.ts` als pure functie** en test hem op de fixture uit stap 2. Kopieer de fixture naar `retailers/<slug>/fixtures/`. Geen live requests in tests.

**5. Schrijf `index.ts`:**

```ts
import { defineRetailer } from "../module";
import { VoorbeeldAdapter, VOORBEELD_OFFERS_URL } from "./voorbeeld.adapter";

export default defineRetailer({
  source: "voorbeeld",
  urls: [VOORBEELD_OFFERS_URL],      // álle URL's die de module opvraagt
  needs: "http",                      // of "browser"
  create: () => new VoorbeeldAdapter(),
});
```

**6. Registreer hem** in `retailers/index.ts`. De tests controleren dat elke map geregistreerd is en dat elke URL-constante in de map ook in `urls` staat, zodat de robots.txt-controle niets mist.

## Wat je níet zelf hoeft te doen

- **User-Agent en tempo.** Gebruik `polite` uit `http/polite.ts` (of de browserhelpers in `browser/intercept.ts`). Die zetten `SuperScoutBot/1.0 (+https://superscout.nl/ethiek)` en houden minstens 3 seconden tussen verzoeken per site.
- **robots.txt.** De poort (`gate.ts`) controleert de `urls` van je module vóór elke run.
- **Weigeringen.** Een 401/403/429 of captcha stopt die keten voor de run en zeven dagen daarna. Nooit omzeilen: geen andere User-Agent, geen stealth-plugins, geen proxy's.
- **Een slechte dag.** Levert de keten ineens niets of minder dan de helft van normaal, dan houdt de worker de vorige, nog lopende aanbiedingen vast, bewaart de pagina in `/data/snapshots/` en meldt het op `/beheer` en `/status`.

## Stand per keten (capture van 28–29 september 2026)

| Keten | Bron | Opmerking |
|---|---|---|
| Dirk, Jumbo | eigen JSON-API | |
| Ekoplaza | eigen zoek-API (`acties=true`) | |
| PLUS | JSON die de pagina laadt, herkend op vorm | Coop stuurt door naar PLUS |
| Aldi, DekaMarkt, Poiesz, Lidl, Sligro | pagina in de browser | geen JSON-bron gevonden |
| Hoogvliet | `/aanbiedingen` in de browser | alleen de ~20 uitgelichte tegels; de volledige lijst staat op een pad dat robots.txt verbiedt |
| AH, Jan Linders | — | weigeren SuperScoutBot (403) |
| Dagwinkel | — | robots.txt onbereikbaar |
| Vomar, Spar | — | alleen een bladerfolder, geen prijzen als data |
| Boni, Nettorama, MCD, Boon's Markt | — | geen aanbiedingen op de site gevonden |

Voor de ketens zonder bron is een feed (`docs/FEEDS.md`) of toestemming de nette weg.
