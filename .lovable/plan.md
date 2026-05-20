## Opción B — Allowlist de rangos públicos de Cloudflare

El backend de Lovable corre en **Cloudflare Workers**. Cada request del dashboard a Postgres sale desde una IP perteneciente a los rangos públicos que Cloudflare publica en `https://www.cloudflare.com/ips/`. La idea es permitir SOLO esos rangos en `pg_hba.conf`, exigiendo además SSL + password. Postgres queda inalcanzable desde cualquier otra IP de internet.

---

### Qué tiene que hacer el dev en el VPS (una sola vez)

**1. Asegurar que Postgres escucha en la interfaz pública con SSL obligatorio**

En `postgresql.conf`:
```
listen_addresses = '*'
ssl = on
ssl_cert_file = '/etc/ssl/certs/postgres.crt'
ssl_key_file  = '/etc/ssl/private/postgres.key'
```
(Si aún no hay cert, puede generar uno con Let's Encrypt o un self-signed; el cliente Postgres del Worker se configura para aceptarlo.)

**2. Reemplazar la regla actual `35.195.94.243/32` en `pg_hba.conf` por los rangos de Cloudflare**

Reemplazar la línea actual del usuario `sententia_user` por un bloque como este (IPv4 oficiales de Cloudflare a fecha de hoy):

```
# Cloudflare IPv4 ranges - https://www.cloudflare.com/ips-v4
hostssl  sententia_db  sententia_user  173.245.48.0/20    scram-sha-256
hostssl  sententia_db  sententia_user  103.21.244.0/22    scram-sha-256
hostssl  sententia_db  sententia_user  103.22.200.0/22    scram-sha-256
hostssl  sententia_db  sententia_user  103.31.4.0/22      scram-sha-256
hostssl  sententia_db  sententia_user  141.101.64.0/18    scram-sha-256
hostssl  sententia_db  sententia_user  108.162.192.0/18   scram-sha-256
hostssl  sententia_db  sententia_user  190.93.240.0/20    scram-sha-256
hostssl  sententia_db  sententia_user  188.114.96.0/20    scram-sha-256
hostssl  sententia_db  sententia_user  197.234.240.0/22   scram-sha-256
hostssl  sententia_db  sententia_user  198.41.128.0/17    scram-sha-256
hostssl  sententia_db  sententia_user  162.158.0.0/15     scram-sha-256
hostssl  sententia_db  sententia_user  104.16.0.0/13      scram-sha-256
hostssl  sententia_db  sententia_user  104.24.0.0/14      scram-sha-256
hostssl  sententia_db  sententia_user  172.64.0.0/13      scram-sha-256
hostssl  sententia_db  sententia_user  131.0.72.0/22      scram-sha-256
```

Notas para el dev:
- **`hostssl`** (no `host`) fuerza conexión cifrada.
- **`scram-sha-256`** (no `md5`) — autenticación moderna.
- Si el VPS también recibe tráfico IPv6, añadir los rangos de `https://www.cloudflare.com/ips-v6` con el mismo formato.
- Mantener la regla local `host all all 127.0.0.1/32 ...` para administración desde el propio VPS.

**3. Recargar Postgres** (sin reiniciar):
```
sudo systemctl reload postgresql
```

**4. Endurecer el resto del perímetro**
- Firewall (ufw/iptables): puerto `5432/tcp` abierto solo a esos mismos rangos (defensa en profundidad por si alguien edita `pg_hba` por error).
- Password fuerte de `sententia_user` (rotarlo y enviárnoslo de nuevo).
- Instalar **fail2ban** con jail para Postgres para frenar intentos de fuerza bruta dentro de los rangos permitidos.

**5. Mantenimiento**
- Los rangos de Cloudflare cambian muy raramente, pero conviene revisar `https://www.cloudflare.com/ips/` cada ~6 meses. Cloudflare publica un changelog; si añaden un rango nuevo, se agrega una línea más en `pg_hba.conf` y se hace `reload`.

---

### Qué hago yo en el lado Lovable (después del cambio del dev)

1. Confirmar que el cliente Postgres (`src/lib/db.server.ts`) está usando `ssl: { rejectUnauthorized: false }` o `require` según el cert que use el VPS — ya está preparado, solo verifico.
2. Si rotan el password, lo actualizo en los secretos de Lovable Cloud (`DATABASE_URL` o las vars individuales).
3. Refrescar el dashboard y comprobar que el banner "Could not load live data" desaparece y los KPIs y la tabla Top users muestran datos reales.
4. Hacer un par de queries de humo (rango Today / Last 7 days) para validar latencia y que el delta vs. período anterior calcula bien.

---

### Riesgos aceptados con esta opción

- **Tamaño de la superficie**: cualquiera con una IP de Cloudflare (es decir, cualquier sitio detrás de Cloudflare en el mundo) puede *intentar* autenticar contra Postgres. Mitigación: SSL obligatorio + `scram-sha-256` + password fuerte + fail2ban.
- **Mantenimiento manual**: si Cloudflare publica un rango nuevo y el dev no lo añade, esa franja del Worker dejará de conectar (síntoma: errores intermitentes solo desde ciertas regiones).

Si en algún momento el dev quiere eliminar esa superficie por completo, podemos migrar luego a Opción C (API gateway en el propio VPS) sin tocar el código del dashboard — solo cambiaría la URL base de las server functions.

---

### Mensaje listo para enviarle al dev

> Hola, en Lovable vamos a llamar a Postgres del VPS desde Cloudflare Workers, así que las IPs de salida no son fijas. Para abrirlo de forma segura te pido:
>
> 1. En `postgresql.conf`: `listen_addresses = '*'` y `ssl = on` con un certificado válido.
> 2. En `pg_hba.conf`: reemplazar la regla actual de `35.195.94.243/32` por los rangos públicos de Cloudflare (`https://www.cloudflare.com/ips/`), todos con `hostssl ... scram-sha-256`. Te paso el bloque exacto a pegar (ver arriba). Si usas IPv6, añade también los rangos v6.
> 3. `sudo systemctl reload postgresql`.
> 4. Firewall del VPS: dejar `5432/tcp` abierto solo a esos mismos rangos.
> 5. Rotar el password de `sententia_user` y enviármelo por canal seguro.
> 6. Instalar `fail2ban` con jail para Postgres.
>
> Una vez hecho, yo refresco el dashboard y validamos que los datos cargan.
