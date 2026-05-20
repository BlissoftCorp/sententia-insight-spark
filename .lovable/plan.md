
# Plan ajustado — Paso 3 en adelante

Confirmado del VPS Contabo:
- Nginx 1.18 (Ubuntu) ya sirve `:80` y `:443` con varios vhosts.
- `:3000` ocupado por **Grafana** → dashboard escuchará en **`127.0.0.1:3001`**.
- DNS `dashboard.blissoft.tech → 109.123.252.40` ya creado.
- Postgres remoto: **pendiente** (lo coordinas con el dev del otro VPS en paralelo).

No tocamos ningún vhost existente (WordPress / Blazor / Grafana). Solo añadimos archivos nuevos.

---

## 3.2 — Crear usuario y carpeta dedicada

```bash
sudo adduser --system --group --home /opt/dashboard dashboard
sudo mkdir -p /opt/dashboard
sudo chown -R dashboard:dashboard /opt/dashboard
```

## 3.3 — Instalar Bun como usuario `dashboard`

```bash
sudo -u dashboard bash -lc 'curl -fsSL https://bun.sh/install | bash'
sudo -u dashboard /opt/dashboard/.bun/bin/bun --version
```

(Bun queda en `/opt/dashboard/.bun/bin/bun`. Lo usaremos en el systemd.)

## 3.4 — Variables de entorno

`/etc/dashboard.env` (root:root, modo 600):

```bash
PGHOST=<ip-vps-postgres>
PGPORT=5432
PGDATABASE=sententia_db
PGUSER=sententia_user
PGPASSWORD=<password-rotado>
PGSSLMODE=require
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
```

```bash
sudo install -m 600 -o root -g root /dev/stdin /etc/dashboard.env <<'EOF'
...contenido...
EOF
```

## 3.5 — Carpeta de la app (vacía, esperando código)

```bash
sudo -u dashboard mkdir -p /opt/dashboard/app
```

Aún **no clonamos** nada: primero tengo que dejar el repo listo en Lovable con build Node/Bun (paso 4 del plan original) y publicarlo a GitHub.

---

## 4 — Cambios de código en Lovable (lo hago yo, cuando me autorices)

- Quitar `wrangler.jsonc` y plugin Cloudflare de `vite.config.ts`.
- Cambiar adaptador TanStack Start a Node/Bun, entry que respeta `process.env.PORT` y `process.env.HOST`.
- `db.server.ts` y `analytics.functions.ts` no se tocan.
- Scripts `build` / `start` en `package.json`.
- README con `git pull && bun install && bun run build && sudo systemctl restart dashboard`.

Romperá el preview de Lovable hasta que esté corriendo en el VPS — solo lo arranco con tu OK explícito.

---

## 5 — systemd

`/etc/systemd/system/dashboard.service`:

```ini
[Unit]
Description=Sententia Dashboard (TanStack Start SSR)
After=network.target

[Service]
Type=simple
User=dashboard
Group=dashboard
WorkingDirectory=/opt/dashboard/app
EnvironmentFile=/etc/dashboard.env
ExecStart=/opt/dashboard/.bun/bin/bun run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dashboard
sudo journalctl -u dashboard -f
```

Escucha solo en `127.0.0.1:3001`.

---

## 6 — Nginx vhost + SSL (sin tocar los demás)

`/etc/nginx/sites-available/dashboard.blissoft.tech`:

```nginx
server {
  listen 80;
  listen [::]:80;
  server_name dashboard.blissoft.tech;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dashboard.blissoft.tech /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dashboard.blissoft.tech --redirect -m tu@email --agree-tos -n
```

Certbot añade el bloque `:443` con SSL y la redirección 80→443 automáticamente. No toca los vhosts de WordPress / Blazor / Grafana.

---

## 7 — Postgres remoto (al dev, en paralelo)

En `pg_hba.conf`:
```
hostssl  sententia_db  sententia_user  109.123.252.40/32  scram-sha-256
```
+ `sudo systemctl reload postgresql`, `ufw allow from 109.123.252.40 to any port 5432`, `ssl = on`, password rotado.

---

## 8 — Validación end-to-end

1. `dig +short dashboard.blissoft.tech` → `109.123.252.40`.
2. `curl -I https://dashboard.blissoft.tech` → 200.
3. `/dashboard/summary` carga, sin banner "Could not load live data".
4. KPIs y Top users con datos reales; deltas cambian al variar el rango.
5. `journalctl -u dashboard -f` sin errores de conexión.
6. WordPress / Blazor / Grafana intactos.

---

## Diagrama final

```text
[Navegador] ─HTTPS→ [DNS dashboard.blissoft.tech] → 109.123.252.40
                                                       │
                              [VPS Contabo]
                                ├── Nginx :443
                                │     ├── vhosts WordPress / Blazor   (intactos)
                                │     └── dashboard.blissoft.tech → 127.0.0.1:3001
                                ├── Grafana en :3000                  (intacto)
                                └── systemd dashboard.service (Bun + TanStack SSR)
                                          │ SSL desde 109.123.252.40
                                          ▼
                                  [VPS Postgres]  pg_hba allow 109.123.252.40/32
```

---

## Próximo paso ahora mismo

Ejecuta en el VPS Contabo (paso 3.2 + 3.3 + 3.5):

```bash
sudo adduser --system --group --home /opt/dashboard dashboard
sudo mkdir -p /opt/dashboard/app
sudo chown -R dashboard:dashboard /opt/dashboard
sudo -u dashboard bash -lc 'curl -fsSL https://bun.sh/install | bash'
sudo -u dashboard /opt/dashboard/.bun/bin/bun --version
```

Pégame el output del `bun --version`. Mientras, le pasas al dev del Postgres la línea del paso 7. Cuando ambos estén listos, te doy luz verde para que apruebes el paso 4 (cambios de código en Lovable).
