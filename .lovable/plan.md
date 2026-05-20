## Paso 4 — Migrar build de Cloudflare Workers a Bun

Objetivo: que `vite build` produzca un bundle SSR genérico que Bun pueda servir directamente, manteniendo intacto todo lo que ya funciona (`src/server.ts`, `db.server.ts`, rutas, componentes).

### Hallazgos clave

- `@lovable.dev/vite-tanstack-config` **acepta `cloudflare: false`** para desactivar el plugin de Workers (solo se carga durante `command === "build"`, no en dev). Así el preview de Lovable sigue funcionando igual.
- El plugin `tanstackStart` emite el SSR a `dist/server/` y el cliente a `dist/client/` independientemente del adaptador.
- `src/server.ts` ya exporta `export default { fetch }` — exactamente la firma que `Bun.serve({ fetch })` espera. **No hay que reescribirlo.**
- Bun 1.3.14 ya está instalado en el VPS en `/opt/dashboard/.bun/bin/bun`.

### Cambios concretos

**1. `vite.config.ts`** — desactivar Cloudflare, mantener entry del SSR:
```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: { entry: "server" },
  },
});
```

**2. Borrar `wrangler.jsonc`** (ya no se usa).

**3. Crear `scripts/start.ts`** (launcher Bun, fuera de `src/` para que Vite no lo procese):
```ts
// scripts/start.ts — corre el bundle ya construido bajo Bun.serve
import handler from "../dist/server/server.js";

const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "127.0.0.1";

Bun.serve({
  port,
  hostname,
  fetch: (req) => handler.fetch(req, process.env, {}),
});

console.log(`[dashboard] listening on http://${hostname}:${port}`);
```

**4. `package.json`** — quitar Cloudflare, añadir `start`:
- Quitar `"@cloudflare/vite-plugin"` de `dependencies`.
- Añadir scripts:
  ```json
  "start": "bun run scripts/start.ts",
  "start:prod": "NODE_ENV=production bun run scripts/start.ts"
  ```
- Mantener `dev`, `build`, `build:dev`, `preview`, `lint`, `format` igual.

**5. `bun remove @cloudflare/vite-plugin`** (limpia node_modules y lockfile).

**6. `src/server.ts`, `src/start.ts`, `src/lib/db.server.ts`, `src/lib/analytics.functions.ts`, todas las rutas y componentes** → **no se tocan**.

**7. `README.md`** (al final) — bloque de despliegue VPS:
````markdown
## Despliegue en VPS (Bun + systemd)

```bash
cd /opt/dashboard/app
git pull
/opt/dashboard/.bun/bin/bun install --frozen-lockfile
/opt/dashboard/.bun/bin/bun run build
sudo systemctl restart dashboard
sudo journalctl -u dashboard -f
```
````

### Validación local antes de empujar a GitHub

Yo no puedo ejecutar el build en Lovable porque rompería el sandbox, así que después de aplicar los cambios el flujo es:

1. Lovable: confirmas que el **preview sigue cargando** (el `dev` server no usa Cloudflare → debería funcionar idéntico).
2. Tú haces commit + push a GitHub.
3. En el VPS (siguiente turno, paso 3.4 + 5 + 6):
   ```bash
   sudo -u dashboard git clone <repo> /opt/dashboard/app
   cd /opt/dashboard/app
   sudo -u dashboard /opt/dashboard/.bun/bin/bun install
   sudo -u dashboard /opt/dashboard/.bun/bin/bun run build
   sudo -u dashboard PORT=3001 HOST=127.0.0.1 /opt/dashboard/.bun/bin/bun run scripts/start.ts
   ```
   `curl http://127.0.0.1:3001` debe devolver HTML del dashboard (sin DB conectada saldrá el banner de error, lo cual está OK — confirma que el server arranca).

### Riesgos

- **Bajo:** el preview de Lovable se rompe. Mitigación: el plugin Cloudflare solo se carga en `command === "build"`, no en `serve` (dev). Lo confirmé leyendo el wrapper.
- **Medio:** alguna API del bundle SSR no es 100% compatible con Bun (poco probable — `src/server.ts` ya usa solo Web APIs estándar: `Request`, `Response`, `Headers`).
- **Nulo en lógica de negocio:** ningún cambio en queries, RLS, rutas o UI.

### Lo que NO entra en este paso

- `/etc/dashboard.env` (paso 3.4 — espera al dev del Postgres).
- `dashboard.service` systemd (paso 5).
- Nginx vhost + certbot (paso 6).
- pg_hba (paso 7 — dev del otro VPS).

Aprueba el plan y aplico los 4 cambios de archivo + `bun remove`. Después haces commit, push, y seguimos con el VPS.
