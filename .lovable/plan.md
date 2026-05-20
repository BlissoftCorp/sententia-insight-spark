## Paso 5 + 6 — systemd, env file y Nginx + TLS

El server arranca a mano. Falta dejarlo como servicio gestionado, conectarlo a Postgres y exponerlo por HTTPS.

### 3.4 — `/etc/dashboard.env` (modo 600, owner root)

```
PGHOST=<ip-del-vps-postgres>
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
sudo install -m 600 -o root -g root /dev/null /etc/dashboard.env
sudo nano /etc/dashboard.env   # pegar el bloque
```

**Bloqueante:** necesito que el dev del VPS Postgres te confirme IP pública + password rotado + que `pg_hba.conf` ya permite al IP del VPS dashboard (paso 7, lado de ellos).

### 5 — `/etc/systemd/system/dashboard.service`

```ini
[Unit]
Description=Sententia Dashboard (Bun SSR)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=dashboard
Group=dashboard
WorkingDirectory=/opt/dashboard/app
EnvironmentFile=/etc/dashboard.env
ExecStart=/opt/dashboard/.bun/bin/bun run scripts/start.ts
Restart=on-failure
RestartSec=3
StandardOutput=journal
StandardError=journal
# hardening básico
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/dashboard/app

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dashboard
sudo systemctl status dashboard
sudo journalctl -u dashboard -f       # debería loguear: [dashboard] listening on http://127.0.0.1:3001
curl -i http://127.0.0.1:3001         # HTML 200, sin banner de error si la DB conecta
```

### 6 — Nginx vhost + Certbot para `dashboard.blissoft.tech`

**Prerrequisito DNS:** registro A `dashboard.blissoft.tech` → IP pública del VPS dashboard. Confirmar con `dig +short dashboard.blissoft.tech` antes de pedir el cert.

`/etc/nginx/sites-available/dashboard.blissoft.tech`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name dashboard.blissoft.tech;

    # certbot --nginx añadirá el bloque 443 + redirect automáticamente
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }

    # gzip básico (TanStack ya sirve assets hasheados con cache largo via SSR)
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dashboard.blissoft.tech /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d dashboard.blissoft.tech --redirect --agree-tos -m <email>
sudo systemctl status certbot.timer    # auto-renew
curl -I https://dashboard.blissoft.tech
```

### Validación final

1. `systemctl status dashboard` → active (running)
2. `journalctl -u dashboard -n 50` sin errores de Postgres
3. `https://dashboard.blissoft.tech` carga el dashboard con datos reales (sin `DataErrorBanner`)
4. Reinicio de prueba: `sudo systemctl restart dashboard` → vuelve solo

### Orden de ejecución sugerido

1. DNS A record (puedes ir pidiéndolo en paralelo, propagación tarda)
2. Cuando tengas credenciales DB → `/etc/dashboard.env`
3. `dashboard.service` + enable + verificar journal
4. Nginx vhost + certbot
5. Smoke test público

### Lo que NO entra en este paso

- Auth (login) — pendiente de definir si va con Lovable Cloud o con el Postgres propio
- Backups del Postgres — responsabilidad del otro VPS
- CI/CD desde GitHub al VPS — por ahora deploy manual con `git pull && bun install && bun run build && systemctl restart dashboard` (ya documentado en README)

¿Procedemos con `/etc/dashboard.env` (ya tienes las credenciales DB?) o esperamos al dev del Postgres?