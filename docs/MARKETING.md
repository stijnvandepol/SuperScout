# Marketingplan SuperScout

_Opgesteld augustus 2026. Herzien wanneer Search Console de eerste 90 dagen data heeft._

---

## 1. Uitgangssituatie

Dit is de eerlijke nulmeting. Geen aannames, alleen wat gecontroleerd is.

| Feit | Stand |
|---|---|
| Indexering Google | `site:superscout.nl` gaf nul resultaten (aug 2026) |
| Search Console | Nog niet aangemaakt |
| Backlinks | Nul |
| Aanbiedingen live | ~1.000 over 10 ketens, dagelijks ververst |
| Verdienmodel | Geen, en bewust geen |
| Marketingbudget | Geen |
| Analytics | Geen, en bewust geen |
| Merknaam op Google | Bezet door `superscout.co` (VC-platform, hogere autoriteit) |

**Het probleem is niet het product. Het is dat niemand weet dat het bestaat.**

De technische SEO staat inmiddels goed: `Product`-structured-data op 365 pagina's, unieke content per aanbieding, actievorm-landingspagina's, interne link-hub, sitemap met `lastmod`. Dat is de motor. Er zit alleen nog geen brandstof in: zonder Search Console en zonder één externe link heeft Google geen reden om te crawlen.

---

## 2. De markt

Voedselinflatie daalde begin 2026 naar ~2%, maar een boodschappenmandje dat in 2021 €100 kostte, kost nu €130–140. Discounters winnen marktaandeel. McKinsey's *State of the Consumer 2026* laat zien dat prijsbewustzijn breder is geworden dan noodzaak — ook hogere inkomens worden selectiever.

Vertaling: de doelgroep krimpt niet, hij verbreedt. Dat is gunstig, maar het betekent ook dat de grote spelers goed gefinancierd zijn.

### Concurrentieveld

| Speler | Type | Bereik | Model | Zwakte |
|---|---|---|---|---|
| **Reclamefolder.nl** | Folder-kijker | ~5,2M gebruikers, 200 winkels | Advertenties / retail media | Bladeren, niet zoeken |
| **AlleFolders** | Folder-kijker | 2M+ app-beoordelingen | Advertenties | Idem |
| **Folderz / Folders.nl** | Folder-kijker | Groot | Advertenties | Idem |
| **Supermarktscanner.nl** | Prijsvergelijker | Onbekend | Reclamevrij, optioneel account | **Geen Lidl**, Google-account vereist voor volgen |
| **Promo** | App, live zoeken | Onbekend | Onbekend | App-only |
| **Pepper.com NL** | Community | ~300k leden | Advertenties/affiliate | Niet supermarkt-specifiek |

### Wat dit betekent

De folder-kijkers domineren op volume maar lossen een ander probleem op. Zij beantwoorden *"wat ligt er deze week in de folder van Jumbo?"*. SuperScout beantwoordt *"waar is koffie deze week het goedkoopst?"*. Dat is een andere vraag, met andere zoekwoorden.

Supermarktscanner is de echte concurrent en op één punt structureel sterker: 10+ jaar prijshistorie. **Ga daar niet mee concurreren.** Die achterstand is niet in te halen en de placeholder "Prijsontwikkeling — binnenkort beschikbaar" is inmiddels terecht van de site verwijderd.

---

## 3. Positionering

> **SuperScout is de enige plek waar je álle tien ketens tegelijk doorzoekt — inclusief Lidl en ALDI — zonder account, zonder cookies, zonder advertenties en zonder dat iemand meekijkt.**

Drie pijlers, elk gekozen omdat een concurrent hem structureel niet kan kopiëren:

**1. Compleetheid inclusief discounters.**
Supermarktscanner mist Lidl. Juist Lidl en ALDI zijn waar prijsbewuste consumenten naartoe bewegen. Dit is een feitelijke, verifieerbare claim — gebruik hem letterlijk.

**2. Zoeken in plaats van bladeren.**
Tien folders doorbladeren om koffie te vergelijken is het probleem. Eén zoekopdracht is de oplossing. De folder-apps kunnen dit niet zonder hun advertentiemodel te slopen: hun inkomsten zitten in de folderweergave.

**3. Radicale privacy, als product en niet als voetnoot.**
Geen account, geen cookies, geen tracking, geen advertenties, geen affiliate, geen betaalde rangschikking. De concurrenten leven van advertenties; zij kunnen dit nooit nadoen. Dit is geen bijzaak — het is het enige echt onkopieerbare.

### De ondersteunende asymmetrie

Je hebt geen verdienmodel. Dat voelt als een zwakte en is in marketing je scherpste wapen: **niemand hoeft je te vertrouwen op je motieven, want je hebt er geen.** Elke concurrent moet uitleggen waarom hun rangschikking eerlijk is. Jij niet. Zet dat vooraan, niet weggestopt op `/ethiek`.

---

## 4. Doelgroep

Eén primaire, twee secundaire. Niet meer, want je kunt maar één boodschap tegelijk uitdragen.

**Primair — de wekelijkse planner.** 30–55, doet één grote boodschappenronde per week, plant vooraf, staat open voor wisselen van winkel voor een goede actie. Zoekt op `aanbiedingen deze week`, `1+1 gratis`, `AH bonus`. Dit is waar je SEO op mikt.

**Secundair A — de privacybewuste techneut.** Kleiner, maar dit is je *launch*-publiek: zij schrijven de eerste posts, geven de eerste backlinks en waarderen "geen tracking" als een op zichzelf staande reden. Bereikbaar via Tweakers, Reddit, Hacker News.

**Secundair B — het studentenhuishouden.** Prijsgedreven, deelt via WhatsApp, geen loyaliteit aan een keten. De deelfunctie van het mandje is voor hen gebouwd.

---

## 5. Kanalen, op rendement gerangschikt

### Prioriteit 1 — Search Console (dag 1, 20 minuten)

Alles hieronder is zinloos zolang dit niet staat. Google crawlt je site niet uit zichzelf zonder externe signalen.

- Property aanmaken via **DNS TXT** (niet de meta-tag: overleeft rebuilds, dekt subdomeinen)
- Sitemap indienen
- Homepage handmatig laten indexeren via URL-inspectie
- Bing Webmaster Tools erbij, plus `INDEXNOW_KEY` als GitHub-secret

**Verwacht effect:** van onvindbaar naar geïndexeerd binnen 1–3 weken. Dit is de enige stap die per se moet.

### Prioriteit 2 — De contentmotor uit je eigen data

Dit is je grootste ongebruikte bezit. Je hebt een dagelijks ververste, gestructureerde dataset van alle Nederlandse supermarktacties. Concurrenten hebben die ook, maar zij gebruiken hem alleen als product. Gebruik hem als **contentfabriek**.

Wekelijks automatisch te genereren uit `offers.json`:

- "De 10 scherpste acties van week _n_" — één post, tien kanalen
- "Grootste korting per supermarkt deze week"
- "Wat is er nieuw in de folders van maandag"
- Seizoensstukken op basis van echte data: BBQ, kerst, Spaanse week

Kosten: eenmalig een generator schrijven. Daarna nul. Dit is het enige kanaal dat schaalt zonder tijd te kosten.

### Prioriteit 3 — Launch bij de techdoelgroep

Je hebt een verhaal dat deze doelgroep echt interesseert, en het is waar: solo gebouwd, tien supermarkt-API's gereverse-engineerd, geen advertenties, geen tracking, geen verdienmodel, alles client-side.

- **Tweakers** — plaats in de juiste rubriek, leid met het technische verhaal
- **Reddit** — `r/thenetherlands`, `r/Netherlands`, `r/nederlands`. Lees eerst de zelfpromotieregels; post als maker, niet als marketeer
- **Hacker News** — Show HN, gericht op de privacy-architectuur en het scrapen
- **Pepper.com NL** — ~300k dealjagers, maar strikte zelfpromotieregels: bouw eerst reputatie

**Waarom dit werkt:** dit levert je eerste backlinks op, en backlinks zijn precies wat Google mist. Dit kanaal is dus geen los kanaal — het is de brandstof voor prioriteit 1.

### Prioriteit 4 — Instagram / TikTok, wekelijkse deals

Supermarktscanner doet dit al, wat bewijst dat het kanaal werkt in deze niche. Formaat: één post per week, "beste deals", visueel, direct uit je data. Laag onderhoud mits gegenereerd.

### Prioriteit 5 — WhatsApp-deelmechaniek

Al gebouwd (`ShareBasketButton`, deelbaar mandje als tekst). Dit is je enige virale lus. Meet of hij gebruikt wordt zodra je serverlogs draaien; zo niet, dan is de knop te diep weggestopt.

### Bewust níet doen

- **Betaalde advertenties** — geen budget, en Google Ads voor een site zonder verdienmodel is geld verbranden
- **Affiliate-links** — breekt `/ethiek` letterlijk
- **Merchant Center** — je bent niet de verkoper; dit is misrepresentation en leidt tot directe schorsing. De CSS-route vereist 50+ merchant-domeinen; je hebt er 10
- **Google Analytics** — breekt je privacybelofte en levert je niets wat Search Console niet ook geeft

---

## 6. 90-dagenplan

### Weken 1–2 — Fundament

- [ ] Search Console via DNS TXT, sitemap indienen, homepage laten indexeren
- [ ] Bing Webmaster Tools + `INDEXNOW_KEY` als GitHub-secret
- [ ] Backlink vanaf `stijnvandepol.nl`
- [ ] Merchant Center-onboarding afsluiten; domein daar **niet** claimen
- [ ] Eén zin over Cloudflare als verwerker op `/privacy` (klopt nu niet helemaal)

### Weken 3–4 — Eerste externe signalen

- [ ] Tweakers-post met het technische verhaal
- [ ] Reddit `r/thenetherlands` — als maker, met het privacyverhaal vooraan
- [ ] Show HN
- [ ] Herhaal indexeringscontrole: `site:superscout.nl` moet nu resultaten geven

### Weken 5–8 — Contentmotor

- [ ] Generator schrijven die wekelijks "top 10 deals" produceert uit `offers.json`
- [ ] Instagram-account, eerste vier wekelijkse posts
- [ ] Eerste GSC-data lezen: welke zoekwoorden komen binnen? Stuur de content daarop bij
- [ ] Serverlog-analyse opzetten (GoAccess op je Caddy-logs) — bezoekersaantallen zonder tracking

### Weken 9–12 — Verdiepen op wat werkt

- [ ] Verdubbel op het kanaal dat volgens GSC daadwerkelijk vertoningen oplevert
- [ ] Categoriepagina's uitbreiden waar de zoekvraag zit
- [ ] Overweeg de dunne categorieën (`Water` 2, `Huisdieren` 3) te verbergen
- [ ] Ketens uitbreiden richting Vomar/Coop/Spar — compleetheid is je positionering

---

## 7. Meten zonder te tracken

Je hebt bewust geen analytics. Dat maakt meten anders, niet onmogelijk. Deze bronnen raken geen enkele bezoeker:

| Bron | Wat je eruit haalt |
|---|---|
| **Search Console** | Vertoningen, klikken, posities, zoekwoorden, indexeringsstatus |
| **Serverlogs (GoAccess)** | Bezoekers, populaire pagina's, verwijzers — volledig in eigen beheer |
| **Bing Webmaster** | Tweede indexeringsbron |

### Doelen voor 90 dagen

Bewust bescheiden. Een nieuw domein zonder autoriteit heeft tijd nodig, en te agressieve doelen leiden tot slechte beslissingen.

| Meetpunt | Nu | Doel dag 90 |
|---|---|---|
| Geïndexeerde pagina's | 0 | > 300 |
| Verwijzende domeinen | 0 | ≥ 5 |
| Positie op "superscout" | Niet aanwezig | Top 3 |
| Wekelijkse vertoningen (GSC) | 0 | > 1.000 |
| Rankende zoekwoorden | 0 | > 50 |

Merk op dat er geen omzetdoel staat. Dat is correct: er is geen verdienmodel, en dat is een keuze, geen omissie.

---

## 8. Risico's

**Merkverwarring met `superscout.co`.** Zij hebben autoriteit op de naam. De Organization-structured-data met logo en beschrijving is inmiddels toegevoegd om Google te helpen de entiteiten te scheiden, maar op korte termijn win je "superscout" niet. **Mik daarom niet op je merknaam maar op de probleemzoekwoorden** — "aanbiedingen deze week" verslaan is realistischer én waardevoller dan je eigen naam.

**Afhankelijkheid van scraping.** Je hele product hangt aan tien externe bronnen die kunnen wijzigen of blokkeren. Een keten die je afsluit is een productrisico én een marketingrisico: "alle supermarkten" is je positionering. Monitor dit.

**Solo-capaciteit.** Elk kanaal hierboven kost tijd die je niet aan het product besteedt. Daarom staat de contentmotor op prioriteit 2: het is het enige kanaal dat na eenmalige investering vanzelf doorloopt.

**Geen verdienmodel betekent geen groeibudget.** Dit plan is volledig organisch. Dat is traag. Accepteer dat, of herzie het uitgangspunt — maar herzie het dan bewust en pas `/ethiek` aan, in plaats van er stilletjes vanaf te wijken.

---

## 9. Wat dit plan níet oplost

Eerlijk zijn over de grenzen:

- Je verslaat Reclamefolder niet op bereik. Dat is niet het doel.
- Je verslaat Supermarktscanner niet op prijshistorie. Concurreer daar niet.
- Zonder budget duurt organische groei maanden, niet weken.
- De grootste onzekerheid is niet het plan maar de uitvoering: dit staat of valt bij het wekelijks volhouden van de contentmotor.

**De enige stap die vandaag echt telt is Search Console.** Al het andere is optimalisatie van iets dat nog niet bestaat.
