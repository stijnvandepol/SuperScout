# Deploy — SuperScout op Ubuntu via GitHub Actions

De pipeline (`.github/workflows/deploy.yml`) rolt bij elke push naar `main` uit:

1. **test** (GitHub-hosted `ubuntu-latest`): installeert deps, bouwt de web-app, typecheck, tests.
2. **deploy** (jouw **self-hosted runner** op Ubuntu): `docker compose up -d --build`.

De deploy draait alleen als de tests slagen. Geen secrets nodig — de container draait op dezelfde Ubuntu-machine als de runner.

## Eenmalige setup op de Ubuntu-server

### 1. Docker + Compose-plugin

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Laat de runner-gebruiker Docker draaien zonder sudo:
sudo usermod -aG docker $USER
# log daarna opnieuw in (of: newgrp docker)
```

### 2. Self-hosted GitHub Actions-runner

In GitHub: **repo → Settings → Actions → Runners → New self-hosted runner → Linux**. Volg de getoonde commando's (ze bevatten een tijdelijke token). Kort samengevat:

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64.tar.gz -L <URL-uit-github>
tar xzf actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/<jij>/SuperScout --token <token-uit-github>
```

Installeer 'm als service zodat hij altijd draait:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

De runner krijgt standaard de labels `self-hosted` en `linux` — precies wat de workflow verwacht (`runs-on: [self-hosted, linux]`).

## Zo werkt een release

- Push naar `main` → workflow start automatisch.
- `test` groen → `deploy` bouwt de image en herstart de container met `restart: unless-stopped`.
- App draait op **poort 3000**. Bereikbaar op `http://<server-ip>:3000`.

### Reverse proxy (optioneel, aangeraden voor productie)

Zet er een reverse proxy (Caddy of Nginx) vóór voor TLS + een domein → `localhost:3000`. Voorbeeld met Caddy (`/etc/caddy/Caddyfile`):

```
superscout.nl {
    reverse_proxy 127.0.0.1:3000
}
```

## Lokaal draaien / testen

```bash
docker compose up --build      # bouwt en start op http://localhost:3000
docker compose down            # stopt
```

## Aanbiedingenarchief

De ingest-worker schrijft naast `offers.json` ook `/data/offers-archive.json`: elke actie die we de afgelopen **120 dagen** gezien hebben, inclusief afgelopen en toekomstige.

**Het archief zijn geen pagina's.** Verlopen acties krijgen bewust geen eigen pagina meer — "deze actie is afgelopen" is een doodlopend eind vermomd als inhoud. In plaats daarvan:

- Staat hetzelfde product nu ergens in de aanbieding, dan volgt een **308 naar die actuele actie**. Dat is wat de bezoeker zocht.
- Zo niet, dan is het een **404**.
- Het redirectdoel wordt per request opnieuw bepaald, niet opgeslagen. Anders zou de actie van vorige week naar die van deze week wijzen, die zelf weer verloopt, en groeit er een redirectketen aan.

Het archief blijft dus bestaan als **index**, niet als publieksinhoud: het voedt die redirect en de prijshistorie.

- Staat op hetzelfde persistente volume als de offers.
- Groeit tot ruwweg **15-20 MB** en stabiliseert daar; het retentievenster snoeit ouder werk weg (`ARCHIVE_RETENTION_DAYS` in `packages/core/src/offer-archive.ts`).
- De web-app leest 'm via `ARCHIVE_PATH`, met een eigen cache van 5 minuten. **Bewust een apart bestand**: `getOffers()` draait op elke listing-render en moet klein blijven, terwijl het archief alleen geraakt wordt bij een verlopen URL.
- Ontbreekt het bestand, dan werkt de site gewoon — verlopen URL's geven dan een 404 in plaats van een redirect.

## Aanbiedingen zonder einddatum

Vijf van de acht live ketens (ALDI, DekaMarkt, Poiesz, Hoogvliet, Sligro) worden via DOM-scraping opgehaald en leveren **geen enkele datum** — geen `validFrom`, geen `validUntil`. Dat is ~47% van de set. De drie API-ketens (AH, Dirk, Jumbo) hebben 100% dekking.

Gevolgen om rekening mee te houden:

- `isActive()` faalt bewust open op ontbrekende datums, dus deze acties worden nooit weggefilterd. Dat werkt alleen zolang de ingest daadwerkelijk dagelijks draait: het bestand wordt overschreven met wat de keten *vandaag* publiceert.
- De kaart toonde hier een lege regel. Nu valt hij terug op `freshnessLabel()` — "vandaag opgehaald" — wat een zwakkere maar ware claim is.
- Het filter "bijna verlopen" en sorteren op resterende looptijd werken voor deze ketens niet.

De echte oplossing is de vijf normalizers de geldigheidsperiode laten uitlezen; die staat op de pagina's van de ketens wel degelijk vermeld, alleen in lopende tekst.

## Prijshistorie

De ingest-worker schrijft naast `offers.json` ook `/data/price-history.jsonl` — één regel per product per dag, alleen voor aanbiedingen met een echte stuksprijs (~70% van de set; Jumbo publiceert vrijwel nooit een stuksprijs en levert dus weinig aan).

- Staat op hetzelfde persistente volume als de offers. **De hele waarde is opgebouwde tijd**, dus dit bestand mag nooit met een container weggegooid worden — `docker compose down -v` wist 'm.
- Groeit met ongeveer **4 MB per jaar**. Append-only, dus een onderbroken write kost hooguit de laatste regel.
- Idempotent: een tweede run op dezelfde dag voegt niets toe.
- De web-app leest 'm via `PRICE_HISTORY_PATH`. Ontbreekt het bestand, dan tonen de aanbiedingspagina's simpelweg geen prijsblok — er verschijnt nooit een lege "binnenkort beschikbaar".

Een aanbieding krijgt pas een prijsblok bij minimaal 3 metingen over minstens 14 dagen. De eerste twee weken na uitrol is er dus nog niets te zien; dat is opzet.

Handmatige back-up van het volume:

```bash
docker run --rm -v superscout_offers-data:/data -v "$PWD":/backup alpine \
  cp /data/price-history.jsonl /backup/price-history-$(date +%F).jsonl
```

## Let op

- De app draait nu op een **statische seed** (`apps/web/src/data/offers.json`); een deploy ververst de aanbiedingen dus niet vanzelf. Live-ingestie (periodiek de adapters draaien) is een aparte stap.
- Op **Windows** faalt `next build` met `output: "standalone"` op een symlink-`EPERM`; dat is een Windows-rechtenkwestie. In de Linux-container (en CI) werkt het wel.
