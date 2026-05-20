import { Suspense, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronRight, Loader2, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataErrorBanner } from "@/components/dashboard/DataErrorBanner";
import { getUsersList } from "@/lib/analytics.functions";

const usersQuery = queryOptions({
  queryKey: ["users-list"],
  queryFn: () => getUsersList(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/dashboard/users")({
  loader: ({ context }) => context.queryClient.ensureQueryData(usersQuery),
  head: () => ({
    meta: [
      { title: "Users — Sententia Analytics" },
      { name: "description", content: "User analytics for Sententia." },
    ],
  }),
  component: UsersPage,
});

const fmtNumber = new Intl.NumberFormat("en-US");

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "d/M/yyyy HH:mm:ss");
}

function UsersPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <Suspense fallback={<UsersSkeleton />}>
        <UsersContent />
      </Suspense>
    </div>
  );
}

function UsersContent() {
  const { data } = useSuspenseQuery(usersQuery);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        (u.name?.toLowerCase().includes(q) ?? false) ||
        u.email.toLowerCase().includes(q),
    );
  }, [query, data.users]);

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {fmtNumber.format(rows.length)} of {fmtNumber.format(data.users.length)} users
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user..."
            className="pl-9"
            aria-label="Search users"
          />
        </div>
      </div>

      {data.error && <DataErrorBanner message={data.error} />}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Queries</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead>Last Session</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="max-w-[180px] font-medium">
                  <div className="flex items-center gap-2.5">
                    <Link
                      to="/dashboard/users/$userId"
                      params={{ userId: u.id }}
                      aria-label={`View ${u.name ?? u.email} details`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <span className="truncate" title={u.name ?? u.email}>
                      {u.name ?? u.email.split("@")[0]}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground" title={u.email}>
                  {u.email}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtNumber.format(u.queries)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtNumber.format(u.tokens)}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatDateTime(u.lastSession)}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap tabular-nums text-muted-foreground lg:table-cell">
                  {formatDateTime(u.createdAt)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {query ? `No users match "${query}"` : "No users found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function UsersSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-40" />
      <Card className="flex h-[300px] items-center justify-center p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading users…
        </div>
      </Card>
    </>
  );
}
