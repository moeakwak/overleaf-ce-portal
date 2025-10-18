# Overleaf CE Portal

The portal is published as `ghcr.io/moeakwak/overleaf-ce-portal:latest` and is meant to run alongside an Overleaf Toolkit deployment.

## Quick Deploy

1. Prepare `.env.local` file by copying `.env.example` and filling in the values.

2. Ensure the Overleaf Toolkit expose ports and Docker socket by adding `overleaf-toolkit/config/docker-compose.override.yml` with:

   ```yaml
   services:
     mongo:
       ports:
         - "27017:27017"
     redis:
       ports:
         - "6379:6379"
   ```

3. Save a `docker-compose.yml` next to `.env.local` (for example in `overleaf-ce-portal`) using the published image:

   ```yaml
   services:
     portal:
       image: ghcr.io/moeakwak/overleaf-ce-portal:latest
       env_file:
         - .env.local
       environment:
         - PORT=3000
         - HOSTNAME=0.0.0.0
       ports:
         - "3000:3000"
       volumes:
         - ./sqlite.db:/app/sqlite.db:rw
         - /var/run/docker.sock:/var/run/docker.sock:ro
       restart: unless-stopped
       networks:
         - overleaf-toolkit

   networks:
     overleaf-toolkit:
       external: true
       name: overleaf_default
   ```

4. Pull the image and run migrations:

   ```bash
   docker compose pull
   docker compose run --rm portal bun run db:migrate
   ```

5. Start the service:

   ```bash
   docker compose up -d
   ```

The portal will be available at `http://localhost:3000`.
