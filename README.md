# Sententia Dashboard

TanStack Start (React 19 + Vite) SSR dashboard. Se construye con Vite y se sirve
en producción con Bun (`Bun.serve`) detrás de Nginx en el VPS Contabo.

## Desarrollo local

```bash
bun install
bun run dev
```

## Despliegue en VPS (Bun + systemd + Nginx)

Usuario dedicado `dashboard` con Bun en `/opt/dashboard/.bun/bin/bun`.
La app escucha en `127.0.0.1:3001` y Nginx la expone vía
`https://dashboard.blissoft.tech`.

```bash
cd /opt/dashboard/app
git pull
/opt/dashboard/.bun/bin/bun install --frozen-lockfile
/opt/dashboard/.bun/bin/bun run build
sudo systemctl restart dashboard
sudo journalctl -u dashboard -f
```

### Variables de entorno (`/etc/dashboard.env`, modo 600)

```
PGHOST=...
PGPORT=5432
PGDATABASE=sententia_db
PGUSER=sententia_user
PGPASSWORD=...
PGSSLMODE=require
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
```

systemd las carga vía `EnvironmentFile=/etc/dashboard.env` y `scripts/start.ts`
las lee de `process.env`.
