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

## Let op

- De app draait nu op een **statische seed** (`apps/web/src/data/offers.json`); een deploy ververst de aanbiedingen dus niet vanzelf. Live-ingestie (periodiek de adapters draaien) is een aparte stap.
- Op **Windows** faalt `next build` met `output: "standalone"` op een symlink-`EPERM`; dat is een Windows-rechtenkwestie. In de Linux-container (en CI) werkt het wel.
