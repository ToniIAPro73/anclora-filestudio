# Deployment VPS — Anclora FileStudio Service

## Prerequisitos del VPS

- OS: Ubuntu 22.04 LTS o Debian 12
- Docker Engine 24+ y Docker Compose v2
- Mínimo: 2 vCPU, 4 GB RAM, 50 GB disco SSD
- Puerto 80 y 443 abiertos
- Dominio con registro DNS A apuntando al VPS

## Estructura de archivos en VPS

```
/opt/anclora-filestudio/
├── compose.yml           — configuración de producción
├── .env                  — secretos (NO versionado)
├── Caddyfile             — configuración reverse proxy
├── keys/                 — claves JWT públicas (montadas read-only)
├── backup.sh             — backup PostgreSQL + configuración
├── restore.sh            — restauración
├── healthcheck.sh        — verificación de salud completa
└── update.sh             — actualización controlada

/var/lib/anclora-filestudio/
├── artifacts/            — artefactos de conversión (volumen Docker)
└── work/                 — workspaces de jobs (volumen Docker)

/var/lib/postgresql/      — datos PostgreSQL (volumen Docker)
/var/lib/redis/           — datos Redis (volumen Docker)
```

## Servicios Docker Compose

### Producción

| Servicio | Imagen | Puertos internos | Propósito |
|---|---|---|---|
| `reverse-proxy` | `caddy:2-alpine` | 80, 443 (públicos) | TLS automático, proxy |
| `api` | `ghcr.io/toniia/filestudio-api:latest` | 8080 (interno) | API HTTP |
| `worker` | `ghcr.io/toniia/filestudio-worker:latest` | — | Procesamiento BullMQ |
| `postgres` | `postgres:16-alpine` | 5432 (interno) | Base de datos |
| `redis` | `redis:7-alpine` | 6379 (interno) | Cola BullMQ + rate limit |

Puertos externos: solo 80 y 443 vía Caddy.

For the authorized Desktop YouTube flow, the worker also listens on internal port `8081`.
Caddy exposes only `/worker/*` over HTTPS and strips that prefix before forwarding. Every
control request except `/health` requires the `YOUTUBE_WORKER_TOKEN` bearer secret. Do not
publish port 8081 directly or reuse the token used by Desktop to call the Vercel API.
PostgreSQL stores this feature's job state; Redis carries BullMQ jobs. Temporary MP3/MP4
artifacts are removed 24 hours after a terminal job state.

The Desktop local environment points `ANCLORA_FILESTUDIO_REMOTE_API_URL` to the deployed
Vercel route ending in `/api/youtube-service` and keeps its matching
`ANCLORA_FILESTUDIO_REMOTE_API_TOKEN` server-side. For direct artifact streaming, it also
needs `ANCLORA_FILESTUDIO_YOUTUBE_WORKER_URL` ending in `/worker` and the worker token.
Vercel uses separate `YOUTUBE_REMOTE_API_TOKEN`, `YOUTUBE_WORKER_URL`, and
`YOUTUBE_WORKER_TOKEN` values. Generate distinct random values; never commit them or
prefix them with `NEXT_PUBLIC_`.

### Activación del flujo YouTube remoto (pendiente, no desplegado)

Estado: el código está listo; la infraestructura **no** está configurada. Pasos, en orden:

1. En el VPS, generar tres secretos distintos (≥32 caracteres, p. ej. `openssl rand -hex 32`):
   `YOUTUBE_WORKER_TOKEN` (VPS y Vercel), `YOUTUBE_REMOTE_API_TOKEN` (Vercel y Desktop),
   y las contraseñas `POSTGRES_PASSWORD` / `REDIS_PASSWORD`. Guardarlos en el `.env` del VPS
   (modo `0600`) y en las variables protegidas de Vercel; nunca en el repositorio.
2. `docker compose build worker && docker compose up -d postgres redis worker reverse-proxy`.
   El worker crea la tabla `youtube_jobs` de forma idempotente al arrancar.
3. Comprobar `curl https://<dominio-vps>/worker/health` → `{"ok":true}`; cualquier otra ruta
   sin `Authorization: Bearer` debe devolver 401.
4. En Vercel (variables solo de servidor): `YOUTUBE_REMOTE_API_TOKEN`, `YOUTUBE_WORKER_URL`
   (`https://<dominio-vps>/worker`), `YOUTUBE_WORKER_TOKEN`. Redesplegar el proyecto.
5. En el entorno del servidor local de Desktop: `ANCLORA_FILESTUDIO_REMOTE_API_URL`
   (`https://<dominio-vercel>/api/youtube-service`), `ANCLORA_FILESTUDIO_REMOTE_API_TOKEN`,
   `ANCLORA_FILESTUDIO_YOUTUBE_WORKER_URL` (`https://<dominio-vps>/worker`),
   `ANCLORA_FILESTUDIO_YOUTUBE_WORKER_TOKEN`. Sin las dos primeras, Desktop usa el camino
   local anterior (con su límite de 2 h).
6. QA end-to-end con un recurso de prueba autorizado (nunca con la cuenta personal de Toni).

Límites efectivos: la ruta de Vercel solo transporta JSON pequeño (el límite de cuerpo de
Vercel Functions es 4,5 MB; `maxDuration` de la ruta = 120 s, el proxy aborta a 110 s) y
Caddy espera hasta 100 s por respuesta; los metadatos de yt-dlp se limitan a 75 s. Los
MP3/MP4 nunca pasan por Vercel: Desktop los descarga del VPS. Por trabajo: máximo 12 h,
archivo ≤ 4 GiB (`--max-filesize`), 20 trabajos activos como máximo en el servicio y
artefactos eliminados 24 h después del estado terminal.

El worker usa un `HOME` de solo lectura (`read_only: true`), por eso yt-dlp se ejecuta con
`--no-cache-dir`. El token del worker también está en Desktop (descarga directa), así que este
esquema de token compartido solo vale para instalaciones controladas.

#### Actualizar yt-dlp

La versión está fijada en `deploy/vps/Dockerfile.worker` (`ARG YTDLP_VERSION`) y debe
coincidir con `scripts/toolchain.lock.json` (hoy 2026.07.04). Para actualizar: cambiar ambos
valores en el mismo cambio, `docker compose build --no-cache worker`, `docker compose up -d
worker` y repetir la QA con un recurso autorizado. Las actualizaciones de yt-dlp son la vía
habitual cuando YouTube cambia su extracción, pero no garantizan acceso anónimo.

### Opcionales (activar con profile)

| Servicio | Profile | Propósito |
|---|---|---|
| `minio` | `storage-s3` | Almacenamiento S3-compatible local |
| `prometheus` | `observability` | Scraping métricas |
| `grafana` | `observability` | Dashboards |
| `otel-collector` | `tracing` | OpenTelemetry |

## Variables de entorno (Service mode)

```bash
# Identidad
ANCLORA_FILESTUDIO_MODE=service
ANCLORA_FILESTUDIO_ENV=production
ANCLORA_FILESTUDIO_PUBLIC_BASE_URL=https://filestudio.anclora.internal

# Red
ANCLORA_FILESTUDIO_BIND_HOST=0.0.0.0
ANCLORA_FILESTUDIO_PORT=8080

# Base de datos
ANCLORA_FILESTUDIO_DATABASE_URL=postgresql://fs_user:STRONG_PASS@postgres:5432/filestudio

# Cola
ANCLORA_FILESTUDIO_REDIS_URL=redis://:STRONG_REDIS_PASS@redis:6379

# Almacenamiento
ANCLORA_FILESTUDIO_STORAGE_DRIVER=shared-filesystem
ANCLORA_FILESTUDIO_STORAGE_ROOT=/var/lib/anclora-filestudio/artifacts
ANCLORA_FILESTUDIO_WORK_ROOT=/var/lib/anclora-filestudio/work

# Autenticación
ANCLORA_FILESTUDIO_JWT_ISSUER=anclora-nexus
ANCLORA_FILESTUDIO_JWT_AUDIENCE=anclora-filestudio-service
ANCLORA_FILESTUDIO_JWT_PUBLIC_KEYS_PATH=/run/secrets/jwt-public-keys

# Webhooks
ANCLORA_FILESTUDIO_WEBHOOK_SIGNING_KEY_FILE=/run/secrets/webhook-signing-key

# Límites
ANCLORA_FILESTUDIO_UPLOAD_MAX_BYTES=524288000
ANCLORA_FILESTUDIO_JOB_TTL_MINUTES=60
ANCLORA_FILESTUDIO_ARTIFACT_TTL_MINUTES=60
ANCLORA_FILESTUDIO_MAX_CONCURRENT_JOBS=10

# Remote YouTube worker control surface
ANCLORA_WORKER_DATABASE_URL=postgresql://filestudio:...@postgres:5432/filestudio
ANCLORA_WORKER_API_TOKEN=<separate-random-token-at-least-32-characters>
ANCLORA_WORKER_API_PORT=8081
ANCLORA_WORKER_ARTIFACT_ROOT=/data/artifacts/youtube

# Logging
ANCLORA_FILESTUDIO_LOG_LEVEL=info
```

Valores inseguros (`changeme`, `default`, `secret`, `password`) causan `exit(1)` al arrancar.

## Imágenes Docker

### Multi-stage build API

```dockerfile
# Stage 1: deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Stage 2: builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build:api

# Stage 3: runtime
FROM node:22-alpine AS runtime
RUN addgroup -S filestudio && adduser -S filestudio -G filestudio
WORKDIR /app
COPY --from=builder /app/dist/api ./
USER filestudio
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8080/api/v1/health || exit 1
CMD ["node", "server.js"]
```

Características:
- Usuario no root (`filestudio:filestudio`)
- Sin compiladores en runtime
- Imagen base fijada con digest en producción
- Labels OCI: `org.opencontainers.image.*`

## Operaciones

### Primer despliegue

```bash
cd /opt/anclora-filestudio
cp .env.example .env
# Editar .env con valores reales
docker compose pull
docker compose up -d postgres redis
docker compose run --rm api node migrate.js up
docker compose up -d
./healthcheck.sh
```

### Actualización

```bash
./update.sh  # pull + recreate con zero-downtime (rolling)
```

### Backup

```bash
./backup.sh  # pg_dump + compresión + rotación (7 días)
```

### Restauración

```bash
./restore.sh backup-2026-06-16.sql.gz
```

## Restricciones de red Docker

```yaml
networks:
  public:         # solo reverse-proxy
  internal:       # api, worker, postgres, redis, storage
    internal: true
```

PostgreSQL y Redis solo son accesibles desde `internal` (sin salida a Internet).
Excepción del flujo YouTube: el `worker` también se une a `public` para que yt-dlp tenga
salida a YouTube. No publica puertos; el 8081 solo es alcanzable por Caddy en `internal`.

## Systemd (opcional para autostart)

```ini
[Unit]
Description=Anclora FileStudio Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/anclora-filestudio
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```
