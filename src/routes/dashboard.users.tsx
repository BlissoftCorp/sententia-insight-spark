import { Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronDown,
  Loader2,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { getUsersList, getUserActivity } from "@/lib/analytics.functions";
import { cn } from "@/lib/utils";

const usersQuery = queryOptions({
  queryKey: ["users-list"],
  queryFn: () => getUsersList(),
  staleTime: 30_000,
});

const userActivityQuery = (userId: string) =>
  queryOptions({
    queryKey: ["user-activity", userId],
    queryFn: () => getUserActivity({ data: { userId } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/dashboard/users")({
  loader: ({ context }) => context.queryClient.ensureQueryData(usersQuery),
  head: () => ({
    meta: [
      { title: "Users — Sententia Analytics" },
      { name: "description", content: "User activity and churn analysis." },
    ],
  }),
  component: UsersPage,
});

const fmtNumber = new Intl.NumberFormat("en-US");

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "d/M/yyyy HH:mm");
}

type SortKey =
  | "conversations"
  | "queries"
  | "firstQuery"
  | "lastSession"
  | "daysSinceLast"
  | "createdAt";
type SortDir = "asc" | "desc";

function UsersPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <Suspense fallback={<UsersSkeleton />}>
        <UsersContent />
      </Suspense>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onToggle,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey | null;
  dir: SortDir;
  onToggle: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = current === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
        active && "text-foreground",
        align === "right" && "ml-auto flex-row-reverse",
      )}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      <Icon className={cn("h-3.5 w-3.5", !active && "opacity-50")} />
    </button>
  );
}

function UsersContent() {
  const { data } = useSuspenseQuery(usersQuery);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>("lastSession");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      if (sortDir === "desc") setSortDir("asc");
      else setSortKey(null);
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = !q
      ? data.users
      : data.users.filter(
          (u) =>
            (u.name?.toLowerCase().includes(q) ?? false) ||
            u.email.toLowerCase().includes(q),
        );

    if (sortKey) {
      const dirMul = sortDir === "asc" ? 1 : -1;
      const accessor = (u: (typeof data.users)[number]) => {
        switch (sortKey) {
          case "conversations": return u.conversationsCount;
          case "queries": return u.queries;
          case "firstQuery": return u.firstQueryAt ? new Date(u.firstQueryAt).getTime() : null;
          case "lastSession": return u.lastSession ? new Date(u.lastSession).getTime() : null;
          case "daysSinceLast": return u.daysSinceLastQuery;
          case "createdAt": return new Date(u.createdAt).getTime();
        }
      };
      list = [...list].sort((a, b) => {
        const av = accessor(a);
        const bv = accessor(b);
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return ((av as number) - (bv as number)) * dirMul;
      });
    }
    return list;
  }, [query, data.users, sortKey, sortDir]);

  const sortProps = { current: sortKey, dir: sortDir, onToggle: toggleSort };

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {fmtNumber.format(rows.length)} of {fmtNumber.format(data.users.length)} users · click a row to view activity
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
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
              <TableHead className="w-8" />
              <TableHead className="text-xs font-medium text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Email</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Role</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="text-right">
                <SortHeader label="Convs" sortKey="conversations" align="right" {...sortProps} />
              </TableHead>
              <TableHead className="text-right">
                <SortHeader label="Queries" sortKey="queries" align="right" {...sortProps} />
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                <SortHeader label="First query" sortKey="firstQuery" {...sortProps} />
              </TableHead>
              <TableHead>
                <SortHeader label="Last query" sortKey="lastSession" {...sortProps} />
              </TableHead>
              <TableHead className="text-right">
                <SortHeader label="Days idle" sortKey="daysSinceLast" align="right" {...sortProps} />
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <SortHeader label="Created" sortKey="createdAt" {...sortProps} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => {
              const isOpen = expanded === u.id;
              return (
                <UserRowGroup
                  key={u.id}
                  user={u}
                  isOpen={isOpen}
                  onToggle={() => setExpanded(isOpen ? null : u.id)}
                />
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
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

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  isActive: boolean;
  emailVerified: boolean;
  queries: number;
  conversationsCount: number;
  firstQueryAt: string | null;
  lastSession: string | null;
  daysSinceLastQuery: number | null;
  createdAt: string;
};

function UserRowGroup({
  user,
  isOpen,
  onToggle,
}: {
  user: UserRow;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        className={cn("cursor-pointer transition-colors", isOpen && "bg-muted/40")}
        onClick={onToggle}
      >
        <TableCell className="w-8 pr-0">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </TableCell>
        <TableCell className="max-w-[180px] font-medium">
          <span className="truncate" title={user.name ?? user.email}>
            {user.name ?? user.email.split("@")[0]}
          </span>
        </TableCell>
        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={user.email}>
          {user.email}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {user.role ? <Badge variant="secondary">{user.role}</Badge> : "—"}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            {user.isActive ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-label="Active" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-muted-foreground" aria-label="Inactive" />
            )}
            {user.emailVerified ? (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">verified</Badge>
            ) : (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground">unverified</Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums">{fmtNumber.format(user.conversationsCount)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtNumber.format(user.queries)}</TableCell>
        <TableCell className="hidden whitespace-nowrap tabular-nums text-muted-foreground xl:table-cell">
          {formatDateTime(user.firstQueryAt)}
        </TableCell>
        <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatDateTime(user.lastSession)}
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">
          {user.daysSinceLastQuery === null ? "—" : `${user.daysSinceLastQuery}d`}
        </TableCell>
        <TableCell className="hidden whitespace-nowrap tabular-nums text-muted-foreground lg:table-cell">
          {formatDateTime(user.createdAt)}
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={11} className="p-0">
            <UserActivityPanel userId={user.id} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function UserActivityPanel({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery(userActivityQuery(userId));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-6 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6 text-sm text-destructive">
        Failed to load activity: {(error as Error).message}
      </div>
    );
  }

  if (data?.error) {
    return <div className="px-6 py-6"><DataErrorBanner message={data.error} /></div>;
  }

  const conversations = data?.conversations ?? [];

  if (conversations.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-muted-foreground">
        This user has no activity yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      {conversations.map((conv) => (
        <div key={conv.id} className="rounded-lg border border-border bg-background p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">
                {conv.title || "Untitled conversation"}
              </h3>
              {conv.archived && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">archived</Badge>
              )}
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatDateTime(conv.createdAt)} · {conv.pairs.length} queries
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {conv.pairs.map((p) => (
              <div key={p.userMessageId} className="flex flex-col gap-2">
                <div className="rounded-md border border-border/60 bg-muted/40 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <MessageSquare className="h-3 w-3" /> Query
                    </div>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {formatDateTime(p.queryCreatedAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{p.query}</p>
                </div>
                {p.response ? (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Sparkles className="h-3 w-3" /> Sententia
                        </div>
                        {p.confidence && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            conf: {p.confidence}
                          </Badge>
                        )}
                        {p.usage?.total_tokens != null && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            {fmtNumber.format(p.usage.total_tokens)} tokens
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {formatDateTime(p.responseCreatedAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">{p.response}</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border p-3 text-xs italic text-muted-foreground">
                    No assistant response recorded.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
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
