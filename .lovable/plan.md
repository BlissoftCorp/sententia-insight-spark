
# Plan: probar conexión a Postgres y explorar el schema

Objetivo: validar las credenciales, probar la conexión a tu Postgres en el VPS, y explorar tablas/vistas. Sin tocar el dashboard mockup todavía.

## Paso 1 — Guardar credenciales como secrets

Voy a pedirte las credenciales con el formulario seguro (`add_secret`). No las pegues en el chat. Los nombres serán los estándar de Postgres para que `psql` los use automáticamente:

- `PGHOST` — IP o hostname del VPS
- `PGPORT` — puerto (normalmente 5432)
- `PGUSER` — usuario
- `PGPASSWORD` — password
- `PGDATABASE` — nombre de la DB
- `PGSSLMODE` — `require` si el server soporta SSL, si no `disable` (te pregunto cuál usar)

Estos secrets quedan disponibles como variables de entorno tanto en el sandbox (para exploración con `psql`) como luego en el server runtime cuando cableemos la app.

## Paso 2 — Verificar conectividad de red

Antes de autenticar, confirmo que el sandbox alcanza tu VPS:

- Ping/DNS al host
- Test de TCP al puerto (`nc -zv $PGHOST $PGPORT`)

Si esto falla, el problema es firewall/IP allowlist en el VPS, no la app. **Importante:** vas a necesitar permitir las IPs salientes del sandbox de Lovable y, más adelante, las de Cloudflare Workers. Lo confirmamos cuando lleguemos ahí.

## Paso 3 — Probar conexión y autenticación

```bash
psql -c "SELECT version(), current_database(), current_user, now();"
```

Esto valida credenciales, SSL y permisos básicos en una sola consulta.

## Paso 4 — Explorar schema (read-only)

Una serie de queries informativas para mapear la base:

- Lista de schemas: `SELECT schema_name FROM information_schema.schemata`
- Tablas y vistas por schema con conteo de columnas
- Tamaño aproximado de cada tabla (`pg_total_relation_size`)
- Conteo de filas (estimado vía `pg_class.reltuples` para no escanear)
- Para tablas clave: columnas, tipos, primary keys, foreign keys, índices

Te entrego un resumen del schema en chat + un archivo `/mnt/documents/schema-overview.md` que puedes descargar.

## Paso 5 — Queries de muestreo

Sobre 3-5 tablas que tú escojas (o que yo identifique como relevantes para Users / Queries / Payments del dashboard):

- `SELECT * ... LIMIT 5` para ver forma real de los datos
- Conteos por fecha para ver rango temporal disponible
- Identificar columnas candidatas a "user", "query/event", "payment", "created_at", "last_session"

Esto es lo que después usaremos para mapear data real al mockup.

## Lo que NO hace este plan

- No modifica ningún archivo del frontend ni del mockup.
- No crea server functions ni cablea el dashboard.
- No instala dependencias en el proyecto (solo usa `psql` ya disponible en el sandbox).

## Nota técnica para la siguiente fase (cuando cableemos la app)

El backend de la app corre en Cloudflare Workers, donde el driver clásico `pg` (TCP) no funciona. Las opciones reales serán:

1. **Postgres HTTP proxy** (ej. Supabase Data API, PostgREST, Neon serverless driver, `@prisma/driver-adapter-pg-worker`) — recomendado.
2. **Hyperdrive de Cloudflare** con driver compatible — requiere setup adicional.
3. **Migrar a Lovable Cloud / Supabase** y replicar/sincronizar datos — solo si tiene sentido.

No decidimos esto ahora; primero validamos que la DB tenga lo que necesitamos.

## Siguiente acción

Si apruebas el plan, te abro el formulario para meter los 6 secrets (incluido `PGSSLMODE`) y arranco con los pasos 2-5 de corrido.
