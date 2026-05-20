import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_USERS } from "@/lib/mock-users";

const fmtNumber = new Intl.NumberFormat("en-US");

export function TopUsersCard() {
  const rows = [...MOCK_USERS].sort((a, b) => b.queries - a.queries).slice(0, 5);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Top users</h2>
          <p className="text-xs text-muted-foreground">Most active users in the selected range</p>
        </div>
        <Link
          to="/dashboard/users"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all →
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="text-right">Queries</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
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
                    aria-label={`View ${u.name} details`}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  <span className="truncate" title={u.name}>{u.name}</span>
                </div>
              </TableCell>
              <TableCell
                className="hidden max-w-[220px] truncate text-muted-foreground md:table-cell"
                title={u.email}
              >
                {u.email}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtNumber.format(u.queries)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtNumber.format(u.tokens)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
