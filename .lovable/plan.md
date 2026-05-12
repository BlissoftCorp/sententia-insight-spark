# Sententia Analytics Dashboard – Plan

Build a mocked analytics dashboard for sententia.app with brand identity from the uploaded logo (deep navy `#000a2e` + violet/blue gradient `#a5b4ff → #6366f1`).

## 1. Brand & design system

- Copy `Logo_Png.png` and `Full_Logo.jpg` to `src/assets/`.
- Update `src/styles.css`:
  - Light + dark tokens tuned to Sententia: navy background option, primary violet/indigo, gradient token `--gradient-brand`.
  - Keep oklch format, semantic tokens only.
- Set page `<head>` title/description to "Sententia – Analytics".

## 2. Routing structure (TanStack Start)

Create a layout route + child routes under a shared sidebar shell:

```
src/routes/
  __root.tsx                  (existing, unchanged except meta)
  index.tsx                   → redirect to /summary
  dashboard.tsx               (layout: Sidebar + <Outlet/>)
  dashboard.summary.tsx       → /dashboard/summary
  dashboard.users.tsx         → /dashboard/users  (placeholder "Coming soon")
  dashboard.payments.tsx      → /dashboard/payments (placeholder "Coming soon")
```

Logout is a sidebar button (mock: just navigates to `/`, toast "Logged out").

## 3. Sidebar

`src/components/app-sidebar.tsx` using shadcn `Sidebar` (`collapsible="icon"`):
- Header: Sententia logo + wordmark.
- Items: Summary (LayoutDashboard), Users (Users), Payments (CreditCard).
- Footer: Logout (LogOut icon) as a `SidebarMenuButton`.
- Active state via `useRouterState`.
- `SidebarTrigger` in top header bar inside `dashboard.tsx`.

## 4. Summary page

`src/routes/dashboard.summary.tsx` composed of small components in `src/components/dashboard/`:

### a) Date range filter (`DateRangeFilter.tsx`)
Segmented control / `Tabs`-style buttons:
- Today, Yesterday, Last 7 days, This month, Last month, Custom.
- Custom opens a `Popover` with shadcn `Calendar` (range mode).
- State stored in URL search params via `validateSearch` (`range` + optional `from`/`to`) so refresh keeps view.

### b) KPI cards (`KpiCard.tsx` × 4)
Grid of 4 cards: New users, Login users, Queries, Payments.
- Big number, label, delta vs. previous period (e.g. `+12.4%`), small sparkline.
- Icon per card with brand gradient background.

### c) Trend chart (`TrendChart.tsx`)
Uses shadcn `Chart` (Recharts) – a single combined line chart for the **last 7 days** showing 3 series:
- New users, Queries, Payments (each its own colored line).
- Legend, tooltip, X axis = day labels (Mon, Tue …), responsive.
- Title "Last 7 days overview".

(The 7-day chart is fixed to last 7 days as specified, regardless of the top filter.)

## 5. Mock data

`src/lib/mock-analytics.ts`:
- `getKpis(range)` → returns `{ newUsers, loginUsers, queries, payments, deltas }` with hand-tuned numbers per range key.
- `getLast7Days()` → array of `{ date, newUsers, queries, payments }` with believable up/down variation.
- Custom range falls back to a deterministic seeded random based on date span so numbers feel stable.

## 6. Technical details

- Strict TypeScript; all new files typed.
- Only semantic Tailwind tokens (`bg-card`, `text-muted-foreground`, `bg-primary`, new `bg-gradient-brand` utility via arbitrary `bg-[image:var(--gradient-brand)]` or a small CSS class).
- No backend yet – everything client-side mock.
- SEO: per-route `head()` (title/description/canonical) on summary/users/payments.
- Accessibility: each KPI card uses semantic `<article>` + `aria-label`; chart has `role="img"` with summary.

## 7. Out of scope (future)

- Real auth + Supabase wiring for Logout and live data.
- Users + Payments page contents (only stub now).
- Export / drill-down.
