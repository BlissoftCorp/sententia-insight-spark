
## Objetivo

Eliminar el error `column u.name does not exist` reemplazando todas las referencias a `u.name` en las queries por un nombre calculado a partir de `first_name`, `last_name` y `email`.

## Cambios

### `src/lib/analytics.functions.ts`

Reemplazar en las 4 queries (`getSummary` topUsers, `getUsersList`, `getUserDetail` userRow) las referencias a `u.name` por:

```sql
COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email) AS name
```

Y eliminar `u.name` de los `GROUP BY` correspondientes (en `getSummary` el `GROUP BY u.id, u.name, u.email` queda como `GROUP BY u.id, u.email, u.first_name, u.last_name`).

Los tipos genéricos `sql<{ ... name: string | null ... }[]>` se mantienen igual (el alias `name` sigue existiendo en el resultado), así que **no hay cambios en los tipos exportados** (`SummaryResponse.topUsers`, `UsersListResponse.users`, `UserDetailResponse.user`).

### Frontend

**Sin cambios.** `TopUsersCard.tsx` y `dashboard.users.tsx` ya manejan `name: string | null` con fallback a `email`, y `dashboard.users_.$userId.tsx` consume el mismo shape.

## Validación

1. Build pasa (sin cambios de tipos públicos).
2. Tras `git pull && bun install && bun run build` en el VPS y `systemctl restart dashboard`:
   - `curl http://127.0.0.1:3001/dashboard/summary?range=today` → 200 con datos.
   - `journalctl -u dashboard -n 50` sin `PostgresError`.
3. UI muestra el nombre completo del usuario cuando existe `first_name`/`last_name`, y el local-part del email cuando no.

## Fuera de alcance

- No se añade columna `name` a la DB.
- No se tocan tipos de respuesta ni componentes UI.
- No se modifican otras queries (payments sigue N/A).
