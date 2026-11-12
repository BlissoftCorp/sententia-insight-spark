import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Sententia Analytics" },
      { name: "description", content: "Payment analytics for Sententia." },
      { property: "og:title", content: "Payments — Sententia Analytics" },
      { property: "og:description", content: "Payment analytics for Sententia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
      <p className="mt-1 text-sm text-muted-foreground">Detailed payment analytics.</p>
      <Card className="mt-6 p-10 text-center text-muted-foreground">Coming soon</Card>
    </div>
  );
}
