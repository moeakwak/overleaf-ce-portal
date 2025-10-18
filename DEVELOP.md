# Overleaf CE Portal – Development Notes

This document captures the local Docker Compose workflow shipped with the repository. It targets contributors who build the image from source rather than consuming the prebuilt registry image.

## Prerequisites

- Docker Engine 24 or later
- Access to the `overleaf_default` Docker network created by the Overleaf Toolkit
- A prepared `.env.local` file that mirrors `.env.example`

## Local Docker Compose

The repository contains a `docker-compose.yml` that builds the portal image from the working tree.

### 1. Build the image

```bash
docker compose build
```

### 2. Run database migrations

Execute Drizzle migrations before starting the service:

```bash
docker compose run --rm portal bun run db:migrate
```

This runs `scripts/migrate.ts`, which invokes the Drizzle migrator against the SQLite database configured via `DATABASE_URL`.

If the container is already running, execute the same command inside it:

```bash
docker compose exec portal bun run db:migrate
docker compose restart portal
```

### 3. Start the service

```bash
docker compose up -d
```

Check logs with:

```bash
docker compose logs -f
```

The application listens on `http://localhost:3100` (forwarded to container port `3000`).
