# SuperScout — verbeterplan

_September 2026. Geschreven na een analyse van de volledige codebase, niet van een checklist._

Eerst het goede nieuws, want dat verandert wat er moet gebeuren. Technisch staat SuperScout er beter voor dan de meeste sites die "slecht vindbaar" zijn. Product-structured data, canonicals, een sitemap met eerlijke `lastmod`, redirects voor verlopen acties, noindex op dunne categorieën, FAQ-markup die uit live data komt. Iemand heeft hier nagedacht.

Het probleem zit dus niet in het fundament. Ik denk dat het drie dingen zijn:

1. **Er is geen reden om terug te komen.** Je vindt een deal, je gaat weg. Het mandje is het enige wat blijft, en dat is voor één boodschappenronde.
2. **Het datamodel was hard "supermarkt".** Een nieuwe winkel raakte vier bestanden, en voor Kruidvat, HEMA of Action was er geen databron die géén scraper is.
3. **Blind vliegen.** Geen analytics (bewust), dus niemand weet welke zoekopdrachten niets opleveren. Juist dát is de lijst van wat je moet bouwen.

---

## 1. De belangrijkste problemen, op volgorde van schade

| # | Probleem | Waarom het pijn doet |
|---|---|---|
| 1 | Geen terugkeermechanisme | SEO-bezoekers komen één keer. Zonder volgfunctie of alert is elke bezoeker nieuw. |
| 2 | "Geldig ." in de meta description | Bij bijna de helft van de aanbiedingen (ketens zonder einddatum) stond een halve zin in de Google-snippet. Slordig, en snippets zijn je etalage. |
| 3 | Geen pagina voor de hoofdzoekterm | "beste aanbiedingen deze week" had geen landingspagina, terwijl de selectielogica (`weeklyPicks`) al maanden bestond — alleen voor de maandag-issue. |
| 4 | Winkels waren vier bestanden | `supermarket.ts`, `STORE_META`, `STORE_ICON`, plus adapter. Dat schaalt niet naar 25 winkels. |
| 5 | Geen legale route voor niet-supermarkten | De enige ingang was een adapter die de site van de keten leest. Voor drogisterijen en warenhuizen is dat juridisch en technisch de slechtste optie. |
| 6 | Bezoekers konden fouten nergens melden | Behalve via een persoonlijke website. Foute prijzen bleven staan tot de volgende ingest. |
| 7 | `rel="sponsored"` op niet-betaalde links | Klein, maar het botst met "we verdienen er niets aan". |
| 8 | Homepage noemde ketens hard | "Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk en meer" — precies de fout die elders in de code al was opgelost. |
| 9 | Filters niet in de URL | Een gefilterde weergave kon je niet delen of bookmarken; terugknop verloor je zoekopdracht. |
| 10 | Geen security-headers | Geen `nosniff`, geen frame-bescherming, en `X-Powered-By: Next.js` wees scanners de weg. |

Nog open, bewust niet in deze ronde:
- De categoriepagina zegt op een paar plekken nog letterlijk "supermarkten". Klopt nu, maar niet meer zodra de eerste drogisterij live is: doe een copy-ronde tegelijk met de eerste feed.
- `/categorie/drogisterij` is één bak. Met Kruidvat erbij moet die splitsen (haar, mond, gezondheid & vitamines, make-up, parfum). Nu nog niet: dat zou een goede pagina in vijf dunne veranderen.

---

## 2. Wat er in deze ronde is gebouwd

| Wijziging | Waar | Verwachte impact |
|---|---|---|
| **Eén winkelregister** met sector, kleuren, link, icoon. Kruidvat, Etos, Trekpleister, DA, Action, HEMA, Blokker, Zeeman, GAMMA, KARWEI, Praxis, HORNBACH staan erin, als "niet ingelezen". Ze worden pas zichtbaar als er data is. | `packages/core/src/retailer.ts` | Nieuwe winkel = één regel. Oude namen (`SUPERMARKETS`, `STORE_META`) blijven als alias werken. |
| **Feed-adapter**: JSON-bestanden in `/data/feeds` voor partnerfeeds, affiliatefeeds en handmatige invoer. Strenge validatie: licentie verplicht, max. 14 dagen oud, einddatum verplicht (max. 62 dagen), nep-"was"-prijzen eruit, kortingen >90% geweigerd, links alleen naar het domein van de winkel, dubbele producten samengevoegd. | `packages/ingestion/src/adapters/feed/`, `docs/FEEDS.md` | Kruidvat en co. toevoegen zonder code, zonder scraper, en zonder misleidende prijzen. |
| **Bron per aanbieding** (`provenance`) en een "Bron"-regel op elke aanbiedingspagina: website van de winkel / aangeleverd / partnerfeed / handmatig, plus de datum. Affiliatelinks krijgen `rel="sponsored"` en een zichtbare melding; de rest niet meer. | `Offer.provenance`, aanbiedingspagina | Transparantie over waar een prijs vandaan komt. Eerlijke links. |
| **Afdelingen** boven de categorieën, en twee nieuwe categorieën: *Koken & tafelen* en *Klussen & tuin*. `/categorieen` groepeert per afdeling, `/winkels` per sector (zodra er meer dan één is). | `core/src/category.ts` | Klaar voor drogisterijen, warenhuizen en bouwmarkten zonder dat alles in "non-food" belandt. |
| **Volglijst**: volg een zoekterm ("luiers", "Robijn"). Bij je volgende bezoek toont de homepage een banner met wat er nieuw is; `/volglijst` toont alles. Zonder account, in localStorage. Plus een RSS-feed per zoekterm (`/feed.xml?q=…`) voor wie een echte melding wil. | `lib/watchlist.ts`, `/volglijst`, `/api/zoek` | Het terugkeermechanisme dat ontbrak, zonder de privacybelofte te breken. |
| **`/beste-aanbiedingen`**: top 10 van de week, beste deal per winkel, scherp onder €5, beste per categorie, en uitleg hoe er gekozen wordt. In sitemap, header en footer. | nieuwe pagina | Richt zich op de hoofdzoekterm, en is meteen het formaat dat gedeeld wordt. |
| **Delen** op elke aanbieding (deelmenu van de telefoon, WhatsApp, kopiëren). | `ShareOfferButton` | Virale lus per deal, niet alleen per mandje. |
| **Fout melden** op elke aanbieding: vaste redenen, optionele toelichting, geen persoonsgegevens, rate limit, alleen vanaf de eigen site. | `/api/melding`, `lib/reports.ts` | Datakwaliteit via de mensen die in de winkel staan. |
| **Blokkeerlijst**: offer-id's in `/data/verborgen.json` zijn binnen vijf minuten van de site, ook via hun oude URL. | `lib/offers.ts` | Moderatie zonder deploy. |
| **`/beheer`** (uit tenzij `ADMIN_TOKEN` gezet): datakwaliteit per winkel (aantallen, versheid, % zonder einddatum/prijs/foto, "overig", verdachte kortingen) en de meldingen. | `/beheer`, `middleware.ts` | Eén plek om te zien of een ingest deugt. |
| **Analytics, uit tenzij aangezet**: cookieloze Plausible-events voor zoekopdrachten (met grof resultaataantal), filters, doorklik naar winkel, volgen, delen, melden. Privacyverklaring past zich automatisch aan. | `lib/analytics.ts`, `layout.tsx`, `/privacy` | Eindelijk weten welke zoektermen niets opleveren. |
| **Filters in de URL** (`/?q=koffie&winkel=ah&categorie=zuivel`), canonical blijft `/`. Zoeken via `useDeferredValue`. Zoeken per woord in plaats van als één reeks ("robijn wasmiddel" vindt nu ook "Robijn Klein & Krachtig wasmiddel"). | `OfferExplorer` | Deelbaar, terugknop werkt, soepeler typen op trage telefoons (INP). |
| **Betere lege staat**: noemt de zoekterm, biedt "volg" aan en "wis filters". | `OfferExplorer` | Een doodlopend pad wordt een reden om terug te komen. |
| **SEO-reparaties**: geen "Geldig ." meer, homepage-intro uit live data, `robots.txt` sluit `/api`, `/volglijst`, `/beheer` uit. | diverse | Schonere snippets, geen crawlbudget op JSON. |
| **Security & a11y**: security-headers, geen `X-Powered-By`, cache voor winkeliconen, skip-link, `aria-current` in de onderbalk, `aria-live` op het aantal resultaten. | `next.config.mjs`, `layout.tsx` | Basishygiëne. |
| **Tests**: register, taxonomie, feed-validatie (inclusief het voorbeeldbestand in de docs), zoeken, meldingen, rate limiter, en scenario's voor volgen, terugkomen en deeplinks. | `*/test/` | 387 tests, alles groen (na ronde 2: 419). |

### Ronde 2 (26 september)

| Wijziging | Waar | Verwachte impact |
|---|---|---|
| **AH-acties zonder mechanisme hersteld.** AH zet de meeste acties onder een generiek "BONUS" en schrijft "2+1 gratis" alleen in de labeltekst. 148 van de 221 AH-aanbiedingen (14% van alles) kwamen daardoor binnen als `unknown`: onzichtbaar op de 1+1-pagina, in de top 10 en bij sorteren op korting. De labelparser zit nu in `core` en draait als vangnet in de ingest-runner (elke adapter) én bij het inlezen op de site (dus ook het archief). Herkent nu ook "3 stuks 29.99". | `core/src/promo-label.ts`, `runner.ts`, `lib/offers.ts` | Honderden acties extra op de actiepagina's en in de toplijsten, zonder nieuwe databron. |
| **Actiepagina's gaven na elke deploy tot 30 minuten een 404.** `acties/[slug]` werd tijdens `docker build` vooraf gerenderd, zonder data, en die 404 werd gecachet. Nu per request, zoals de andere lijstpagina's, en vastgelegd in de render-mode-test. | `acties/[slug]` | Geen 404's meer voor Googlebot na een deploy. |
| **Ketennamen op actiepagina's uit live data.** Ook in de FAQ-structured data. | `lib/deal-types.ts` | Geen claims meer over ketens die er even niet zijn. |
| **Onderwerppagina's** `/aanbiedingen/koffie`, `/wasmiddel`, `/luiers`, `/kattenvoer`, `/bier` … (31 onderwerpen) met vergelijkingstabel per winkel (aantal, grootste korting, laagste actieprijs), handgeschreven bespaartip, FAQ uit de data en een volgknop. Indexeerbaar pas bij ≥ 6 aanbiedingen bij ≥ 2 winkels; anders noindex, niet in de sitemap, niet gelinkt. Overzicht op `/aanbiedingen`. | `lib/topics.ts`, `app/aanbiedingen/` | Richt zich op de zoektermen met het meeste volume in de niche — waar de categorieën te breed voor zijn. Op een testset van 1.071 echte aanbiedingen: 19 van de 31 indexeerbaar. |
| **Interne links naar onderwerpen**: "Populair" op homepage en categoriepagina's, kolom in de footer, en op elke aanbieding "Vergelijk alle 18 koffie-aanbiedingen". | `TopicLinks`, aanbiedingspagina | Linkwaarde naar de nieuwe pagina's; de logische vervolgvraag na één aanbieding. |
| **Lijstpagina's renderen 48 kaarten, de rest via "Toon meer"** (`/api/lijst`). Eén definitie van elke lijst (`lib/lists.ts`) voor pagina en API, zodat er niets dubbel of weg valt. | `OfferGrid`, `LoadMoreOffers` | `/acties/1-plus-1-gratis` van 805 KB naar 327 KB HTML en van 146 naar 48 kaarten om te hydrateren. Beter voor LCP/INP op goedkope telefoons. |

### Ronde 3 (26 september)

| Wijziging | Waar | Verwachte impact |
|---|---|---|
| **Gedeelde links toonden "Aanbiedingen van 0 supermarkten".** De OG-afbeelding van de site werd tijdens `docker build` gemaakt, zonder data. Nu per request. | `app/opengraph-image.tsx` | Elke gedeelde SuperScout-link ziet er weer geloofwaardig uit. |
| **Deelkaarten met de deals erop** voor `/beste-aanbiedingen` en elke onderwerppagina: titel, aantal acties en winkels, en de top 3 met korting. | `lib/og.tsx` | Een WhatsApp- of Facebook-preview laat zien wát er te halen is, niet alleen een logo. |
| **Slimmer zoeken.** Accenten maken niet uit ("creme" vindt "crème"). Korte woorden alleen aan het begin van een woord (zoeken op "ijs" gaf elke "2e halve prijs"). De onderwerpen werken als synoniemenlijst: "wasmiddel" vindt ook "Alle Ariel t/m 30 wasbeurten", "wc papier" vindt toiletpapier, "kattenbrokken" vindt Whiskas. | `lib/search.ts`, `lib/topics.ts` | Minder lege zoekresultaten — die zijn nu bijna altijd vraag die we wél konden beantwoorden. |
| **Ingest-status per bron.** Na elke run schrijft de worker per bron: gelukt, aantal, duur, foutmelding — en of de browser voor zeven ketens wel startte. Zichtbaar op `/beheer`. | `cli.ts`, `/beheer` | Een stilgevallen scraper valt binnen een dag op in plaats van na weken. |
| **`/api/health`** voor een uptime-monitor: 200 als de data te vertrouwen is, 503 bij geen aanbiedingen, data ouder dan 36 uur, meer dan de helft van de ketens weg, of een browser die niet start. | `lib/health.ts` | "De server draait" was nooit de vraag; "de prijzen kloppen" wel. |

**Uptime-monitoring instellen (5 minuten):** maak bij UptimeRobot of Better Stack (beide hebben een gratis laag) een HTTP-monitor op `https://superscout.nl/api/health`, interval 5–15 minuten, alarm bij een andere status dan 200. Zet een tweede, simpele monitor op `https://superscout.nl/` voor echte uitval.

### Ronde 4 (26 september) — respect voor de bron, en een snellere homepage

Doel, zoals Stijn het formuleerde: niet geld verdienen, maar *de* plek worden voor aanbiedingen, omdat het aantal aanbiedingen-sites zelf onoverzichtelijk is geworden. Dat vraagt vooral vertrouwen en rust. Deze ronde gaat over beide.

| Wijziging | Waar | Verwachte impact |
|---|---|---|
| **robots.txt wordt gerespecteerd** (RFC 9309): vóór elke run haalt de worker per website robots.txt op, voor `SuperScoutBot` en `*`. Verbiedt die een adres dat een adapter nodig heeft, dan wordt die keten overgeslagen, met reden. Onbereikbaar: laatst bekende kopie (max. 30 dagen), anders niet ophalen. Een test controleert dat elke URL in een adapter ook in de controlelijst staat. `ROBOTS_MODE=report` meet alleen, zonder af te dwingen. | `ingestion/src/robots.ts`, `gate.ts`, `source-urls.ts` | Doet wat `/ethiek` belooft. |
| **Stoppen bij een “nee”.** 401/403/429 of een captcha: deze run geen verzoek meer naar die winkel (ook de catalogus-crawl, die anders honderden pagina's zou blijven proberen), en daarna zeven dagen niet, dan één poging. | `gate.ts`, AH/Jumbo-assortiment | Geen gedrag dat op omzeilen lijkt. |
| **Openbare statuspagina** `/status`: per winkel hoe vers de aanbiedingen zijn, en waarom een winkel ontbreekt — ook als dat is omdat de winkel het niet wil. | `/status` | Geen enkele folder-site vertelt dit. Vertrouwen is het onderscheid. |
| **Homepage laadt eerst 48 aanbiedingen, de rest bij gebruik** (eerste zoekopdracht, filter, "Toon meer" of als de browser niets te doen heeft). Filteropties en teller kloppen al vóór het laden. | `OfferExplorer`, `/api/aanbiedingen` | Homepage van 749 KB naar 213 KB HTML (90 → 24 KB gzip). Sneller bruikbaar op een gewone telefoon. |

**Nog open, en jouw beslissing:** een deel van de adapters doet zich voor als iets anders. De AH-adapter stuurt `user-agent: Appie/9.39` mee (de AH-app), Jumbo en de browser-adapters doen zich voor als een iPhone. Dat past slecht bij "we respecteren de winkel" en bij de zin op `/ethiek` over "geen besloten systemen". Eerlijk zijn (`SuperScoutBot/1.0 (+https://superscout.nl/ethiek)`) kan betekenen dat een of meer ketens ons weigeren. Dan zie je dat op `/status` en houdt de site ermee op, zoals nu is ingebouwd. Mijn advies: per keten omzetten en kijken wat er gebeurt, te beginnen bij de ketens met een openbare webpagina (ALDI, Lidl, DekaMarkt).

Bewust niet gedaan: **prijs per kilo/liter**. Het klinkt als de logische volgende stap, maar de titels geven de inhoud te vaak niet of als bereik ("zak 450 of 500 gram", "Alle Pampers luiers"). Een vergelijking die bij de helft gokt, is misleidender dan geen vergelijking. Pas zinvol met de productcatalogus (AH/Jumbo hebben inhoud per product) — koppelen via `productForOffer`.

---

## 3. Positionering

Misschien is dit de belangrijkste keuze. "Supermarktaanbiedingen" is een zoekterm; het is geen positie. Folderz, Reclamefolder en Supermarktscanner zitten daar al, met jaren voorsprong.

Wat SuperScout wél kan zijn: **de snelste manier om te zien waar je dagelijkse boodschappen deze week goedkoop zijn — supermarkt, drogist of Action, maakt niet uit.** Zoeken in plaats van bladeren. Geen account. Geen advertenties die de volgorde bepalen.

Die uitbreiding naar drogisterijen is logischer dan het lijkt. Wasmiddel, luiers, tandpasta, shampoo: die liggen bij AH én bij Kruidvat, en de prijsverschillen zijn groot. Juist daar is vergelijken zinvol. Een bouwmarkt is een ander verhaal — ander koopmoment, andere frequentie. Die komt pas als de rest staat.

Volgorde van uitbreiding, op basis van overlap met supermarkten:

1. **Drogisterij** (Kruidvat, Etos, Trekpleister, DA) — grootste overlap, wekelijkse aankopen, veel zoekvolume ("kruidvat aanbiedingen", "1+1 gratis kruidvat").
2. **Warenhuis/discounter** (Action, HEMA, Zeeman, Blokker) — huishouden, baby, koken. Action heeft geen klassieke folder-API; HEMA heeft een webshop.
3. **Bouwmarkt** (GAMMA, KARWEI, Praxis, HORNBACH) — pas als 1 en 2 werken. Seizoensgebonden, andere doelgroep.

---

## 4. Aanbiedingendata: wat kan, wat mag

Eerst iets ongemakkelijks. De huidige supermarkt-adapters lezen (deels via app-endpoints, zie de spec van juli) de websites en API's van de ketens. `/ethiek` zegt "openbare aanbiedingenpagina's, geen besloten systemen". Ik denk dat het goed is om te controleren of dat voor élke adapter letterlijk klopt, want het Europese databankenrecht kijkt ook naar herhaald, stelselmatig overnemen van kleine stukken — en het HvJ heeft in 2021 (*CV-Online Latvia/Melons*) bevestigd dat ook een zoekmachine die databanken van anderen doorzoekbaar maakt daaronder kan vallen, als dat de investering van de maker schaadt. Voor een site die door de ketens zelf verkeer naar ze toe stuurt is dat risico beperkt. Nul is het niet. Een korte mail aan elke keten ("we doen dit, zo ziet het eruit, wil je bezwaar maken of liever een feed leveren?") verandert een grijs gebied in iets verdedigbaars.

Voor nieuwe winkels geldt: **niet scrapen als eerste keuze.** De feed-adapter bestaat precies daarom.

### Per bron

| Bron | Betrouwbaarheid | Kosten | Technische moeite | Juridisch | Schaalbaarheid |
|---|---|---|---|---|---|
| **Directe toestemming / partnerfeed van de winkel** | Hoog — de winkel levert zelf | Nul, soms een tegenprestatie (verkeer, vermelding) | Laag: feedbestand, of een klein script dat hun export omzet | Het schoonst. Leg de afspraak vast in `licence` | Per winkel een gesprek; traag maar duurzaam |
| **Affiliatenetwerk-productfeed** (Awin, TradeTracker, Daisycon — per winkel nagaan wie ze gebruiken) | Hoog voor prijzen, wisselend voor actieperiodes | Gratis voor publishers | Laag–middel: feed downloaden, omzetten naar het feedformaat | Mag binnen de publisher-voorwaarden. **Botst met `/ethiek` ("geen affiliate")** — dat is jouw keuze, niet de mijne. Als je het doet: open over zijn, volgorde niet laten beïnvloeden (de code regelt de melding en `rel="sponsored"` al) | Hoog: één integratie per netwerk dekt veel winkels |
| **Handmatige invoer, gecureerd** | Hoog als iemand het controleert; kost tijd | Tijd: ~30 min per winkel per week voor een top 15 | Nul: feedbestand | Feiten zijn vrij, verzamelingen niet per se. Klein houden, eigen woorden, **geen folderafbeeldingen** | Laag. Goed om te starten en vraag te testen, niet om 25 winkels te dekken |
| **Folder-platformen** (Publitas e.d.) / aggregators als B2B-licentie | Hoog | Geld (licentie) | Middel | Schoon met contract | Hoog, maar pas zinvol met verkeer of budget |
| **Scrapen van winkelsites** | Middel — breekt bij elke redesign (zie de adaptergeschiedenis) | Onderhoudstijd | Hoog (browser, botbescherming) | Grijs: voorwaarden, databankenrecht, robots.txt | Laag — elke winkel is een eigen project |
| **Open Food Facts** (ODbL) | Middel — crowdsourced | Gratis | Laag | Open licentie, bronvermelding verplicht | Alleen productinfo (EAN, foto's, ingrediënten), geen prijzen |

### Advies per retailer

- **Kruidvat / Trekpleister** (A.S. Watson): eerst mailen om toestemming of een feed. Ondertussen: nagaan of er een affiliateprogramma is en onder welk netwerk. Handmatig een wekelijkse top 10 kan om vraag te testen, zonder afbeeldingen.
- **Etos**: zelfde aanpak. Onderdeel van Ahold Delhaize; misschien loopt een gesprek via dezelfde contacten als bij AH.
- **DA**: franchiseketen, minder zoekvolume. Na Kruidvat en Etos.
- **HEMA**: webshop, waarschijnlijk affiliateprogramma — nagaan. Weekaanbiedingen overlappen met huishouden/baby.
- **Action**: geen klassieke webshop-feed. Handmatig een kleine selectie weekdeals, of een partnergesprek. Niet scrapen: veel zoekvolume trekt ook veel aandacht van hun kant.
- **Blokker, Zeeman**: laag prioriteit; affiliate nagaan.
- **Bouwmarkten**: Intergamma (GAMMA, KARWEI), Praxis, HORNBACH hebben webshops en waarschijnlijk affiliateprogramma's. Pas na drogisterij.
- **Vomar, Coop, Spar, Ekoplaza** (supermarkt, nog niet ingelezen): compleetheid is de kern van de positionering. Zelfde vraag: eerst toestemming/feed, dan pas een adapter.

Alles wat hierboven "nagaan" zegt, is ook echt nagaan: programma's en netwerken wisselen, en ik wil je geen verouderde lijst als feit geven.

### Verlopen, dubbelingen, bron — hoe het nu geregeld is

- **Verlopen**: elke aanbieding heeft een geldigheid; `isActive` filtert per request. Feedbestanden mógen geen actie zonder einddatum hebben en worden na 14 dagen zonder update genegeerd. Verlopen URL's verwijzen door naar de productpagina of een lopende actie, of geven 404.
- **Dubbelingen**: per bron op id; in feeds ook op genormaliseerde titel + einddatum (goedkoopste blijft). Over winkels heen is "hetzelfde product" bedoeld: dat is vergelijken.
- **Bron en actualiteit**: op elke aanbiedingspagina ("Bron: Website van Jumbo · vandaag opgehaald").
- **Niet misleiden**: "was"-prijs alleen als hij hoger is; groothandelsprijzen gemarkeerd als excl. btw; kortingspercentages alleen als ze eerlijk te berekenen zijn (`effectiveDiscountPercent`). Let op de Omnibus-regel voor winkels zelf (de "was"-prijs moet de laagste prijs van de afgelopen 30 dagen zijn): als vergelijker neem je hun "was"-prijs over, en de prijshistorie kan straks laten zien wanneer die niet klopt. Dat is meteen een onderscheidende functie.

---

## 5. SEO

### Audit — wat goed is (niet aankomen)

Unieke titles en descriptions per winkel/categorie/actievorm, uit live data. Canonicals overal, filtervarianten naar `/`. Sitemap met eerlijke `lastmod` plus aparte productsitemap. Product + Offer structured data met eerlijke `priceValidUntil`, BreadcrumbList, CollectionPage/ItemList, FAQPage uit live data. Open Graph met eigen OG-afbeelding. Noindex op dunne categorieën. Footer als link-hub. IndexNow bij deploy. Afbeeldingen lazy, eerste kaart eager met `fetchpriority`.

### Wat er nog moet

1. **Search Console via DNS TXT, sitemaps indienen, homepage laten indexeren.** Staat al in `MARKETING.md` en is nog steeds stap één. Bing Webmaster Tools erbij (importeer uit GSC, 5 minuten), `INDEXNOW_KEY` als secret.
2. **Rapport "Pagina's" in GSC** wekelijks bekijken: "Gecrawld – momenteel niet geïndexeerd" op aanbiedingspagina's is het signaal voor thin content. Dan eerder de productpagina's (permanent) laten ranken dan de weekaanbiedingen.
3. **`/beste-aanbiedingen` promoten**: intern gelinkt vanaf homepage, header, footer. Extern is dit de link die je in Reddit/Facebook-posts gebruikt.
4. **Landingspagina's pas bouwen als er data is.** "Kruidvat aanbiedingen deze week" komt vanzelf zodra er een Kruidvat-feed is (`/winkel/kruidvat`). "Beste wasmiddel aanbiedingen" pas als er ≥ 5 wasmiddelacties bij ≥ 2 winkels zijn — anders is het precies de dunne pagina die Google afstraft. Aanbiedingen per plaats: niet doen zolang er geen lokale data is (folders zijn landelijk). Zou een lege-pagina-fabriek worden.
5. **Productpagina's als lange termijn**: ze blijven bestaan als de actie voorbij is. Daar zit de prijshistorie, en die wordt met elke week waardevoller.
6. **Core Web Vitals meten** in GSC (veldgegevens) en PageSpeed Insights op `/`, `/winkel/ah` en een aanbiedingspagina. Grootste bekende post: de homepage stuurt alle ~1.000 kaarten mee in de RSC-payload. Als INP of LCP op mobiel rood wordt: server-side zoeken via `/api/zoek` en alleen de eerste 48 kaarten meesturen.

### Monitoring

| Wat | Waar | Hoe vaak |
|---|---|---|
| Geïndexeerde pagina's, fouten | GSC → Pagina's | wekelijks |
| Vertoningen, klikken, positie per query | GSC → Prestaties, filter op "aanbiedingen", "kruidvat", "1+1" | wekelijks |
| Bing-indexatie | Bing Webmaster Tools | maandelijks |
| Rankings op 20 kerntermen | GSC is genoeg; een tool (bijv. een gratis rank tracker) pas bij groei | maandelijks |
| CWV veldgegevens | GSC → Core Web Vitals | maandelijks |
| Sitemapfouten | GSC → Sitemaps | na elke deploy die routes raakt |

---

## 6. Groei

`MARKETING.md` heeft al een goed kanaalplan. Wat ik toevoeg is vooral: meet het, en maak er experimenten van.

### Experimenten

| # | Hypothese | Uitvoering | KPI | Verwachte impact | Prio |
|---|---|---|---|---|---|
| 1 | Een wekelijkse "top 10" in lokale Facebook-bespaargroepen levert meer terugkerende bezoekers op dan Reddit | 4 weken elke maandag een post met link naar `/beste-aanbiedingen` in 3 groepen (met toestemming beheerder) | bezoeken via facebook.com, volglijst-aanmeldingen | Middel | Hoog |
| 2 | Wie een term volgt, komt vaker terug | Volgknop is live; banner op homepage | % "Volglijst bekeken" met `nieuw=true` per week | Hoog | Hoog |
| 3 | Lege zoekresultaten zijn de beste roadmap | Analytics aan, na 4 weken top 20 van zoektermen met 0 resultaten | aantal 0-zoekopdrachten, aandeel drogisterij-termen | Stuurt uitbreiding | Hoog |
| 4 | Drogisterijdata verdubbelt zoekvolume | Handmatige Kruidvat-top-15 per week, 6 weken | vertoningen op "kruidvat" in GSC, zoekopdrachten met "shampoo/luiers" | Hoog | Middel |
| 5 | WhatsApp-deelknop per aanbieding wordt gebruikt | Is live | "Aanbieding gedeeld" per 100 bezoeken | Laag–middel | Middel |
| 6 | Korte video's "5 deals onder €3" werken op TikTok/Instagram | 8 weken, 2 per week, gegenereerd uit `content-cli` | volgers, klikken via bio-link | Onzeker | Laag |
| 7 | Een nieuwsbrief met e-mailadres levert meer op dan RSS | Pas na 2 als volglijst < 5% gebruik heeft | inschrijvingen | Hoog, maar raakt privacybelofte | Later |

### Contentformats die gedeeld worden

"De 10 beste aanbiedingen van week N" (bestaat nu als pagina). "Alles onder €5" (sectie op die pagina). "Waar is wasmiddel deze week het goedkoopst?" — pas met meerdere winkels. "1+1 gratis bij alle winkels" (bestaat: `/acties/1-plus-1-gratis`). Maandoverzicht "zo vaak was koffie in de aanbieding" zodra de prijshistorie drie maanden oud is.

### Analytics-events (klaar, uit tot `ANALYTICS_DOMAIN` gezet is)

`Zoekopdracht` (term, resultaten: 0 / 1-5 / 6-20 / 20+), `Filter` (soort, waarde), `Doorklik winkel` (winkel), `Volg zoekterm`, `Volglijst bekeken` (termen, nieuw), `Aanbieding gedeeld` (via), `Lijst gedeeld`, `Fout gemeld` (reden).

Terugkerende bezoekers meet Plausible niet (dat kan alleen met een identifier). De eerlijke proxy is "Volglijst bekeken" met `nieuw=true`: dat is per definitie iemand die terugkwam. Daarnaast serverlogs met GoAccess, zoals `MARKETING.md` al voorstelt.

Aanzetten: Plausible-account (EU-gehost) of self-hosted Plausible CE, dan `ANALYTICS_DOMAIN=superscout.nl` in de `.env` op de server en de container herstarten. `/privacy` past zich vanzelf aan. Gebruik je een ander pakket, pas dan ook die tekst aan.

---

## 7. Roadmap

### Dag 0–30 — fundament en meten

- [ ] Search Console (DNS TXT) + Bing, sitemaps indienen. _Nog steeds de belangrijkste taak._
- [ ] Beslissen over analytics; zo ja: Plausible aan.
- [ ] `ADMIN_TOKEN` zetten (≥ 16 tekens) en `/beheer` elke maandag openen.
- [ ] Mail aan Kruidvat en Etos: toestemming of feed vragen. Tegelijk nagaan welke affiliateprogramma's er zijn.
- [ ] Beslissen over affiliate (ja/nee) en `/ethiek` daarop aanpassen vóór de eerste affiliatefeed.
- [x] `deal-types.ts`: ketennamen uit live data halen (zelfde fout als de homepage had).
- [ ] Eerste 4 weken Facebook-experiment (#1).

### Dag 31–60 — eerste niet-supermarkt

- [ ] Eerste drogisterij live via feed (partner, affiliate of handmatige top 15).
- [ ] Copy-ronde: overal "supermarkten" waar het "winkels" moet zijn (`liveNoun()` bestaat al).
- [ ] Categorie drogisterij splitsen zodra er ≥ 40 drogisterij-aanbiedingen zijn.
- [ ] Top-20 lege zoekopdrachten analyseren (#3) en de uitbreidingsvolgorde bijstellen.
- [ ] GSC: welke pagina's worden gecrawld maar niet geïndexeerd? Daarop bijsturen.
- [ ] CWV-veldgegevens bekijken; zo nodig homepage naar server-side zoeken.

### Dag 61–90 — verdiepen

- [ ] Tweede en derde niet-supermarkt (Etos/HEMA of Action).
- [ ] Afdelingspagina's (`/drogisterij`, `/huishouden`) zodra een afdeling ≥ 3 winkels en ≥ 50 aanbiedingen heeft.
- [ ] Vergelijkingspagina's voor producten die bij ≥ 3 winkels in de aanbieding zijn ("wasmiddel", "luiers"), uit data gegenereerd, met minimumdrempel.
- [ ] Beslissen over e-mailalerts (double opt-in, verwerkersovereenkomst, uitschrijflink, bewaartermijn) — alleen als de volglijst bewijst dat mensen alerts willen.
- [ ] Afstandsfilter pas als er winkel-locatiedata is die het waard is (de Permissions-Policy laat geolocatie op de eigen site al toe).

---

## 8. KPI's

| KPI | Bron | Nu | Doel dag 90 |
|---|---|---|---|
| Organische klikken/week | GSC | nulmeting doen | × 3 t.o.v. nulmeting |
| Geïndexeerde pagina's | GSC | nulmeting doen | > 500, waarvan > 50 winkel/categorie/actie |
| Rankings | GSC, gem. positie op "aanbiedingen deze week", "1+1 gratis", "[keten] aanbiedingen" | — | top 20 op ≥ 5 termen |
| Zoekopdrachten/week | Plausible `Zoekopdracht` | — | nulmeting in week 1, dan groei |
| Aandeel zoekopdrachten met 0 resultaten | Plausible | — | dalend na elke nieuwe winkel |
| Doorklikratio naar winkel | `Doorklik winkel` / bezoeken aanbiedingspagina | — | > 15% |
| Volglijst-aanmeldingen | `Volg zoekterm` | 0 | > 3% van bezoekers |
| Terugkerend bezoek (proxy) | `Volglijst bekeken` met `nieuw=true` | 0 | wekelijks groeiend |
| Gedeelde aanbiedingen | `Aanbieding gedeeld` + `Lijst gedeeld` | — | > 1 per 100 bezoeken |
| Meldingen en afhandeltijd | `/beheer` | 0 | afgehandeld < 48 uur |
| Core Web Vitals (mobiel, p75) | GSC / CrUX | — | LCP < 2,5 s, INP < 200 ms, CLS < 0,1 |
| Winkels live | `/beheer` | 10 supermarkten | + 2 niet-supermarkten |

---

## 9. Configuratie op de server

Alles optioneel; leeg betekent "uit".

```
ADMIN_TOKEN=<≥16 willekeurige tekens>       # /beheer
ANALYTICS_DOMAIN=superscout.nl              # Plausible aan
ANALYTICS_SCRIPT_SRC=                       # alleen bij self-hosted
```

`REPORTS_PATH`, `OFFER_BLOCKLIST_PATH` en `FEEDS_DIR` staan al in `docker-compose.yml` en wijzen naar `/data`. Een aanbieding verbergen:

```sh
docker exec superscout-ingestion sh -c 'echo "[\"ah:123\"]" > /data/verborgen.json'
```
