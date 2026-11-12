import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RetentionResponse } from "@/lib/tracking.functions";

type UserRow = RetentionResponse["userCohort"]["users"][number];

type SortKey = { type: "user" } | { type: "total" } | { type: "month"; index: number };

const PAGE_SIZE = 50;

/** Cell colors per spec; months before the user's signup stay blank. */
function cellStyle(count: number, beforeSignup: boolean): React.CSSProperties {
  if (beforeSignup) return {};
  if (count === 0) return { backgroundColor: "#FBE3E3", color: "#9B1C1C" };
  if (count === 1) return { backgroundColor: "#E3F6E5", color: "#1E5E2A" };
  if (count <= 3) return { backgroundColor: "#A8DDB0", color: "#134A1F" };
  return { backgroundColor: "#3FA457", color: "#FFFFFF" };
}

const LEGEND = [
  { label: "0 consultas", style: cellStyle(0, false) },
  { label: "1 consulta", style: cellStyle(1, false) },
  { label: "2 a 3", style: cellStyle(2, false) },
  { label: "Más de 3", style: cellStyle(4, false) },
];

export function UserCohortTable({
  months,
  users,
  monthTotals,
  grandTotal,
}: RetentionResponse["userCohort"]) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>({ type: "total" });
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const toggleSort = (key: SortKey) => {
    const same =
      (key.type === "month" && sortKey.type === "month" && key.index === sortKey.index) ||
      (key.type !== "month" && sortKey.type === key.type);
    if (same) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? users.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            (u.name ?? "").toLowerCase().includes(q),
        )
      : users;

    const value = (u: UserRow): number | string => {
      if (sortKey.type === "user") return u.email.toLowerCase();
      if (sortKey.type === "total") return u.total;
      return u.counts[sortKey.index] ?? 0;
    };

    return [...base].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp =
        typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [users, search, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const sortIcon = (key: SortKey) => {
    const active =
      (key.type === "month" && sortKey.type === "month" && key.index === sortKey.index) ||
      (key.type !== "month" && sortKey.type === key.type);
    if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
  };

  const thClass =
    "sticky top-0 z-10 bg-background px-2 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap border-b";

  if (months.length === 0) {
    return (
      <Card className="flex h-[140px] items-center justify-center p-5 text-sm text-muted-foreground">
        Sin datos para los filtros seleccionados.
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Cohorte por usuario</h2>
          <p className="text-xs text-muted-foreground">
            Consultas de cada usuario por mes (hora de Bogotá).
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por correo o nombre"
            className="h-8 w-64 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium">Leyenda:</span>
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border" style={l.style} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border bg-background" />
          Antes del registro
        </span>
      </div>

      <div className="relative max-h-[560px] overflow-auto rounded-md border">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className={`${thClass} left-0 z-20 min-w-[220px] text-left`}>
                <button
                  type="button"
                  className="flex items-center gap-1"
                  onClick={() => toggleSort({ type: "user" })}
                >
                  Usuario {sortIcon({ type: "user" })}
                </button>
              </th>
              {months.map((m, i) => (
                <th key={m.key} className={thClass}>
                  <button
                    type="button"
                    className="mx-auto flex items-center gap-1"
                    onClick={() => toggleSort({ type: "month", index: i })}
                  >
                    {m.label} {sortIcon({ type: "month", index: i })}
                  </button>
                </th>
              ))}
              <th className={`${thClass} right-0 z-20 min-w-[72px]`}>
                <button
                  type="button"
                  className="mx-auto flex items-center gap-1"
                  onClick={() => toggleSort({ type: "total" })}
                >
                  Total {sortIcon({ type: "total" })}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((u) => (
              <tr key={u.id}>
                <td className="sticky left-0 z-10 min-w-[220px] border-b bg-background px-2 py-1.5">
                  <p className="truncate font-medium">{u.email}</p>
                  {u.name && u.name !== u.email && (
                    <p className="truncate text-[11px] text-muted-foreground">{u.name}</p>
                  )}
                </td>
                {months.map((m, i) => {
                  const before = m.key < u.createdMonth;
                  const count = u.counts[i];
                  return (
                    <td
                      key={m.key}
                      className="border-b px-2 py-1.5 text-center tabular-nums"
                      style={cellStyle(count, before)}
                    >
                      {before ? "" : count}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 border-b bg-background px-2 py-1.5 text-center font-semibold tabular-nums">
                  {u.total}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={months.length + 2}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Ningún usuario coincide con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="sticky left-0 z-10 border-t bg-muted/50 px-2 py-1.5 font-semibold">
                Totales
              </td>
              {monthTotals.map((t, i) => (
                <td
                  key={months[i].key}
                  className="border-t bg-muted/50 px-2 py-1.5 text-center font-semibold tabular-nums"
                >
                  {t}
                </td>
              ))}
              <td className="sticky right-0 z-10 border-t bg-muted/50 px-2 py-1.5 text-center font-semibold tabular-nums">
                {grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filtered.length} usuarios · Página {safePage + 1} de {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
