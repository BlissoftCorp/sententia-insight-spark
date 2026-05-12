import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/users")({
  head: () => ({
    meta: [
      { title: "Users — Sententia Analytics" },
      { name: "description", content: "User analytics for Sententia." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">Detailed user analytics.</p>
      <Card className="mt-6 p-10 text-center text-muted-foreground">Coming soon</Card>
    </div>
  );
}
