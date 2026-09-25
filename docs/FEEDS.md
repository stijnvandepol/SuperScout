# Aanbiedingen via een feedbestand

Voor winkels waar geen adapter voor is — en voor de meeste niet-supermarkten hoort dat ook zo te blijven — leest de ingestie-worker JSON-bestanden uit `FEEDS_DIR` (standaard `/data/feeds`). Eén bestand per winkel, of meer. Geen code nodig.

Het werkt voor drie soorten bronnen, en het bestand zegt welke:

| `provenance` | Wat het is | Wat de bezoeker ziet |
|---|---|---|
| `partner-feed` | De winkel levert zelf aan (export, API-dump, gedeelde sheet) | "Aangeleverd door Kruidvat" |
| `affiliate-feed` | Productfeed uit een affiliatenetwerk | "Partnerfeed" + melding dat de link via een partnerprogramma loopt; link krijgt `rel="sponsored"` |
| `manual` | Iemand heeft het overgenomen en gecontroleerd | "Handmatig ingevoerd", met de controledatum |

## Stappen

1. Staat de winkel in `packages/core/src/retailer.ts`? Zo niet: één regel toevoegen (naam, sector, kleuren, link). Dat is de enige codewijziging, ooit, per winkel.
2. Zet een bestand neer als `/data/feeds/<slug>.json` of `/data/feeds/<slug>.<iets>.json` (bijv. `kruidvat.week41.json`). Voorbeeld: [`docs/feeds/kruidvat.voorbeeld.json`](feeds/kruidvat.voorbeeld.json).
3. De volgende ingest-ronde (dagelijks, of `docker exec -e INGEST_ONCE=1 -e SKIP_ASSORTMENT=1 superscout-ingestion node --experimental-sqlite packages/ingestion/dist/ingest.cjs`) leest het in. Afgekeurde regels staan met reden in de log (`[feed] kruidvat: regel 3 (…): …`).
4. Zodra er aanbiedingen zijn, verschijnt de winkel vanzelf: winkelpagina, sitemap, footer, filters, `/winkels` gegroepeerd per sector.

## Wat de validator afdwingt

Streng waar het de bezoeker kan misleiden, vergevingsgezind daarbuiten — één foute regel valt weg, de rest gaat door.

- **`licence` is verplicht.** Schrijf op waarom je deze data mag gebruiken. Een feed zonder vastgelegde grondslag wordt niet gepubliceerd.
- **`updatedAt` niet ouder dan 14 dagen.** Een vergeten bestand zet geen oude prijzen online.
- **Elke actie heeft `validFrom` en `validUntil`,** maximaal 62 dagen uit elkaar. Zo verloopt alles vanzelf.
- **"Was"-prijs moet hoger zijn dan de actieprijs,** anders wordt hij weggelaten. Korting boven de 90% wordt geweigerd als ongeloofwaardig.
- **Links alleen naar het domein van de winkel** (behalve bij `affiliate-feed`) en alleen https.
- **Dubbele producten** (zelfde titel en einddatum, ander id) worden samengevoegd; de goedkoopste blijft.
- **Label** wordt herkend: `1+1 gratis`, `2e halve prijs`, `2e gratis`, `3 voor €5`, `25% korting`, `€1,50 korting`. Iets anders mag ook; dan staat het label letterlijk op de kaart.

## Juridisch — lees dit voor je een bestand vult

- Prijzen en productnamen zijn feiten, maar een verzameling ervan kan beschermd zijn door het **databankenrecht** — ook als je steeds kleine stukjes overneemt (herhaald en stelselmatig opvragen telt mee). Handmatig overnemen is dus niet automatisch vrij. Beperk je tot een kleine, zelf gekozen selectie, of vraag toestemming.
- **Afbeeldingen** van producten en folders zijn auteursrechtelijk beschermd. Zet geen `imageUrl` in een `manual`-feed tenzij de licentie dat expliciet toestaat.
- **Folderteksten** niet overtypen. Een eigen, korte titel ("Robijn wasmiddel 1,5 liter") is iets anders dan de wervende tekst uit de folder.
- Bij `affiliate-feed`: lees de voorwaarden van het netwerk. Die bepalen meestal dat je hun trackinglinks gebruikt en de feed niet doorverkoopt. En `/ethiek` zegt nu nog "geen affiliate" — pas die pagina aan vóór de eerste affiliatefeed live gaat.
