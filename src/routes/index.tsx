import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Sententia Insights Dashboard" },
    { name: "description", content: "Analytics dashboard for Sententia." },
    { property: "og:title", content: "Sententia Insights Dashboard" },
    { property: "og:description", content: "Analytics dashboard for Sententia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/summary" });
  },
});
