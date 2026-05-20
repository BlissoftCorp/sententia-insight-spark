## Cambios al Summary

### 1. Reemplazar KPI "Login users" → "Active users"

Como no existe tabla de sesiones/logins, lo cambiamos por **Active users**: usuarios distintos que enviaron al menos 1 query (`messages.role='user'`) dentro del rango seleccionado.

- Etiqueta: **Active users**
- Icono: `Activity` (lucide-react), reemplaza al `LogIn`
- Fuente real: `SELECT COUNT(DISTINCT user_id) FROM messages WHERE role='user' AND created_at BETWEEN :from AND :to`
- En mock: por ahora reusar el valor existente con la nueva etiqueta hasta cablear datos reales.

### 2. Nuevo widget "Top users"

Tarjeta nueva debajo del `TrendChart`, mostrando los usuarios más activos del rango seleccionado.

- Título: **Top users**
- Columnas: Name · Email · Queries · Tokens
- Top 5, ordenado por queries desc
- Cada fila enlaza a `/dashboard/users/$userId` (mismo patrón que la página Users)
- Estado loading: skeleton consistente con el resto
- Footer con link "View all users" → `/dashboard/users`

Fuente real futura:
```sql
SELECT user_id, COUNT(*) AS queries, SUM((usage->>'total_tokens')::int) AS tokens
FROM messages
WHERE role='user' AND created_at BETWEEN :from AND :to
GROUP BY user_id ORDER BY queries DESC LIMIT 5
```

Por ahora se alimenta de `MOCK_USERS` (ya existente en `src/lib/mock-users.ts`) ordenado por `queries`.

### Archivos a tocar

- `src/lib/mock-analytics.ts` — renombrar `loginUsers` → `activeUsers` en el tipo `Kpis` y en `TABLE`/`getKpis`.
- `src/routes/dashboard.summary.tsx` — cambiar el `KpiCard` (label + icono + key) y añadir el nuevo bloque Top users.
- `src/components/dashboard/TopUsersCard.tsx` (nuevo) — componente de la tabla compacta.

### Fuera de alcance (por ahora)

- Cablear datos reales contra Postgres — se hará en el siguiente paso cuando definamos el server function/loader.
- KPI "Payments" sigue como mock hasta que el dev cree la tabla.
