# Overleaf CE Portal

This document explains how to build and run the Overleaf CE portal as a Docker container using Bun and Docker Compose.

## Prerequisites

- Docker Engine 24 or later
- Access to the `overleaf_default` Docker network (created by the Overleaf Toolkit)
- A prepared `.env.local` file that mirrors `overleaf-ce-portal/.env.example`

## Quick Start

### 1. Build the image

```bash
docker compose build
```

### 2. Run database migrations

Use the one-off container to run Drizzle migrations before starting the service:

```bash
docker compose run --rm portal bun run db:migrate
```

This command executes `scripts/migrate.ts`, which invokes the Drizzle migrator against the SQLite database configured via `DATABASE_URL`.

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

## CI/CD

The workflow at `.github/workflows/docker-build.yml` builds and publishes the Bun-based image to GitHub Container Registry. Ensure `packages: write` permissions are enabled for the workflow or provide a personal access token with the required scope.
