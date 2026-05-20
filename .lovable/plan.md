# Opción D — Hospedar el dashboard en un VPS Contabo con IP fija

En vez de abrir Postgres a los rangos de Cloudflare (Opción B), sacamos el backend del dashboard de Cloudflare Workers y lo corremos en un VPS de Contabo con IP fija. El dev solo whitelistea **una IP** en `pg_hba.conf` y listo — la superficie expuesta es mínima.

---

## Arquitectura objetivo

```text
[ Navegador ]
     │  HTTPS
     ▼
[ Cloudflare DNS + (opcional) proxy ]
     │
     ▼
[ VPS Contabo — IP fija X.X.X.X ]
  ├── Nginx (TLS, reverse proxy)
  └── Node.js (Bun) corriendo el dashboard (SSR + server functions)
     │  SSL, IP fija
     ▼
[ VPS Postgres — pg_hba allow X.X.X.X/32 ]
```

Postgres sigue cerrado al mundo: solo acepta `35.195.94.243/32` (la regla que ya existe) **más** la IP del nuevo VPS Contabo.

---

## Qué hay que hacer (de punta a punta)

### 1. Provisionar el VPS Contabo
- Plan VPS S/M (suficiente para SSR + server functions de un dashboard interno).
- Ubuntu 22.04 LTS, IPv4 fija (Contabo la da por defecto).
- Anotar la IP pública → es la que se whitelistea.

### 2. Hardening básico del VPS
- Usuario no-root con sudo, SSH por clave, `PasswordAuthentication no`.
- `ufw`: permitir solo `22/tcp` (SSH), `80/tcp`, `443/tcp`. Cerrar todo lo demás.
- `unattended-upgrades` para parches de seguridad automáticos.
- `fail2ban` con jail para SSH.

### 3. Runtime de la app
- Instalar Bun (o Node 20 LTS) + `git`.
- Clonar el repo del dashboard.
- Variables de entorno (`/etc/dashboard.env`, modo `600`):
  - `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE=require`
  - Secrets de Supabase Auth si aplica.
- Build: `bun install && bun run build`.
- Servicio systemd `dashboard.service` que arranca el servidor SSR en `127.0.0.1:3000` con `Restart=always`.

### 4. Nginx + TLS al frente
- Nginx como reverse proxy `https://dashboard.tu-dominio.com → 127.0.0.1:3000`.
- TLS con Let's Encrypt (`certbot --nginx`), renovación automática.
- Headers de seguridad (HSTS, `X-Frame-Options`, etc.).
- (Opcional) Cloudflare proxy "naranja" delante para WAF/DDoS — el origen sigue siendo la IP de Contabo y Postgres sigue viendo SOLO la IP del VPS.

### 5. Postgres del otro VPS
Un único cambio en `pg_hba.conf`:
```text
hostssl  sententia_db  sententia_user  X.X.X.X/32   scram-sha-256
```
(donde `X.X.X.X` es la IP de Contabo). Luego:
```bash
sudo systemctl reload postgresql
```
Y en el firewall: abrir `5432/tcp` SOLO a `X.X.X.X/32`.

### 6. Migrar el dominio del dashboard
- Apuntar `dashboard.tu-dominio.com` (DNS) al VPS Contabo.
- Quitar el dominio del proyecto Lovable (o dejarlo solo para preview).

---

## Qué cambia en el código del dashboard

**Casi nada.** El código actual (`src/lib/db.server.ts`, server functions en `src/lib/analytics.functions.ts`) ya funciona en Node/Bun igual que en Cloudflare Workers. Lo único a tocar:

1. **Adaptador de servidor**: hoy compila para Cloudflare Workers (`wrangler.jsonc`). Hay que cambiar a un build Node/Bun estándar (servidor HTTP de TanStack Start sobre Node).
2. **Quitar dependencias específicas de Workers** si las hubiera (no se detectan en el código actual).
3. **`db.server.ts`** ya está OK (`postgres` package, SSL con `rejectUnauthorized: false`).
4. **CI/Deploy**: pipeline para hacer pull + build + `systemctl restart dashboard` en el VPS (puede ser un `git pull` manual al inicio y automatizar después con GitHub Actions + SSH).

---

## Comparación rápida con Opción B

| | Opción B (Cloudflare Workers + allowlist de rangos) | Opción D (VPS Contabo + IP fija) |
|---|---|---|
| IPs a whitelistear | ~15 rangos CIDR de Cloudflare | **1 IP /32** |
| Superficie de ataque a Postgres | Cualquier sitio detrás de Cloudflare | Solo ese VPS |
| Mantenimiento de IPs | Revisar rangos Cloudflare cada ~6 meses | Cero (IP fija de Contabo) |
| Cambios en el código | Ninguno | Cambiar adaptador a Node, dejar de usar Workers |
| Hosting | Lovable (incluido) | Contabo (~5–10 €/mes) + tiempo de ops |
| Escalado/CDN | Automático global | Manual; Cloudflare delante si se quiere |
| TLS / dominio | Lovable lo gestiona | Certbot + Nginx, tú lo gestionas |

---

## Riesgos / cosas a tener en cuenta

- **Ops**: ahora tú (o el dev) mantenéis dos VPS en vez de uno. Backups, monitoreo (uptime, logs), parches, renovación de certs.
- **Single point of failure**: si el VPS Contabo cae, el dashboard cae. Mitigable con monitoring (UptimeRobot, Better Stack) y un runbook simple de restart.
- **Deploy**: pierdes el "push to deploy" de Lovable para producción. Lovable sigue siendo perfecto para iterar en preview; producción se despliega al VPS con un script.
- **Coste**: ~5–10 €/mes extra de Contabo.
- **Latencia**: VPS único en una región vs. edge global de Workers. Para un dashboard interno con pocos usuarios es irrelevante.

---

## Mensaje listo para el dev

> Hola, cambio de plan respecto al mensaje anterior de los rangos Cloudflare. En vez de eso, voy a hospedar el dashboard en un VPS Contabo con IP fija (`X.X.X.X`, te la confirmo cuando lo provisione). Lo único que necesito de tu lado en el VPS de Postgres es:
>
> 1. En `pg_hba.conf`, **en vez de** los rangos Cloudflare que te pasé antes, añadir una sola línea:
>    ```
>    hostssl  sententia_db  sententia_user  X.X.X.X/32   scram-sha-256
>    ```
> 2. `sudo systemctl reload postgresql`.
> 3. Firewall (ufw/iptables): abrir `5432/tcp` solo a `X.X.X.X/32`.
> 4. Confirmar que `ssl = on` en `postgresql.conf` y que `sententia_user` tiene password fuerte (rotarlo y enviármelo por canal seguro).
>
> Con eso Postgres queda expuesto a una sola IP del mundo, que es la mía. Nada más que cambiar en tu lado.

---

## Plan de implementación (orden recomendado)

1. **Tú**: contratar VPS Contabo, anotar IP, pasarle al dev los pasos del mensaje de arriba.
2. **Dev**: añade la línea en `pg_hba.conf`, recarga Postgres, ajusta firewall, rota password.
3. **Yo (en Lovable)**: ajustar el build del proyecto para que pueda servirse desde Node/Bun (quitar adaptador Workers, añadir entrypoint Node de TanStack Start). Validar localmente que `bun run build && bun run start` levanta el SSR.
4. **Tú/Dev**: provisionar el VPS Contabo (hardening, Bun, Nginx, certbot, systemd) — te puedo dejar un script de bootstrap.
5. **Deploy inicial**: clonar repo, `bun install`, `bun run build`, `systemctl start dashboard`, apuntar DNS.
6. **Validación**: cargar `https://dashboard.tu-dominio.com/dashboard/summary`, confirmar que desaparece el banner "Could not load live data" y que KPIs + Top users muestran datos reales.
7. **Limpieza**: desactivar/retirar el dominio de producción en Lovable (preview sigue útil para iterar).

¿Avanzo con el paso 3 (adaptar el build para Node/Bun) en cuanto me confirmes que quieres tirar por esta ruta?
