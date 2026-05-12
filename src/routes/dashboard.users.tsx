import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_USERS } from "@/lib/mock-users";

export const Route = createFileRoute("/dashboard/users")({
  head: () => ({
    meta: [
      { title: "Users — Sententia Analytics" },
      { name: "description", content: "User analytics for Sententia." },
    ],
  }),
  component: UsersPage,
});

const fmtNumber = new Intl.NumberFormat("en-US");

function formatDateTime(iso: string) {
  return format(new Date(iso), "d/M/yyyy HH:mm:ss");
}

function UsersPage() {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_USERS;
    return MOCK_USERS.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {fmtNumber.format(rows.length)} of {fmtNumber.format(MOCK_USERS.length)} users
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

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Queries</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead>Last Session</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNumber.format(u.queries)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNumber.format(u.tokens)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatDateTime(u.lastSession)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatDateTime(u.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No users match "{query}"
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
