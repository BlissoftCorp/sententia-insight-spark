
# Plan de despliegue — `dashboard.blissoft.tech` en VPS Contabo `109.123.252.40`

Objetivo: que el dashboard corra como un sitio más del VPS Contabo (junto a tus WordPress y Blazor), con su propio subdominio y SSL, conectándose por IP fija al VPS de Postgres.

---

## 0. Estado actual

- VPS Contabo con varios proyectos en `/var/www/*` (WordPress, Blazor, etc.). Webmin instalado.
- IPv4 fija del VPS Contabo: **`109.123.252.40`** → la única IP que se whitelistea en el Postgres remoto.
- Subdominio elegido: **`dashboard.blissoft.tech`**.
- Código del dashboard actualmente compila para Cloudflare Workers (`wrangler.jsonc`, `@cloudflare/vite-plugin`). Hay que cambiarlo a un build Node/Bun estándar para correrlo en el VPS.

---

## 1. DNS — apuntar el subdominio al VPS (lo haces tú, 2 min)

En el panel donde gestionas `blissoft.tech` (Cloudflare, Namecheap, IONOS, etc.) crea **un solo registro**:

```text
Tipo:   A
Nombre: dashboard
Valor:  109.123.252.40
TTL:    Auto (o 300)
Proxy:  Si es Cloudflare → al principio en "DNS only" (nube gris), luego puedes activarlo
```

Verifica desde tu portátil:
```bash
dig +short dashboard.blissoft.tech
# debe devolver: 109.123.252.40
```

---

## 2. Postgres remoto — abrir solo a esta IP (lo hace el dev, 5 min)

Mensaje listo para el dev:

> En el VPS de Postgres, sustituir las reglas Cloudflare anteriores por esto:
>
> 1. En `pg_hba.conf` añadir UNA sola línea:
>    ```
>    hostssl  sententia_db  sententia_user  109.123.252.40/32   scram-sha-256
>    ```
> 2. `sudo systemctl reload postgresql`
> 3. Firewall (ufw / iptables): abrir `5432/tcp` solo a `109.123.252.40/32` y cerrar el resto.
> 4. Confirmar `ssl = on` en `postgresql.conf` y rotar el password de `sententia_user`. Pasármelo por canal seguro.

Postgres queda accesible solo desde nuestro VPS Contabo, nada más.

---

## 3. Preparar el VPS Contabo (sin romper lo existente)

Lo importante: **no tocamos** ningún `vhost` de WordPress ni el Blazor. Solo añadimos cosas nuevas.

### 3.1. Comprobaciones previas (por SSH)

```bash
# qué web server tienes
nginx -v 2>&1 | head -1
apache2 -v 2>&1 | head -1

# puertos en uso (80/443 quién los sirve)
sudo ss -tlnp | grep -E ':80|:443|:3000'

# qué hay en /var/www
ls -la /var/www
```

Según el resultado:
- **Si ya hay Nginx** → añadimos un server block más, certbot reusa.
- **Si solo hay Apache** → instalamos Nginx **escuchando en un puerto interno** (ej. 8080) solo para el dashboard, o añadimos un VirtualHost Apache que haga proxy a Node. Te lo confirmo cuando me digas qué hay.
- **Si hay Webmin con Virtualmin** → creamos el subdominio desde ahí y enchufamos el reverse proxy. También sirve.

### 3.2. Crear usuario y carpeta dedicada

```bash
sudo adduser --system --group --home /opt/dashboard dashboard
sudo mkdir -p /opt/dashboard
sudo chown -R dashboard:dashboard /opt/dashboard
```

Mantiene el código y los procesos del dashboard aislados del resto.

### 3.3. Instalar runtime (Bun recomendado, Node 20 alternativa)

```bash
# Bun (recomendado, ya es el runtime que usamos)
curl -fsSL https://bun.sh/install | sudo -u dashboard bash

# o Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3.4. Clonar el repo

Cuando publiquemos el código a GitHub:
```bash
sudo -u dashboard git clone <repo-url> /opt/dashboard/app
```

### 3.5. Variables de entorno

`/etc/dashboard.env` (modo `600`, owner root):
```bash
PGHOST=<ip-vps-postgres>
PGPORT=5432
PGDATABASE=sententia_db
PGUSER=sententia_user
PGPASSWORD=<password-rotado>
PGSSLMODE=require
NODE_ENV=production
PORT=3000
```

---

## 4. Cambios en el código del dashboard (lo hago yo en Lovable)

Hoy el build apunta a Cloudflare Workers. Para correr en el VPS:

1. Quitar `wrangler.jsonc` y el plugin `cloudflare` del `vite.config.ts`.
2. Cambiar el adaptador de TanStack Start a **Node/Bun** (entry estándar que escucha en `process.env.PORT`).
3. `src/lib/db.server.ts` y los server functions (`src/lib/analytics.functions.ts`) **no cambian**.
4. Añadir scripts en `package.json`:
   ```json
   "scripts": {
     "build": "vite build",
     "start": "node .output/server/index.mjs"   // o bun, según runtime
   }
   ```
5. Documentar comando de deploy: `git pull && bun install && bun run build && sudo systemctl restart dashboard`.

Esto solo lo arranco **cuando confirmes que vamos por esta ruta**, porque rompe temporalmente el preview de Lovable.

---

## 5. Servicio systemd (auto-arranque + restart)

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
ExecStart=/home/dashboard/.bun/bin/bun run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dashboard
sudo systemctl status dashboard
```

El servidor SSR queda escuchando en `127.0.0.1:3000` (no expuesto al mundo).

---

## 6. Reverse proxy + SSL (sin tocar tus otros sitios)

### Caso Nginx (lo más común)

`/etc/nginx/sites-available/dashboard.blissoft.tech`:
```nginx
server {
  listen 80;
  server_name dashboard.blissoft.tech;

  location / {
    proxy_pass http://127.0.0.1:3000;
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

# SSL Let's Encrypt (renueva solo)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dashboard.blissoft.tech
```

### Caso Apache

Si el VPS usa Apache, te paso un `VirtualHost` equivalente con `ProxyPass http://127.0.0.1:3000/` y `certbot --apache`. Lo decidimos cuando me confirmes qué hay corriendo.

---

## 7. Validación end-to-end

1. `https://dashboard.blissoft.tech/dashboard/summary` carga.
2. Desaparece el banner **"Could not load live data"**.
3. KPIs (New users, Active users, Queries) y Top users muestran datos reales.
4. Cambiar rango (Today / Last 7 days / This month) funciona y los deltas tienen sentido.
5. `sudo journalctl -u dashboard -f` no muestra errores de conexión.
6. WordPress, Blazor y demás siguen funcionando exactamente igual (probarlo).

---

## 8. Diagrama final

```text
[ Navegador ]
     │ HTTPS
     ▼
[ Cloudflare DNS ] → A dashboard.blissoft.tech → 109.123.252.40
     │
     ▼
[ VPS Contabo 109.123.252.40 ]
  ├── Nginx :443  (tus WordPress, Blazor, etc.)  ← intactos
  └── Nginx :443  dashboard.blissoft.tech → proxy 127.0.0.1:3000
        └── systemd: dashboard.service (Bun + TanStack SSR)
              │ SSL, desde IP 109.123.252.40
              ▼
[ VPS Postgres ]  pg_hba: allow 109.123.252.40/32 únicamente
```

---

## Lo que necesito de ti antes de avanzar

Tres datos cortos por SSH al VPS Contabo (un solo bloque que puedes pegar):
```bash
nginx -v 2>&1 | head -1
apache2 -v 2>&1 | head -1
sudo ss -tlnp | grep -E ':80|:443'
ls /etc/nginx/sites-enabled 2>/dev/null
ls /etc/apache2/sites-enabled 2>/dev/null
```

Con eso confirmo si vamos por **Nginx puro** o **Apache + proxy**, y arranco los cambios de código del paso 4.
